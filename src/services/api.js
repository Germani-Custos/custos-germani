// @ts-check
/* Responsabilidade: camada única de acesso ao Supabase (Auth + leitura + escrita). */
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

import { appConfig, debugLog } from '../config/app-config.js';
import { classificarCustos } from '../../core/custos-classification-engine.js';
import { normalizeCodigoProduto } from '../../core/spreadsheet-engine.js';
import { assertOpCustoIds, getOpCustoPeriod, inspectOpCustoContext } from '../../core/op-custo-engine.js';
import { buildOpInvestigationQueue } from '../../core/op-investigation-engine.js';
import { toInvestigationResult } from '../../core/investigation-contract.js';
import { buildReportRows, classifyAlert } from '../../core/report-engine.js';
import { buildManualProductMasterPayload, buildProductMasterPayload, createProductMasterIndex, reconcileProductMasterImport, resolveProductClassification } from '../../core/product-master-engine.js';
import { lerContextoCadastroMestrePreview } from './cadastro-mestre-preview.js';
import { consultarDisponibilidadeReconstrucao, consultarLoteReconstrucao, executarReconstrucaoPelaAplicacao, verificarAmbienteReconstrucao } from './cadastro-mestre-execution.js';

/**
 * @typedef {import('../../core/report-engine.js').Masters} Masters
 * @typedef {import('../../core/report-engine.js').HistoricoRow} HistoricoRow
 * @typedef {import('../../core/report-engine.js').ReportRow} ReportRow
 */

const TABLES = {
  historico: 'historico_custos',
  logImportacao: 'log_importacao',
  dicionario: 'dicionario_produtos',
  masterErp: 'dicionario_master_produtos',
  origem: 'categorias_origem',
  familia: 'categorias_familia',
  agrupamento: 'categorias_agrupamento',
  apontamentosOp: 'apontamentos_op',
  logImportacaoOp: 'log_importacao_op'
};

const supabase = createClient(appConfig.supabase.url, appConfig.supabase.anonKey);

// MNT-07: tamanho de lote no upsert de historico_custos durante a importação.
// 400 é um valor operacional (não uma regra de negócio): equilibra número de
// round-trips ao Postgrest contra o tamanho de payload por requisição. Pode
// subir com segurança se a importação ficar lenta em bases maiores.
const IMPORT_CHUNK_SIZE = 400;

// Páginas abaixo do teto PostgREST; não limitam o total lido.
const PRODUCT_MASTER_PAGE_SIZE = 500;

// Mesma ordem temporal da consulta analítica, com PK como desempate entre páginas.
const HISTORICO_PAGE_ORDER = ['data_referencia', 'id'];
let opCustoReadSequence = 0;

function resolveMasterId(row) {
  return row?.id ?? row?.codigo ?? row?.cod ?? row?.uuid ?? row?.value ?? null;
}

function resolveMasterLabel(row) {
  return row?.descricao ?? row?.nome ?? row?.label ?? row?.titulo ?? null;
}

function isNullLike(value) {
  if (value === null || value === undefined) return true;
  const normalized = String(value).trim().toLowerCase();
  return !normalized || normalized === 'null' || normalized === 'undefined';
}

function normalizeMasterRows(rows = []) {
  return rows
    .map(row => {
      const id = resolveMasterId(row);
      const descricao = resolveMasterLabel(row);
      if (isNullLike(id) || isNullLike(descricao)) return null;
      return { ...row, id, descricao };
    })
    .filter(Boolean);
}

function applyCascadeFilterInMemory(rows, filters) {
  return (rows || []).filter(item => {
    if (filters.origem !== 'TODAS' && String(item?.origem_id) !== String(filters.origem)) return false;
    if (filters.familia !== 'TODAS' && String(item?.familia_id) !== String(filters.familia)) return false;
    if (filters.agrupamento !== 'TODOS' && String(item?.agrupamento_cod) !== String(filters.agrupamento)) return false;
    if (filters.item !== 'TODOS' && normalizeCodigoProduto(item.codigo_produto) !== normalizeCodigoProduto(filters.item)) return false;
    return true;
  });
}

function normalizeCascadeFilters(filters = {}) {
  return {
    origem: filters?.origem || 'TODAS',
    familia: filters?.familia || 'TODAS',
    agrupamento: filters?.agrupamento || 'TODOS',
    item: filters?.item || 'TODOS'
  };
}

/**
 * @typedef {Error & {details?: Record<string, unknown>}} ApiError
 */

/**
 * @param {string} message
 * @param {Record<string, unknown>} [details]
 * @returns {ApiError}
 */
function createApiError(message, details = {}) {
  /** @type {ApiError} */
  const error = new Error(message);
  error.name = 'OperationalContractError';
  error.details = details;
  return error;
}

function ok(data) {
  return { data, error: null };
}

function fail(message, details = {}, upstreamError = null) {
  const error = createApiError(message, details);
  if (upstreamError) {
    error.cause = upstreamError;
    error.details = { ...details, cause: upstreamError.message || String(upstreamError) };
  }
  return { data: null, error };
}

/**
 * Leitura integral compartilhada com o Cadastro operacional. Recria a consulta
 * filtrada em cada página e só libera dados após conferir todas as contagens.
 * @param {string} table
 * @param {string} fields
 * @param {string|Array<string|{column:string, ascending:boolean}>} orderBy
 * @param {(query:any) => any} [configure]
 */
async function lerCompleto(table, fields, orderBy, configure = query => query) {
  const rows = [];
  let expected = null;
  try {
    for (let start = 0; ; start += PRODUCT_MASTER_PAGE_SIZE) {
      let query = configure(supabase.from(table).select(fields, { count: 'exact' }));
      for (const order of typeof orderBy === 'string' ? [orderBy] : orderBy) {
        query = typeof order === 'string'
          ? query.order(order, { ascending: true })
          : query.order(order.column, { ascending: order.ascending });
      }
      const { data, error, count } = await query.range(start, start + PRODUCT_MASTER_PAGE_SIZE - 1);
      if (error) throw error;
      if (!Array.isArray(data) || !Number.isSafeInteger(count) || count < 0 ||
          (expected !== null && expected !== count)) {
        throw createApiError('Contagem incompleta ou alterada durante a leitura paginada.', { tabela: table });
      }
      expected = count;
      if (data.length !== Math.min(PRODUCT_MASTER_PAGE_SIZE, count - start)) {
        throw createApiError('Leitura paginada incompleta.', { tabela: table });
      }
      rows.push(...data);
      if (rows.length === count) return ok(rows);
    }
  } catch (error) {
    return { data: null, error };
  }
}

async function lerDicionarioDosCodigos(codigos) {
  const rows = [];
  // Limita o tamanho de cada IN, nunca a quantidade total de códigos.
  for (let start = 0; start < codigos.length; start += PRODUCT_MASTER_PAGE_SIZE) {
    const chunk = codigos.slice(start, start + PRODUCT_MASTER_PAGE_SIZE);
    const result = await lerCompleto(TABLES.dicionario,
      'codigo_produto, descricao, origem_id, familia_id, agrupamento_cod', 'codigo_produto',
      query => query.in('codigo_produto', chunk));
    if (result.error) return result;
    rows.push(...result.data);
  }
  return ok(rows);
}

function isValidDateValue(value) {
  return Boolean(normalizeISODate(value));
}

function normalizeISODate(value) {
  if (!value) return null;

  let iso = null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    iso = value.toISOString().slice(0, 10);
  } else if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (isoDateRegex.test(trimmed)) {
      iso = trimmed;
    } else {
      const parsed = new Date(trimmed);
      if (Number.isNaN(parsed.getTime())) return null;
      iso = parsed.toISOString().slice(0, 10);
    }
  } else {
    return null;
  }

  // SEC-04: validar faixa de ano plausível para dados operacionais
  const year = parseInt(iso.slice(0, 4), 10);
  const month = parseInt(iso.slice(5, 7), 10);
  const day = parseInt(iso.slice(8, 10), 10);
  if (year < 2000 || year > 2100) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;

  return iso;
}

function roundTo4(value) {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

function normalizeMoneyValue(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return roundTo4(num);
}

function validateHistoricoRow(row = {}) {
  const erros = [];

  const codigoProdutoStr = normalizeCodigoProduto(row?.codigo_produto);
  if (!codigoProdutoStr) erros.push('codigo_produto inválido ou vazio');
  // SEC-04: limitar comprimento de campos de texto
  if (codigoProdutoStr && codigoProdutoStr.length > 64) erros.push('codigo_produto excede 64 caracteres');
  const descricaoStr = String(row?.descricao || '').trim();
  if (!descricaoStr) erros.push('descricao vazia');
  if (descricaoStr.length > 256) erros.push('descricao excede 256 caracteres');
  if (!String(row?.custo_total ?? '').trim()) erros.push('custo_total vazio');
  const custoVariavel = normalizeMoneyValue(row?.custo_variavel);
  const custoDiretoFixo = normalizeMoneyValue(row?.custo_direto_fixo);
  const custoTotal = normalizeMoneyValue(row?.custo_total);
  if (custoVariavel === null) erros.push('custo_variavel inválido');
  if (custoDiretoFixo === null) erros.push('custo_direto_fixo inválido');
  if (custoTotal === null) erros.push('custo_total inválido');
  if (!isValidDateValue(row?.data_referencia)) erros.push('data_referencia inválida');

  return { valido: erros.length === 0, erros };
}

function normalizeTemporalFilters(filters = {}) {
  const competencias = [...new Set((filters?.competencias || []).map(normalizeISODate).filter(Boolean))];
  return {
    start: normalizeISODate(filters?.start),
    end: normalizeISODate(filters?.end),
    competencias
  };
}

function applyTemporalFilterToQuery(query, filters = {}) {
  const { start, end, competencias } = normalizeTemporalFilters(filters);
  if (competencias.length) return query.in('data_referencia', competencias);
  if (start) query = query.gte('data_referencia', start);
  if (end) query = query.lte('data_referencia', end);
  return query;
}

/**
 * Quando o PostgreSQL informa uma violação NOT NULL, relaciona a coluna aos
 * registros do chunk que carregavam `null` ou `undefined` naquele campo.
 * O diagnóstico não altera o payload nem tenta reenviar o lote.
 *
 * @param {Record<string, unknown>[] } chunk
 * @param {number} offset Índice inicial do chunk na importação (base zero).
 * @param {{ message?: string, details?: string }|null} error
 * @returns {Array<{registro: number, campo: string, motivo: string}>}
 */
function findOpChunkValidationErrors(chunk, offset, error) {
  const errorText = [error?.message, error?.details].filter(Boolean).join(' ');
  const notNullColumn = /null value in column "([^"]+)"/i.exec(errorText)?.[1];
  if (!notNullColumn) return [];

  return chunk.flatMap((registro, index) => {
    if (registro?.[notNullColumn] !== null && registro?.[notNullColumn] !== undefined) return [];
    return [{
      registro: offset + index + 1,
      campo: notNullColumn,
      motivo: `valor nulo viola a constraint NOT NULL de ${notNullColumn}`
    }];
  });
}

/**
 * Registra um diagnóstico expandível para falhas de persistência da Auditoria
 * de OP. O primeiro payload é intencional: ele permite comparar rapidamente o
 * contrato enviado com o schema sem registrar o arquivo completo.
 *
 * @param {{ chunkAtual: number, chunk: Record<string, unknown>[], error: any, validationErrors: Array<{registro: number, campo: string, motivo: string}> }} params
 */
function logOpImportFailure({ chunkAtual, chunk, error, validationErrors }) {
  const respostaSupabase = {
    code: error?.code ?? null,
    message: error?.message ?? null,
    details: error?.details ?? null,
    hint: error?.hint ?? null
  };

  console.error(
    [
      '========== IMPORTAÇÃO OP ==========',
      `Chunk atual: ${chunkAtual}`,
      `Quantidade de registros: ${chunk.length}`,
      'Primeiro registro enviado: ver objeto de diagnóstico.',
      'Resposta completa do Supabase: ver objeto de diagnóstico.',
      `code: ${respostaSupabase.code ?? '-'}`,
      `message: ${respostaSupabase.message ?? '-'}`,
      `details: ${respostaSupabase.details ?? '-'}`,
      `hint: ${respostaSupabase.hint ?? '-'}`
    ].join('\n'),
    {
      primeiroRegistroEnviado: chunk[0] ?? null,
      respostaCompletaSupabase: error ?? null,
      ...respostaSupabase,
      errosValidacaoPorRegistro: validationErrors
    },
    '=================================='
  );
}

function mapHierarchyRows(dicionario = []) {
  return (dicionario || [])
    .filter(item => !isNullLike(item?.codigo_produto))
    .map(item => ({
      codigo_produto: normalizeCodigoProduto(item.codigo_produto),
      origem_id: item?.origem_id ?? null,
      familia_id: item?.familia_id ?? null,
      agrupamento_cod: item?.agrupamento_cod ?? null,
      descricao: item?.descricao || null
    }));
}

async function getHistoricoWithClientFallback(filters) {
  const { data: historicoBase, error: historicoError } = await lerCompleto(
    TABLES.historico, '*', HISTORICO_PAGE_ORDER, query => applyTemporalFilterToQuery(query, filters));

  if (historicoError) return fail('Falha ao consultar histórico por competência.', { metodo: 'getHistorico', tabela: TABLES.historico }, historicoError);
  if (!historicoBase?.length) return ok([]);

  const { data, error } = await enrichRowsWithClassificacaoCustos(historicoBase);
  if (error) return fail('Falha ao enriquecer histórico com classificação analítica.', { metodo: 'getHistorico' }, error);
  return ok(applyCascadeFilterInMemory(data, filters));
}

// Elegibilidade por competência antes da seleção de eventos. O banco ordena
// TIMESTAMPTZ com precisão integral; id só desempata a paginação, nunca snapshots.
async function lerContextoComparacao(filters, metodo) {
  const result = await lerCompleto(TABLES.historico, '*',
    [{ column: 'criado_em', ascending: false }, 'id'], query => applyTemporalFilterToQuery(query, filters));
  if (result.error) return fail('Falha ao ler custos pertinentes à comparação.', { metodo }, result.error);
  const ids = new Set();
  for (const row of result.data) {
    if (row.id === null || row.id === undefined || ids.has(String(row.id))) {
      return fail('Identidade ausente ou repetida na comparação.', { metodo });
    }
    ids.add(String(row.id));
  }
  const enriched = await enrichRowsWithClassificacaoCustos(result.data);
  if (enriched.error) return fail('Falha ao enriquecer comparação com dimensão.', { metodo }, enriched.error);
  const rows = applyCascadeFilterInMemory(enriched.data, normalizeCascadeFilters(filters));
  if (rows.some(row => row.custo_total === null || row.custo_total === undefined || !Number.isFinite(Number(row.custo_total)))) {
    return fail('Custo ausente ou inválido na comparação.', { metodo });
  }
  const eventos = [...new Set(rows.map(row => row.criado_em).filter(Boolean))];
  return ok({ rows, imports: eventos.slice(0, 2), totalEventosElegiveis: eventos.length,
    estadoComparacao: eventos.length >= 2 ? 'disponivel' : 'insuficiente',
    motivo: eventos.length >= 2 ? null : eventos.length ? 'apenas_um_evento' : 'sem_eventos_no_recorte' });
}

async function enrichRowsWithClassificacaoCustos(rows = []) {
  const codigos = [...new Set(rows.map(item => normalizeCodigoProduto(item?.codigo_produto)).filter(Boolean))];
  if (!codigos.length) return ok(rows);
  const results = await Promise.all([
    lerDicionarioDosCodigos(codigos),
    lerCompleto(TABLES.masterErp, 'codigo_produto, origem_cod, familia_cod', 'codigo_produto'),
    lerCompleto(TABLES.origem, '*', ['descricao', 'id']),
    lerCompleto(TABLES.familia, '*', ['descricao', 'id'])
  ]);
  const error = results.find(result => result.error)?.error;
  if (error) return { data: null, error };
  try {
    return ok(classificarCustos(rows, results[0].data, {
      produtos: results[1].data, origens: results[2].data, familias: results[3].data
    }));
  } catch (error) {
    return { data: null, error };
  }
}

function createDiagnosticoSemAgrupamentoUnavailable(upstreamError, etapa) {
  const error = createApiError('Não foi possível validar produtos sem agrupamento.', {
    metodo: 'runDiagnosticoSemAgrupamento',
    etapa,
    tabela: etapa === 'agrupamentos' ? TABLES.agrupamento : null
  });
  if (upstreamError) {
    error.cause = upstreamError;
    error.details = { ...error.details, code: upstreamError.code || null, cause: upstreamError.message || String(upstreamError) };
  }
  debugLog('Diagnóstico de agrupamento indisponível.', error.details);
  return { status: 'indisponivel', rows: [], error };
}

function createDiagnosticoSemAgrupamentoOk(rows = []) {
  return { status: 'ok', rows, error: null };
}

async function runDiagnosticoSemAgrupamento() {
  const [{ data: historicoRows, error: historicoError }, { data: dicionarioRows, error: dicionarioError }, { data: agrupamentoRows, error: agrupamentoError }] = await Promise.all([
    lerCompleto(TABLES.historico, 'codigo_produto', ['codigo_produto', 'id']),
    lerCompleto(TABLES.dicionario, 'codigo_produto, agrupamento_cod', 'codigo_produto'),
    // Selecionar '*' evita acoplar o diagnóstico a uma variante específica do schema
    // (`codigo`, `id` ou `cod`) e impede que o erro 42703 seja mascarado como “zero órfãos”.
    lerCompleto(TABLES.agrupamento, '*', 'id')
  ]);

  if (historicoError) return createDiagnosticoSemAgrupamentoUnavailable(historicoError, 'historico');
  if (dicionarioError) return createDiagnosticoSemAgrupamentoUnavailable(dicionarioError, 'dicionario');
  if (agrupamentoError) return createDiagnosticoSemAgrupamentoUnavailable(agrupamentoError, 'agrupamentos');

  const codigosComHistorico = new Set((historicoRows || [])
    .map(item => normalizeCodigoProduto(item?.codigo_produto))
    .filter(Boolean));
  const agrupamentosValidos = new Set((agrupamentoRows || [])
    .map(item => String(resolveMasterId(item) || '').trim())
    .filter(Boolean));

  const rows = (dicionarioRows || [])
    .filter(item => codigosComHistorico.has(normalizeCodigoProduto(item?.codigo_produto)))
    .filter(item => {
      const agrupamentoCod = String(item?.agrupamento_cod || '').trim();
      return !agrupamentoCod || !agrupamentosValidos.has(agrupamentoCod);
    })
    .map(item => ({ codigo_produto: item.codigo_produto }))
    .sort((a, b) => String(a.codigo_produto).localeCompare(String(b.codigo_produto)));

  return createDiagnosticoSemAgrupamentoOk(rows);
}

async function garantirProdutosNoDicionarioEmLote(produtos = []) {
  const unicos = new Map();
  (produtos || []).forEach(item => {
    const codigo = normalizeCodigoProduto(item?.codigo_produto);
    if (!codigo) return;
    if (!unicos.has(codigo)) {
      unicos.set(codigo, {
        codigo_produto: codigo,
        descricao: String(item?.descricao || '').trim() || null,
        origem_id: null,
        familia_id: null,
        agrupamento_cod: null
      });
    }
  });

  const codigos = [...unicos.keys()];
  if (!codigos.length) return { ok: true, inseridos: 0, erros: [] };

  const { data: existentes, error: erroExistentes } = await supabase
    .from(TABLES.dicionario)
    .select('codigo_produto')
    .in('codigo_produto', codigos);

  if (erroExistentes) {
    return { ok: false, inseridos: 0, erros: [{ tipo: 'dicionario_busca', mensagem: erroExistentes.message }] };
  }

  const existentesSet = new Set((existentes || []).map(row => normalizeCodigoProduto(row?.codigo_produto)));
  const pendentes = codigos.filter(codigo => !existentesSet.has(codigo)).map(codigo => unicos.get(codigo));
  if (!pendentes.length) return { ok: true, inseridos: 0, erros: [] };

  const { error: erroInsert } = await supabase
    .from(TABLES.dicionario)
    .upsert(pendentes, { onConflict: 'codigo_produto' });

  if (erroInsert) {
    return { ok: false, inseridos: 0, erros: [{ tipo: 'dicionario_upsert', mensagem: erroInsert.message }] };
  }

  return { ok: true, inseridos: pendentes.length, erros: [] };
}

export const api = {
  /**
   * Carrega as dimensões (masters) usadas pela cascata de filtros e pelo relatório.
   * Só monta a hierarquia depois de carregar integralmente fatos e dimensões.
   * @returns {Promise<Masters & {diagnostico_sem_mapa: {status: string, rows: Array<unknown>, error: unknown}, error: unknown}>}
   */
  async getMasters() {
    // Aguarda as fontes independentes, mas não libera hierarquia parcial.
    const settled = await Promise.allSettled([
      lerCompleto(TABLES.historico, 'codigo_produto, descricao', ['codigo_produto', 'id']),
      lerCompleto(TABLES.origem, '*', ['descricao', 'id']),
      lerCompleto(TABLES.familia, '*', ['descricao', 'id']),
      lerCompleto(TABLES.agrupamento, '*', ['descricao', 'id']),
      lerCompleto(TABLES.dicionario, 'codigo_produto, descricao, origem_id, familia_id, agrupamento_cod', 'codigo_produto'),
      lerCompleto(TABLES.masterErp, 'codigo_produto, origem_cod, familia_cod', 'codigo_produto')
    ]);

    const resolve = (result) => result.status === 'fulfilled' ? result.value : { data: null, error: result.reason };
    const [
      { data: historicoRows, error: historicoError },
      { data: origensRaw,   error: origensError },
      { data: familiasRaw,  error: familiasError },
      { data: agrupamentosRaw, error: agrupamentosError },
      { data: dicionarioRaw, error: dicionarioError },
      { data: masterErpRows, error: masterErpError }
    ] = settled.map(resolve);

    // Hierarquia exige todas as fontes completas; erro nunca vira dimensão vazia.
    const error = historicoError || origensError || familiasError || agrupamentosError || dicionarioError || masterErpError;
    if (error) {
      return { origens: [], familias: [], agrupamentos: [], produtos: [], dicionario: [], hierarquia: [], diagnostico_sem_mapa: { status: 'indisponivel', rows: [], error }, error };
    }

    const historicoNormalizado = (historicoRows || [])
      .map(item => ({
        codigo_produto: normalizeCodigoProduto(item?.codigo_produto),
        descricao: String(item?.descricao || '').trim() || null
      }))
      .filter(item => !isNullLike(item?.codigo_produto));

    const codigosComCusto = new Set(historicoNormalizado
      .map(item => item?.codigo_produto)
      .filter(value => !isNullLike(value))
      .map(value => String(value).trim()));

    // Projeção de todos os códigos de Custos, inclusive sem cadastro operacional.
    let dicionarioComCusto;
    try {
      dicionarioComCusto = classificarCustos(
        [...new Map(historicoNormalizado.map(row => [row.codigo_produto, row])).values()],
        (dicionarioRaw || []).filter(item => codigosComCusto.has(normalizeCodigoProduto(item?.codigo_produto))),
        { produtos: masterErpRows, origens: origensRaw, familias: familiasRaw });
    } catch (error) {
      return { origens: [], familias: [], agrupamentos: [], produtos: [], dicionario: [], hierarquia: [], diagnostico_sem_mapa: { status: 'indisponivel', rows: [], error }, error };
    }

    const dicionarioByCodigo = new Map((dicionarioComCusto || [])
      .filter(item => !isNullLike(item?.codigo_produto))
      .map(item => [normalizeCodigoProduto(item.codigo_produto), item]));

    const produtosMap = new Map();
    historicoNormalizado.forEach(item => {
      const codigo = normalizeCodigoProduto(item.codigo_produto);
      if (!codigo || produtosMap.has(codigo)) return;
      const itemDicionario = dicionarioByCodigo.get(codigo);
      const descricao = item.descricao || itemDicionario?.descricao || '-';
      produtosMap.set(codigo, {
        codigo_produto: codigo,
        descricao
      });
    });
    const produtos = [...produtosMap.values()]
      .sort((a, b) => String(a.descricao).localeCompare(String(b.descricao), 'pt-BR'));

    const idsPermitidos = (fieldName) => new Set(dicionarioComCusto
      .map(item => item?.[fieldName])
      .filter(value => !isNullLike(value))
      .map(value => String(value).trim()));

    const origemIdsPermitidos = idsPermitidos('origem_id');
    const familiaIdsPermitidos = idsPermitidos('familia_id');
    const agrupamentoIdsPermitidos = idsPermitidos('agrupamento_cod');

    const normalizedOrigens = normalizeMasterRows((origensRaw || [])
      .filter(row => origemIdsPermitidos.has(String(resolveMasterId(row)).trim())));
    const normalizedFamilias = normalizeMasterRows((familiasRaw || [])
      .filter(row => familiaIdsPermitidos.has(String(resolveMasterId(row)).trim())));
    const agrupamentosNormalizados = normalizeMasterRows((agrupamentosRaw || []).map(row => ({
      ...row,
      id: row?.codigo ?? resolveMasterId(row)
    })).filter(row => agrupamentoIdsPermitidos.has(String(row?.id || '').trim())));

    return {
      origens: normalizedOrigens,
      familias: normalizedFamilias,
      agrupamentos: agrupamentosNormalizados,
      produtos,
      dicionario: dicionarioComCusto,
      hierarquia: mapHierarchyRows(dicionarioComCusto),
      diagnostico_sem_mapa: await runDiagnosticoSemAgrupamento(),
      error: null
    };
  },

  /** Fase 3.1: SELECT integral do Mestre ERP, sem tocar na dimensão operacional. */
  async getCadastroMestrePreviewContext() {
    try {
      return ok(await lerContextoCadastroMestrePreview(supabase));
    } catch (error) {
      return fail('Falha ao carregar contexto completo do Preview do Cadastro Mestre.', { metodo: 'getCadastroMestrePreviewContext' }, error);
    }
  },

  /** Consulta ERP somente leitura; reutiliza paginação integral do Master e catálogos. */
  async getCadastroMestreErp() {
    try {
      return ok(await lerContextoCadastroMestrePreview(supabase));
    } catch (error) {
      return fail('Falha ao carregar o Cadastro Mestre ERP.', { metodo: 'getCadastroMestreErp' }, error);
    }
  },

  /** Cadastro legado: a mesma dimensão consultada por Custos e OP. */
  async getProductMaster() {
    const [produtosResult, origensResult, familiasResult, agrupamentosResult, historicoResult, opResult] = await Promise.all([
      lerCompleto(TABLES.dicionario, 'codigo_produto, descricao, origem_id, familia_id, agrupamento_cod', 'codigo_produto'),
      supabase.from(TABLES.origem).select('id, descricao').order('descricao'),
      supabase.from(TABLES.familia).select('id, descricao').order('descricao'),
      supabase.from(TABLES.agrupamento).select('*').order('descricao'),
      lerCompleto(TABLES.historico, 'codigo_produto', 'codigo_produto'),
      lerCompleto(TABLES.apontamentosOp, 'cod_produto', 'cod_produto')
    ]);
    const error = produtosResult.error || origensResult.error || familiasResult.error || agrupamentosResult.error || historicoResult.error || opResult.error;
    if (error) return fail('Falha ao carregar o cadastro mestre de produtos.', { metodo: 'getProductMaster' }, error);
    const produtos = (produtosResult.data || []).map(item => ({ ...item, codigo_produto: normalizeCodigoProduto(item.codigo_produto) })).filter(item => item.codigo_produto);
    const index = createProductMasterIndex(produtos);
    const codigosImportados = [...(historicoResult.data || []), ...(opResult.data || [])]
      .map(item => normalizeCodigoProduto(item.codigo_produto ?? item.cod_produto)).filter(Boolean);
    const ausentes = [...new Set(codigosImportados)].filter(codigo => !index.has(codigo)).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const agrupamentos = normalizeMasterRows((agrupamentosResult.data || []).map(row => ({ ...row, id: row?.codigo ?? resolveMasterId(row) })));
    return ok({ produtos, origens: normalizeMasterRows(origensResult.data || []), familias: normalizeMasterRows(familiasResult.data || []), agrupamentos, ausentes });
  },

  async upsertProductMaster(payload = {}) {
    const codigo = normalizeCodigoProduto(payload.codigo_produto);
    if (!codigo) return fail('Código do produto é obrigatório.', { metodo: 'upsertProductMaster' });
    const { data: current, error: currentError } = await supabase.from(TABLES.dicionario)
      .select('codigo_produto, descricao, origem_id, familia_id, agrupamento_cod').eq('codigo_produto', codigo).maybeSingle();
    if (currentError) return fail('Falha ao consultar o cadastro mestre do produto.', { metodo: 'upsertProductMaster' }, currentError);
    const next = buildManualProductMasterPayload({ ...current, ...payload, codigo_produto: codigo });
    const { error } = await supabase.from(TABLES.dicionario).upsert(next, { onConflict: 'codigo_produto' });
    if (error) return fail('Falha ao atualizar o cadastro mestre do produto.', { metodo: 'upsertProductMaster' }, error);
    return ok({ codigo_produto: codigo });
  },

  /** Importa o XLSM oficial de forma incremental; campos ERP vazios não apagam o cadastro. */
  async importProductMasterXlsm(rows = []) {
    const [produtosResult, origensResult, familiasResult] = await Promise.all([
      supabase.from(TABLES.dicionario).select('codigo_produto, descricao, origem_id, familia_id, agrupamento_cod'),
      supabase.from(TABLES.origem).select('id, codigo, descricao'),
      supabase.from(TABLES.familia).select('id, codigo, descricao')
    ]);
    const error = produtosResult.error || origensResult.error || familiasResult.error;
    if (error) return fail('Falha ao preparar a importação do mestre de produtos.', { metodo: 'importProductMasterXlsm' }, error);
    const reconciliation = reconcileProductMasterImport(rows, { produtos: produtosResult.data || [], origens: origensResult.data || [], familias: familiasResult.data || [] });
    if (!reconciliation.rows.length) return ok({ importados: 0, ...reconciliation });
    const { error: upsertError } = await supabase.from(TABLES.dicionario).upsert(
      reconciliation.rows.map(buildProductMasterPayload), { onConflict: 'codigo_produto' }
    );
    if (upsertError) return fail('Falha ao gravar o mestre de produtos.', { metodo: 'importProductMasterXlsm' }, upsertError);
    return ok({ importados: reconciliation.rows.length, ...reconciliation });
  },

  subscribeFiltrosRealtime(onChange) {
    const callback = typeof onChange === 'function' ? onChange : () => {};
    const channel = supabase
      .channel('auditoria-filtros-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.historico }, callback)
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.dicionario }, callback)
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (error) {
        console.warn('Falha ao remover canal realtime de filtros.', error);
      }
    };
  },

  async upsertHistoricoCustos(payload) {
    const rows = Array.isArray(payload) ? payload : [];
    const sanitized = rows.map(row => ({
      codigo_produto: normalizeCodigoProduto(row?.codigo_produto),
      descricao: row?.descricao ?? null,
      custo_variavel: normalizeMoneyValue(row?.custo_variavel),
      custo_direto_fixo: normalizeMoneyValue(row?.custo_direto_fixo),
      custo_total: normalizeMoneyValue(row?.custo_total),
      data_referencia: normalizeISODate(row?.data_referencia)
    }));

    const invalidRows = sanitized.filter(row => !validateHistoricoRow(row).valido);
    if (invalidRows.length) {
      return fail('Payload de upsert inválido para historico_custos.', { metodo: 'upsertHistoricoCustos', invalidRows: invalidRows.length });
    }

    const { data, error } = await supabase
      .from(TABLES.historico)
      .upsert(sanitized, { onConflict: 'codigo_produto,data_referencia' })
      .select('codigo_produto, data_referencia, criado_em');

    if (error) return fail('Falha ao realizar upsert no histórico de custos.', { metodo: 'upsertHistoricoCustos' }, error);
    return ok(data || []);
  },

  async signIn(login, password) {
    const rawLogin = String(login || '').trim();
    const sanitizedPassword = String(password || '');

    if (!rawLogin || !sanitizedPassword) {
      return { data: null, error: new Error('Credenciais obrigatórias.') };
    }

    // Mapeamento de username → email do Supabase Auth
    // Permite login com nome de usuário curto (ex: "Pedrok")
    const USERNAME_MAP = {
      'pedrok': 'pedrok@germani.local'
    };
    const key = rawLogin.toLowerCase();
    const email = USERNAME_MAP[key] || (rawLogin.includes('@') ? rawLogin : rawLogin + '@germani.local');

    const response = await supabase.auth.signInWithPassword({ email, password: sanitizedPassword });
    if (response.error || !response.data?.user || !response.data?.session?.access_token) {
      await supabase.auth.signOut();
      return { data: null, error: response.error || new Error('Sessão inválida após autenticação.') };
    }

    return response;
  },

  async signOut() {
    return supabase.auth.signOut();
  },

  async getCurrentUser() {
    return supabase.auth.getUser();
  },

  getCadastroMestreExecutionAvailability() { return consultarDisponibilidadeReconstrucao(supabase); },
  verificarAmbienteReconstrucaoCadastroMestre() { return verificarAmbienteReconstrucao(supabase); },
  executarReconstrucaoCadastroMestre(pedido) { return executarReconstrucaoPelaAplicacao(supabase, pedido); },
  consultarReconstrucaoCadastroMestre(lote) { return consultarLoteReconstrucao(supabase, lote); },

  /**
   * Importa um lote de histórico de custos, registrando log_importacao,
   * validando linha a linha e persistindo em chunks (IMPORT_CHUNK_SIZE).
   * batchId reutiliza a PK confirmada do log; o schema atual não persiste vínculo no fato.
   * @param {Array<Pick<HistoricoRow, 'codigo_produto'|'descricao'|'custo_variavel'|'custo_direto_fixo'|'custo_total'|'data_referencia'>>} payload
   * @param {{dataReferencia?: string}} [options]
   */
  async importarHistoricoCustosComLog(payload, options = {}) {
    const totalLinhas = Array.isArray(payload) ? payload.length : 0;
    const inicio = new Date().toISOString();
    const dataReferenciaSelecionada = normalizeISODate(options.dataReferencia);
    const baseLog = {
      status: 'processando',
      total_linhas: totalLinhas,
      linhas_importadas: 0,
      linhas_erro: 0,
      iniciado_em: inicio,
      finalizado_em: null,
      data_referencia: dataReferenciaSelecionada
    };

    let logResult;
    try {
      logResult = await supabase.from(TABLES.logImportacao).insert(baseLog).select('*').single();
    } catch (error) {
      return fail('Importação não iniciada: identidade de lote indisponível.', { metodo: 'importarHistoricoCustosComLog', batchId: null }, error);
    }
    const { data: createdLog, error: createLogError } = logResult;
    const logId = createdLog?.id ?? null;
    const validLogId = typeof logId === 'number' ? Number.isSafeInteger(logId) && logId > 0
      : typeof logId === 'string' && /^[1-9]\d*$/.test(logId);
    if (createLogError || !validLogId) {
      return fail('Importação não iniciada: identidade de lote não confirmada.',
        { metodo: 'importarHistoricoCustosComLog', batchId: null }, createLogError);
    }
    // Reutiliza a PK persistida; não gera UUID/timestamp concorrente nem identidade por chunk.
    const lote = Object.freeze({ batchId: String(logId), logId });
    const chunks = [];
    let linhasImportadas = 0;
    let linhasErro = 0;
    const erros = [];
    const normalizacoesCodigo = [];

    const rows = Array.isArray(payload) ? payload : [];
    const payloadValido = [];
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const produtoOriginal = row?.codigo_produto;
      const produto = normalizeCodigoProduto(produtoOriginal);
      if (produto && String(produtoOriginal ?? '').trim() !== produto && normalizacoesCodigo.length < 5) {
        normalizacoesCodigo.push({ linha: index + 1, antes: String(produtoOriginal ?? '').slice(0, 40), depois: produto });
      }
      const custoTotal = normalizeMoneyValue(row?.custo_total);
      const dataReferencia = normalizeISODate(row?.data_referencia || dataReferenciaSelecionada);

      if (!produto || custoTotal === null || !dataReferencia) {
        debugLog('Linha bloqueada por validação de importação', { linha: index + 1, produto, custoTotal, dataReferencia });
        linhasErro += 1;
        erros.push({
          linha: index + 1,
          tipo: 'validacao',
          mensagem: 'codigo_produto, custo_total e data_referencia são obrigatórios.',
          row
        });
        continue;
      }

      const rowNormalizada = {
        ...row,
        codigo_produto: produto,
        custo_total: custoTotal,
        data_referencia: dataReferencia
      };

      const validacao = validateHistoricoRow(rowNormalizada);
      if (!validacao.valido) {
        linhasErro += 1;
        erros.push({ linha: index + 1, tipo: 'validacao', mensagem: validacao.erros.join('; '), row: rowNormalizada });
        continue;
      }

      payloadValido.push({
        codigo_produto: produto,
        descricao: rowNormalizada.descricao ?? null,
        custo_variavel: normalizeMoneyValue(rowNormalizada.custo_variavel),
        custo_direto_fixo: normalizeMoneyValue(rowNormalizada.custo_direto_fixo),
        custo_total: custoTotal,
        data_referencia: dataReferencia
      });
    }

    if (normalizacoesCodigo.length) {
      debugLog('Normalização de código de produto no payload de importação', {
        amostras: normalizacoesCodigo
      });
    }

    if (payloadValido.length > 0) {
      const dicionarioStatus = await garantirProdutosNoDicionarioEmLote(payloadValido);
      if (!dicionarioStatus.ok) {
        console.warn('Falha parcial ao garantir produtos no dicionário em lote.', dicionarioStatus.erros);
        erros.push(...(dicionarioStatus.erros || []).map(erro => ({
          linha: null,
          tipo: erro.tipo || 'dicionario',
          mensagem: erro.mensagem || 'Falha desconhecida ao preparar dicionário',
          row: null
        })));
      }
    }

    if (payloadValido.length > 0) {
      for (let i = 0; i < payloadValido.length; i += IMPORT_CHUNK_SIZE) {
        const chunk = { batchId: lote.batchId, indice: i / IMPORT_CHUNK_SIZE + 1,
          registros: payloadValido.slice(i, i + IMPORT_CHUNK_SIZE) };
        let chunkResult;
        try {
          // O schema atual não tem FK de lote no fato: não enviar coluna inexistente.
          chunkResult = await supabase.from(TABLES.historico)
            .upsert(chunk.registros, { onConflict: 'codigo_produto,data_referencia' });
        } catch (error) {
          chunkResult = { data: null, error };
        }
        const { data, error } = chunkResult;
        chunks.push({ batchId: chunk.batchId, indice: chunk.indice,
          total_linhas: chunk.registros.length, status: error ? 'erro' : 'gravado' });

        if (error) {
          linhasErro += chunk.registros.length;
          chunk.registros.forEach(registro => {
            erros.push({
              linha: null,
              tipo: 'historico',
              mensagem: `Falha ao inserir produto ${registro.codigo_produto} no histórico: ${error.message || 'erro desconhecido'}`,
              row: registro
            });
          });
          console.error('Falha Supabase ao upsert histórico em chunk:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
            batchId: chunk.batchId,
            chunkSize: chunk.registros.length,
            data
          });
          continue;
        }

        linhasImportadas += chunk.registros.length;
      }
    }

    const resumo = {
      total_linhas: totalLinhas,
      linhas_importadas: linhasImportadas,
      linhas_erro: linhasErro
    };

    const fechamentoLog = {
      status: 'finalizado',
      ...resumo,
      finalizado_em: new Date().toISOString()
    };

    let updateLogError = null;
    try {
      const { error } = await supabase.from(TABLES.logImportacao).update(fechamentoLog).eq('id', lote.logId);
      updateLogError = error;
    } catch (error) {
      updateLogError = error;
    }

    return {
      data: {
        log_id: logId,
        batchId: lote.batchId,
        chunks,
        rastreabilidade: { identidade: 'log_importacao.id', persistencia_log: true,
          persistencia_fatos: false, motivo: 'SCHEMA_SEM_VINCULO_LOTE_NO_FATO',
          fechamento_log: updateLogError ? 'nao_confirmado' : 'confirmado' },
        resumo,
        erros,
        log_error: createLogError || updateLogError || null
      },
      error: null
    };
  },

  async suggestCategory(product, _masters) {
    const codigo = normalizeCodigoProduto(product?.codigo_produto);
    if (!codigo) {
      return { data: { origem_id: null, familia_id: null, agrupamento_cod: null, status: 'PENDENTE' }, error: null };
    }

    const { data, error } = await supabase
      .from(TABLES.dicionario)
      .select('origem_id, familia_id, agrupamento_cod')
      .eq('codigo_produto', codigo)
      .maybeSingle();

    if (error) return { data: null, error };

    return {
      data: {
        origem_id: data?.origem_id || null,
        familia_id: data?.familia_id || null,
        agrupamento_cod: data?.agrupamento_cod || null,
        status: data?.origem_id && data?.familia_id && data?.agrupamento_cod ? 'SUGERIDO' : 'PENDENTE'
      },
      error: null
    };
  },

  /**
   * @param {{origem?:string, familia?:string, agrupamento?:string, item?:string, start?:string, end?:string, competencias?:string[]}} filters
   * @returns {Promise<{data: Array<HistoricoRow>|null, error: unknown}>}
   */
  async getHistorico(filters) {
    return getHistoricoWithClientFallback({ ...normalizeCascadeFilters(filters), ...normalizeTemporalFilters(filters) });
  },

  /**
   * OP-CUSTO-01 / Fase 1: contexto mensal integral, apenas SELECT.
   * Produto é metadado de consulta explícita (D), nunca filtro da cobertura global.
   * Resultados originais são adaptados sem importar presenter/ranking da UI.
   * @param {{competencia:string, periodo?:{inicio:string, fimInclusivo:string}, produto?:string}} params
   */
  async getOpCustoContext(params) {
    const metodo = 'getOpCustoContext';
    let etapa = 'entrada';
    try {
      const competencia = params?.competencia;
      const periodo = getOpCustoPeriod(competencia);
      if (params.periodo && (params.periodo.inicio !== periodo.inicio || params.periodo.fimInclusivo !== periodo.fimInclusivo)) {
        return fail('Limites devem corresponder à competência completa.', { metodo, code: 'LIMITES_INVALIDOS' });
      }
      const produtoSolicitado = params.produto === undefined ? undefined : normalizeCodigoProduto(params.produto);
      if (params.produto !== undefined && !produtoSolicitado) return fail('Produto consultado inválido.', { metodo, code: 'PRODUTO_INVALIDO' });
      const iniciadoEm = new Date().toISOString();
      const idLocal = `OP_CUSTO:${competencia}:${++opCustoReadSequence}:${iniciadoEm}`;
      const opOrder = [{ column: 'data_referencia', ascending: false }, 'estagio', 'origem', 'op', 'id'];
      const configurar = query => query.gte('data_referencia', periodo.inicio).lte('data_referencia', periodo.fimInclusivo);
      etapa = 'fatos';
      const [opResult, custoResult] = await Promise.all([
        lerCompleto(TABLES.apontamentosOp, '*', opOrder, configurar),
        lerCompleto(TABLES.historico, '*', HISTORICO_PAGE_ORDER, configurar)
      ]);
      const fonteComErro = opResult.error ? 'op' : custoResult.error ? 'custos' : null;
      if (fonteComErro) {
        const upstream = fonteComErro === 'op' ? opResult.error : custoResult.error;
        const conhecido = upstream?.name === 'OperationalContractError' ? upstream.message : '';
        const code = conhecido === 'Contagem incompleta ou alterada durante a leitura paginada.' ? 'CONTAGEM_DIVERGENTE'
          : conhecido === 'Leitura paginada incompleta.' ? 'LEITURA_INCOMPLETA'
            : fonteComErro === 'op' ? 'FONTE_OP_INDISPONIVEL' : 'FONTE_CUSTO_INDISPONIVEL';
        return fail('Não foi possível concluir a leitura mensal OP × Custo.', { metodo, fonte: fonteComErro, code, completa: false });
      }
      assertOpCustoIds(opResult.data);
      assertOpCustoIds(custoResult.data);
      const codigos = [...new Set([
        ...opResult.data.map(r => normalizeCodigoProduto(r.cod_produto)),
        ...custoResult.data.map(r => normalizeCodigoProduto(r.codigo_produto))
      ].filter(Boolean))];
      etapa = 'enriquecimento';
      const [produtos, erp, origens, familias] = codigos.length ? await Promise.all([
        lerDicionarioDosCodigos(codigos),
        custoResult.data.length ? lerCompleto(TABLES.masterErp, 'codigo_produto, origem_cod, familia_cod', 'codigo_produto') : ok([]),
        lerCompleto(TABLES.origem, '*', ['descricao', 'id']),
        lerCompleto(TABLES.familia, '*', ['descricao', 'id'])
      ]) : [ok([]), ok([]), ok([]), ok([])];
      if ([produtos, erp, origens, familias].some(r => r.error)) {
        return fail('Não foi possível concluir o enriquecimento OP × Custo.', { metodo, code: 'ENRIQUECIMENTO_INDISPONIVEL', completa: false });
      }
      const productIndex = createProductMasterIndex(produtos.data);
      const originIndex = new Map(origens.data.map(r => [String(r.id), r.descricao]));
      const familyIndex = new Map(familias.data.map(r => [String(r.id), r.descricao]));
      const opEventos = opResult.data.map(row => {
        const resolved = resolveProductClassification(row, productIndex);
        return { ...row, classificacaoMestre: { status: resolved.status,
          origem: resolved.produto ? originIndex.get(String(resolved.produto.origem_id)) ?? null : null,
          familia: resolved.produto ? familyIndex.get(String(resolved.produto.familia_id)) ?? null : null } };
      });
      const projetados = classificarCustos(custoResult.data, produtos.data, { produtos: erp.data, origens: origens.data, familias: familias.data });
      const custoSnapshots = custoResult.data.map((row, index) => ({ ...row, classificacaoCustos: {
        origem_id: projetados[index].origem_id, familia_id: projetados[index].familia_id,
        agrupamento_cod: projetados[index].agrupamento_cod, descricao: projetados[index].descricao
      } }));
      const terminadoEm = new Date().toISOString();
      const fonte = (rows, ordem) => ({ estado: rows.length ? 'completa' : 'completa_vazia', contagem: rows.length,
        paginas: Math.max(1, Math.ceil(rows.length / PRODUCT_MASTER_PAGE_SIZE)), ordem, lidoEm: terminadoEm });
      const contexto = { versao: 'OP_CUSTO_V1', competencia, periodo, opEventos, custoSnapshots,
        fontes: { op: fonte(opEventos, opOrder), custos: fonte(custoSnapshots, HISTORICO_PAGE_ORDER) },
        leitura: { idLocal, iniciadoEm, terminadoEm, consistencia: 'nao_transacional' } };
      etapa = 'adaptacao';
      const inspecao = inspectOpCustoContext(contexto, produtoSolicitado);
      const rowsOp = [...inspecao.grupos.values()].flatMap(g => g.op);
      const rowsCusto = [...inspecao.grupos.values()].flatMap(g => g.custos).map(row => ({ ...row, ...row.classificacaoCustos }));
      // O motor preserva o ID no objeto analisado; nunca fazer zip de arrays ou usar chave legada.
      const analisesOp = buildOpInvestigationQueue(rowsOp).map((row, posicaoOriginal) => ({
        idFonte: /** @type {Record<string, any>} */ (row).id, resultadoOriginal: toInvestigationResult(row), posicaoOriginal
      }));
      const analisesCusto = buildReportRows(rowsCusto).map(resultadoOriginal => ({
        codigoNormalizado: resultadoOriginal.codigo, resultadoOriginal, alerta: classifyAlert(resultadoOriginal),
        prioridadeOriginal: null, qualidadePrioridade: 'aguarda_presenter_existente'
      }));
      return ok({ ...contexto, analisesOp, analisesCusto, produtoSolicitado: produtoSolicitado ?? null,
        cobertura: inspecao.cobertura, qualidade: { completa: true, diagnosticos: inspecao.diagnosticos } });
    } catch (error) {
      // Nunca expor mensagem/detail/cause arbitrários do driver no novo contexto.
      const codes = new Set(['COMPETENCIA_INVALIDA', 'MULTICOMPETENCIA_NAO_SUPORTADA_V1', 'IDENTIDADE_INVALIDA', 'IDENTIDADE_REPETIDA', 'PRODUTO_INVALIDO']);
      return fail('Não foi possível preparar o contexto OP × Custo.', { metodo, etapa,
        code: codes.has(error?.code) ? error.code : 'CONTEXTO_INDISPONIVEL', completa: false });
    }
  },

  async getLatestImportComparison(filters = {}) {
    const context = await lerContextoComparacao(filters, 'getLatestImportComparison');
    if (context.error) return context;
    const { rows, imports, estadoComparacao, motivo, totalEventosElegiveis } = context.data;
    const statsByImport = imports.map(importDate => {
      const importData = rows.filter(row => row.criado_em === importDate);
      const total = importData.reduce((acc, row) => acc + Number(row.custo_total), 0);
      const quantidade = importData.length;
      const media = total / quantidade; // evento selecionado sempre tem fatos no universo filtrado
      return { criado_em: importDate, quantidade, media: roundTo4(media) };
    });
    if (estadoComparacao !== 'disponivel') {
      return ok({ imports: statsByImport, resumo: null, estadoComparacao, motivo, totalEventosElegiveis });
    }

    const latest = statsByImport[0];
    const previous = statsByImport[1];
    const variacaoPercentual = previous.media === 0 ? null : roundTo4(((latest.media - previous.media) / previous.media) * 100);

    return ok({
        imports: statsByImport,
        estadoComparacao, motivo, totalEventosElegiveis,
        resumo: {
          variacao_percentual_media: variacaoPercentual,
          delta_media: roundTo4(latest.media - previous.media),
          motivoPercentual: previous.media === 0 ? 'base_anterior_zero' : null
        }
      });
  },

  async getTrendsByProduct(codigoProduto) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6);

    const codigo = normalizeCodigoProduto(codigoProduto);
    if (!codigo) return { data: null, error: createApiError('codigoProduto é obrigatório para tendências do produto.', { metodo: 'getTrendsByProduct' }) };

    return supabase
      .from(TABLES.historico)
      .select('codigo_produto, custo_total, data_referencia')
      .eq('codigo_produto', codigo)
      .gte('data_referencia', startDate.toISOString().slice(0, 10))
      .lte('data_referencia', endDate.toISOString().slice(0, 10))
      .order('data_referencia', { ascending: true });
  },

  /**
   * Histórico de um produto para o drill-through, limitado ao recorte temporal
   * ativo: intervalo ou competências explicitamente selecionadas.
   * @param {string} codigoProduto
   * @param {{start?:string, end?:string, competencias?:string[]}|string[]} [temporalFilters]
   * @returns {Promise<{data: Array<HistoricoRow>|null, error: unknown}>}
   */
  async getProductHistory(codigoProduto, temporalFilters = {}) {
    const codigo = normalizeCodigoProduto(codigoProduto);
    if (!codigo) {
      return { data: null, error: createApiError('codigoProduto é obrigatório para drill-through.', { metodo: 'getProductHistory' }) };
    }

    const filters = Array.isArray(temporalFilters) ? { competencias: temporalFilters } : temporalFilters;
    const temporal = normalizeTemporalFilters(filters);
    const { data, error } = await lerCompleto(TABLES.historico,
      'codigo_produto, descricao, custo_total, custo_variavel, custo_direto_fixo, data_referencia, criado_em',
      ['data_referencia', 'criado_em', 'id'], query => {
        query = query.eq('codigo_produto', codigo);
        if (temporal.competencias.length) return query.in('data_referencia', temporal.competencias);
        if (temporal.start && temporal.end) return query.gte('data_referencia', temporal.start).lte('data_referencia', temporal.end);
        return query;
      });

    if (error) return fail('Falha ao carregar histórico detalhado do produto.', { metodo: 'getProductHistory', codigo_produto: codigo }, error);

    const enriched = await enrichRowsWithClassificacaoCustos(data || []);
    if (enriched.error) return fail('Falha ao classificar histórico detalhado do produto.', { metodo: 'getProductHistory' }, enriched.error);
    // Descrição do drill-through continua sendo o snapshot do fato.
    const sorted = enriched.data.map((row, i) => ({ ...row, descricao: data[i].descricao }));
    const annotated = sorted.map((row, i) => {
      const prev = i > 0 ? sorted[i - 1] : null;
      const custoAtual = Number(row.custo_total || 0);
      const custoPrev = prev !== null ? Number(prev.custo_total || 0) : null;
      const delta = custoPrev !== null ? custoAtual - custoPrev : null;
      const deltaPerc = custoPrev !== null && custoPrev > 0
        ? ((custoAtual - custoPrev) / custoPrev) * 100
        : null;
      return {
        ...row,
        delta: delta !== null ? roundTo4(delta) : null,
        deltaPerc: deltaPerc !== null ? roundTo4(deltaPerc) : null
      };
    });

    return ok(annotated);
  },

  async getTopVariacoesImportacao(filters = {}) {
    const context = await lerContextoComparacao(filters, 'getTopVariacoesImportacao');
    if (context.error) return context;
    const { rows, imports, totalEventosElegiveis } = context.data;
    if (imports.length < 2) return ok({ imports, totalEventosElegiveis,
      estadoComparacao: context.data.estadoComparacao, motivo: context.data.motivo,
      aumentos: [], reducoes: [], semComparativo: [], paresComparaveis: 0 });
    const [ultimaImportacao, penultimaImportacao] = imports;
    const byProductAndDate = new Map();
    for (const row of rows) {
      if (row.criado_em !== ultimaImportacao && row.criado_em !== penultimaImportacao) continue;
      const codigo = normalizeCodigoProduto(row.codigo_produto);
      if (!codigo) return fail('Produto inválido na comparação.', { metodo: 'getTopVariacoesImportacao' });
      const key = JSON.stringify([codigo, row.data_referencia]);
      if (!byProductAndDate.has(key)) byProductAndDate.set(key, {
        codigo_produto: codigo, data_referencia: row.data_referencia, descricao: row.descricao || '-', atual: null, anterior: null
      });
      const bucket = byProductAndDate.get(key);
      const side = row.criado_em === ultimaImportacao ? 'atual' : 'anterior';
      if (bucket[side]) return fail('Fatos ambíguos para produto, data e evento.', { metodo: 'getTopVariacoesImportacao' });
      bucket[side] = row; // snapshot inteiro: nunca completar componentes com outro fato
    }
    const variacoes = [];
    const semComparativo = [];
    for (const item of byProductAndDate.values()) {
      const novo = item.atual ? Number(item.atual.custo_total) : null;
      const antigo = item.anterior ? Number(item.anterior.custo_total) : null;
      const fact = { codigo_produto: item.codigo_produto, data_referencia: item.data_referencia,
        descricao: item.atual?.descricao || item.descricao, novo, antigo,
        id_atual: item.atual?.id ?? null, id_anterior: item.anterior?.id ?? null };
      if (novo === null || antigo === null || antigo === 0) {
        semComparativo.push({ ...fact, motivo: novo === null || antigo === null ? 'par_ausente' : 'base_anterior_zero' });
      } else variacoes.push({ ...fact, variacao_percentual: roundTo4(((novo - antigo) / antigo) * 100) });
    }
    variacoes.sort((a, b) => b.variacao_percentual - a.variacao_percentual ||
      a.codigo_produto.localeCompare(b.codigo_produto, 'pt-BR') || a.data_referencia.localeCompare(b.data_referencia));

    return ok({
        imports, totalEventosElegiveis, paresComparaveis: variacoes.length, semComparativo,
        estadoComparacao: variacoes.length ? 'disponivel' : 'insuficiente',
        motivo: variacoes.length ? null : 'sem_pares_comparaveis',
        aumentos: variacoes.filter(item => item.variacao_percentual > 0).slice(0, 5),
        reducoes: [...variacoes].reverse().filter(item => item.variacao_percentual < 0).slice(0, 5)
      });
  },

  /**
   * Importa um lote de apontamentos de OP (relatório MCAP105), registrando o
   * ciclo de vida em log_importacao_op (processando → concluido).
   *
   * Diferente do histórico de custos (upsert por codigo_produto,data_referencia),
   * aqui usamos INSERT simples: o mesmo produto pode ter várias OPs na mesma
   * competência, então não há chave de conflito natural. Reimportar o mesmo
   * arquivo duplica os registros — comportamento aceito e documentado.
   *
   * @param {{ rows?: Array<Record<string, unknown>>, dataReferencia?: string, arquivoNome?: string }} params
   * @returns {Promise<{data: {inseridos: number, erros: Array<Record<string, unknown>>, logId: number|null}|null, error: unknown}>}
   */
  async importarApontamentosOp({ rows, dataReferencia, arquivoNome } = {}) {
    const dataReferenciaISO = normalizeISODate(dataReferencia);
    if (!dataReferenciaISO) {
      return fail('data_referencia é obrigatória para importar apontamentos de OP.', { metodo: 'importarApontamentosOp' });
    }

    const lista = Array.isArray(rows) ? rows : [];
    const totalLinhas = lista.length;

    const { data: createdLog, error: createLogError } = await supabase
      .from(TABLES.logImportacaoOp)
      .insert({
        data_referencia: dataReferenciaISO,
        total_linhas: totalLinhas,
        arquivo_nome: arquivoNome ?? null,
        status: 'processando',
        linhas_importadas: 0,
        linhas_erro: 0
      })
      .select('id')
      .single();

    if (createLogError) {
      return fail('Falha ao registrar log de importação de apontamentos de OP.', { metodo: 'importarApontamentosOp' }, createLogError);
    }

    const logId = createdLog?.id ?? null;

    const registros = lista.map(row => ({
      data_referencia: dataReferenciaISO,
      log_importacao_op_id: logId,
      origem: row?.origem ?? null,
      op: row?.op ?? null,
      cod_produto: row?.cod_produto ?? null,
      descricao: row?.descricao ?? null,
      cod_estagio: row?.cod_estagio ?? null,
      estagio: row?.estagio ?? null,
      unidade: row?.unidade ?? null,
      qtd_prevista: row?.qtd_prevista ?? null,
      qtd_produzida: row?.qtd_produzida ?? null,
      qtd_apontamentos: row?.qtd_apontamentos ?? null,
      tempo_real: row?.tempo_real ?? null,
      tempo_previsto: row?.tempo_previsto ?? null,
      tempo_parada: row?.tempo_parada ?? null,
      kg_hora_real: row?.kg_hora_real ?? null,
      kg_hora_previsto: row?.kg_hora_previsto ?? null,
      perc_tempo: row?.perc_tempo ?? null
    }));

    let inseridos = 0;
    const erros = [];

    for (let i = 0; i < registros.length; i += IMPORT_CHUNK_SIZE) {
      const chunk = registros.slice(i, i + IMPORT_CHUNK_SIZE);
      const { error } = await supabase.from(TABLES.apontamentosOp).insert(chunk);
      if (error) {
        const chunkAtual = Math.floor(i / IMPORT_CHUNK_SIZE) + 1;
        const validationErrors = findOpChunkValidationErrors(chunk, i, error);
        erros.push({
          chunk: chunkAtual,
          tamanho: chunk.length,
          mensagem: error.message,
          code: error.code ?? null,
          details: error.details ?? null,
          hint: error.hint ?? null,
          errosValidacaoPorRegistro: validationErrors
        });
        logOpImportFailure({ chunkAtual, chunk, error, validationErrors });
      } else {
        inseridos += chunk.length;
      }
    }

    const linhasErro = totalLinhas - inseridos;

    if (logId) {
      const { error: updateLogError } = await supabase
        .from(TABLES.logImportacaoOp)
        .update({
          status: 'concluido',
          linhas_importadas: inseridos,
          linhas_erro: linhasErro,
          finalizado_em: new Date().toISOString()
        })
        .eq('id', logId);
      if (updateLogError) {
        debugLog('Falha controlada ao fechar log de importação de OP', { message: updateLogError.message || String(updateLogError) });
      }
    }

    return ok({ inseridos, erros, logId });
  },

  /**
   * Consulta apontamentos de OP com filtros opcionais. Ordena por competência
   * (mais recente primeiro), estágio, origem e OP.
   * @param {{ dataReferencia?: string, estagio?: string, origem?: number|string, op?: number|string, codProduto?: string }} [filters]
   * @returns {Promise<{data: Array<Record<string, unknown>>|null, error: unknown}>}
   */
  async getApontamentosOp(filters = {}) {
    const dataReferenciaISO = normalizeISODate(filters?.dataReferencia);
    const { data, error } = await lerCompleto(TABLES.apontamentosOp, '*', [
      { column: 'data_referencia', ascending: false }, 'estagio', 'origem', 'op', 'id'
    ], query => {
      if (dataReferenciaISO) query = query.eq('data_referencia', dataReferenciaISO);
      if (filters?.estagio) query = query.eq('estagio', filters.estagio);
      if (filters?.origem !== undefined && filters?.origem !== null && filters?.origem !== '') query = query.eq('origem', filters.origem);
      if (filters?.op !== undefined && filters?.op !== null && filters?.op !== '') query = query.eq('op', filters.op);
      if (filters?.codProduto) query = query.eq('cod_produto', filters.codProduto);
      return query;
    });

    if (error) return fail('Falha ao consultar apontamentos de OP.', { metodo: 'getApontamentosOp' }, error);
    const rows = data || [];
    // Não disfarçar sobreposição de páginas como um universo completo.
    if (new Set(rows.map(row => row.id)).size !== rows.length) {
      return fail('Leitura de OP contém registros repetidos.', { metodo: 'getApontamentosOp' });
    }
    const codigos = [...new Set(rows.map(row => normalizeCodigoProduto(row.cod_produto)).filter(Boolean))];
    if (!codigos.length) return ok(rows);
    const [produtosResult, origensResult, familiasResult] = await Promise.all([
      lerDicionarioDosCodigos(codigos),
      lerCompleto(TABLES.origem, 'id, descricao', 'id'),
      lerCompleto(TABLES.familia, 'id, descricao', 'id')
    ]);
    const masterError = produtosResult.error || origensResult.error || familiasResult.error;
    if (masterError) return fail('Falha ao enriquecer OP com o cadastro mestre.', { metodo: 'getApontamentosOp', tabela: TABLES.dicionario }, masterError);
    const productIndex = createProductMasterIndex(produtosResult.data || []);
    const origins = new Map((origensResult.data || []).map(row => [String(row.id), row.descricao]));
    const families = new Map((familiasResult.data || []).map(row => [String(row.id), row.descricao]));
    return ok(rows.map(row => {
      const resolved = resolveProductClassification(row, productIndex);
      return { ...row, classificacaoMestre: { status: resolved.status, origem: resolved.produto ? origins.get(String(resolved.produto.origem_id)) || null : null, familia: resolved.produto ? families.get(String(resolved.produto.familia_id)) || null : null } };
    }));
  }
};
