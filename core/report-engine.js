// @ts-check
/* Responsabilidade: cálculos analíticos e lógica de cascata (Origem -> Família -> Agrupamento -> Item). */

/**
 * Tipos para melhorar checkJs e IntelliSense sem alterar comportamento.
 * Apenas typedefs JSDoc; não há efeitos em runtime.
 *
 * @typedef {Object} MasterItem
 * @property {string} [codigo_produto]
 * @property {string} [descricao]
 * @property {string} [produto]
 * @property {string} [nome]
 * @property {string} [codigo]
 * @property {string} [id]
 * @property {string} [origem_id]
 * @property {string} [familia_id]
 * @property {string} [agrupamento_cod]
 */

/**
 * @typedef {Object} Masters
 * @property {Array<MasterItem>} [hierarquia]
 * @property {Array<MasterItem>} [dicionario]
 * @property {Array<MasterItem>} [produtos]
 * @property {Array<MasterItem>} [familias]
 * @property {Array<MasterItem>} [agrupamentos]
 * @property {Array<MasterItem>} [origens]
 */

/**
 * @typedef {Object} HistoricoRow
 * @property {string} codigo_produto
 * @property {string} [descricao]
 * @property {number} [custo_total]
 * @property {number} [custo_variavel]
 * @property {number} [custo_direto_fixo]
 * @property {string} [data_referencia]
 * @property {string} [criado_em]
 */

/**
 * @typedef {Object} ReportRow
 * @property {string} codigo
 * @property {string} descricao
 * @property {number|null} ultimoCusto
 * @property {number|null} penultimoCusto
 * @property {number|null} diferenca
 * @property {number|null} variacaoTemporal
 * @property {string|null} ultimaAtualizacao
 * @property {string|null} dataCompetencia
 * @property {number} inicial
 * @property {number} final
 * @property {number} variacao
 * @property {number} scoreInstabilidade
 * @property {string} classificacaoInstabilidade
 * @property {boolean} alert
 * @property {boolean} mudouRegime
 * @property {string|null} motivoAlerta
 */

import { normalizeCodigoProduto } from './spreadsheet-engine.js';
import { debugLog } from '../src/config/app-config.js';

const ALERTA_CRITICO_CONFIG = Object.freeze({
  thresholdPercent: 5,
  comparison: 'absolute_greater_or_equal',
  basis: 'variacaoTemporal',
  temporalAxis: 'criado_em'
});
const LIMIAR_ESTAVEL = 3;
const LIMIAR_OSCILANDO = 8;
const MIN_PONTOS_REGIME = 4;

/**
 * Preenche um select usando APIs DOM em vez de innerHTML para reduzir superfície de XSS.
 * @param {HTMLSelectElement} select
 * @param {Array<{value: unknown, label: unknown}>} options
 * @param {{value: unknown, label: unknown}} first
 * @param {unknown} [selectedValue]
 * @returns {void}
 */
export function fillSelect(select, options, first, selectedValue = null) {
  const createOption = (value, label) => {
    const option = document.createElement('option');
    option.value = String(value ?? '');
    option.textContent = String(label ?? '');
    return option;
  };

  const safeOptions = [createOption(first.value, first.label)];
  options
    .filter(opt => !isNullLike(opt?.value) && !isNullLike(opt?.label))
    .forEach(opt => {
      safeOptions.push(createOption(opt.value, opt.label));
    });

  select.replaceChildren(...safeOptions);

  if (selectedValue !== null) {
    const hasOption = [first.value, ...options.map(opt => opt.value)].includes(String(selectedValue));
    select.value = hasOption ? String(selectedValue) : String(first.value);
  }
}


function assertValidAlertThreshold() {
  if (!Number.isFinite(ALERTA_CRITICO_CONFIG.thresholdPercent) || ALERTA_CRITICO_CONFIG.thresholdPercent <= 0) {
    debugLog('LOG-01 threshold de alerta inválido', { threshold: ALERTA_CRITICO_CONFIG.thresholdPercent });
    throw new Error('Configuração operacional inválida: limiar de alerta crítico.');
  }
}

function extractAlertPercentual(input) {
  if (typeof input === 'number') return { value: input, field: 'number' };
  if (!input || typeof input !== 'object') {
    throw new Error('Payload de alerta crítico inválido: objeto ausente.');
  }

  if (Object.prototype.hasOwnProperty.call(input, 'variacaoTemporal')) {
    return { value: input.variacaoTemporal, field: 'variacaoTemporal' };
  }
  if (Object.prototype.hasOwnProperty.call(input, 'deltaPerc')) {
    return { value: input.deltaPerc, field: 'deltaPerc' };
  }
  if (Object.prototype.hasOwnProperty.call(input, 'variacaoPercentual')) {
    return { value: input.variacaoPercentual, field: 'variacaoPercentual' };
  }

  debugLog('LOG-01 payload de alerta sem percentual canônico', {
    keys: Object.keys(input).slice(0, 12),
    codigo: input.codigo || input.codigo_produto || null
  });
  throw new Error('Payload de alerta crítico inválido: percentual canônico ausente.');
}

/**
 * Expõe a configuração canônica do limiar de alerta investigativo (LOG-01).
 * @returns {{thresholdPercent:number, comparison:string, basis:string, temporalAxis:string}}
 */
export function getAlertaCriticoConfig() {
  return ALERTA_CRITICO_CONFIG;
}

/**
 * Classifica o alerta operacional canônico LOG-01.
 * @param {number|Record<string, unknown>} input
 * @returns {{isAlert:boolean, thresholdPercent:number, percentual:number|null, field:string, reason:string}}
 */
export function classifyAlert(input) {
  assertValidAlertThreshold();
  const { value, field } = extractAlertPercentual(input);

  if (value === null) {
    return { isAlert: false, thresholdPercent: ALERTA_CRITICO_CONFIG.thresholdPercent, percentual: null, field, reason: 'sem_comparativo' };
  }

  if (value === undefined) {
    debugLog('LOG-01 percentual de alerta indefinido', { field, codigo: typeof input === 'object' && input ? (input.codigo || input.codigo_produto || null) : null });
    throw new Error(`Cálculo crítico ausente para alerta: ${field}.`);
  }

  const percentual = Number(value);
  if (!Number.isFinite(percentual)) {
    debugLog('LOG-01 percentual de alerta não numérico', { field, value, codigo: typeof input === 'object' && input ? (input.codigo || input.codigo_produto || null) : null });
    throw new Error(`Cálculo crítico inválido para alerta: ${field}.`);
  }

  return {
    isAlert: Math.abs(percentual) >= ALERTA_CRITICO_CONFIG.thresholdPercent,
    thresholdPercent: ALERTA_CRITICO_CONFIG.thresholdPercent,
    percentual,
    field,
    reason: Math.abs(percentual) >= ALERTA_CRITICO_CONFIG.thresholdPercent ? 'variacao_absoluta_critica' : 'abaixo_do_limiar'
  };
}

/**
 * Atalho booleano para `classifyAlert().isAlert`.
 * @param {number|Record<string, unknown>} input
 * @returns {boolean}
 */
export function isAlertaCritico(input) {
  return classifyAlert(input).isAlert;
}

/**
 * Filtra linhas da fila investigativa que atendem ao critério canônico de alerta (>5%).
 * @param {Array<ReportRow>} rows
 * @param {{operation?: string}} [context]
 * @returns {Array<ReportRow>}
 */
export function filterAlertRows(rows, context = {}) {
  return (rows || []).filter(row => {
    const computed = classifyAlert(row).isAlert;
    if (Object.prototype.hasOwnProperty.call(row, 'alert') && row.alert !== computed) {
      debugLog('LOG-01 divergência de alerta crítico', {
        operation: context.operation || 'filtro de alerta',
        codigo: row.codigo || row.codigo_produto || null,
        alertPersistido: row.alert,
        alertCalculado: computed,
        variacaoTemporal: row.variacaoTemporal
      });
      throw new Error('Divergência operacional no cálculo de alertas críticos.');
    }
    return computed;
  });
}

function isNullLike(value) {
  if (value === null || value === undefined) return true;
  const normalized = String(value).trim().toLowerCase();
  return !normalized || normalized === 'null' || normalized === 'undefined';
}

function calcInstabilityScore(items) {
  const variacoes = [];
  for (let i = 1; i < items.length; i += 1) {
    const antigo = Number(items[i - 1]?.custo_total || 0);
    const novo = Number(items[i]?.custo_total || 0);
    if (!Number.isFinite(antigo) || !Number.isFinite(novo) || antigo <= 0) continue;
    const v = Math.abs(((novo - antigo) / antigo) * 100);
    if (Number.isFinite(v)) variacoes.push(v);
  }
  return variacoes.length ? variacoes.reduce((a, b) => a + b, 0) / variacoes.length : 0;
}

function classifyInstability(score) {
  if (score < LIMIAR_ESTAVEL) return 'ESTÁVEL';
  if (score < LIMIAR_OSCILANDO) return 'OSCILANDO';
  return 'MUITO INSTÁVEL';
}

// PERF-03: cache de cascata — evita recalcular quando estado não mudou
let _cascadeCache = null;
let _cascadeCacheKey = '';

function getCascadeCacheKey(state, masters) {
  return `${state.origem}|${state.familia}|${state.agrupamento}|${(masters.hierarquia || []).length}`;
}

/**
 * Calcula opções de cascata (familias, agrupamentos, produtos) a partir do estado e masters fornecidos.
 * @param {{origem:string, familia:string, agrupamento:string}} state
 * @param {Masters} masters
 * @returns {{familyOptions:Array<{value:string,label:string}>, groupOptions:Array<{value:string,label:string}>, productOptions:Array<{value:string,label:string}>}}
 */
export function calculateCascadeOptions(state, masters) {
  const cacheKey = getCascadeCacheKey(state, masters);
  if (_cascadeCache && _cascadeCacheKey === cacheKey) return _cascadeCache;

  const hierarchySource = (masters.hierarquia || []).length ? masters.hierarquia : (masters.dicionario || []);
  const dictionary = hierarchySource.map(item => ({
    ...item,
    codigo_produto: normalizeCodigoProduto(item?.codigo_produto ?? item?.produto ?? item?.codigo),
    descricao: item?.descricao ?? item?.nome ?? item?.produto_descricao ?? null
  }))
    .filter(item => !isNullLike(item?.codigo_produto));

  const byOrigem = dictionary.filter(item =>
    state.origem === 'TODAS' || String(item.origem_id) === String(state.origem)
  );

  const familyIds = [...new Set(byOrigem
    .map(x => x?.familia_id)
    .filter(id => !isNullLike(id))
    .map(id => String(id).trim())
    .filter(id => !isNullLike(id)))];
  const familyOptions = familyIds.map(id => {
    const fam = masters.familias.find(f => String(f.id) === id);
    return { value: id, label: fam?.descricao };
  })
    .filter(item => !isNullLike(item.label))
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));

  const byFamilia = byOrigem.filter(item =>
    state.familia === 'TODAS' || String(item.familia_id) === String(state.familia)
  );

  const groupIds = [...new Set(byFamilia
    .map(x => x?.agrupamento_cod)
    .filter(id => !isNullLike(id))
    .map(id => String(id).trim())
    .filter(id => !isNullLike(id)))];
  const groupOptions = groupIds.map(id => {
    const grp = masters.agrupamentos.find(g => String(g.id) === id);
    return { value: id, label: grp?.descricao };
  })
    .filter(item => !isNullLike(item.label))
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));

  const allProducts = (masters.produtos || [])
    .map(item => ({
      codigo_produto: normalizeCodigoProduto(item?.codigo_produto),
      descricao: item?.descricao || '-'
    }))
    .filter(item => !isNullLike(item?.codigo_produto));

  const selectedAnyFilter = state.origem !== 'TODAS' || state.familia !== 'TODAS' || state.agrupamento !== 'TODOS';
  const productCodesByCascade = new Set(byFamilia
    .filter(item => state.agrupamento === 'TODOS' || String(item.agrupamento_cod) === String(state.agrupamento))
    .map(item => normalizeCodigoProduto(item?.codigo_produto))
    .filter(Boolean));
  const productBase = selectedAnyFilter
    ? allProducts.filter(item => productCodesByCascade.has(item.codigo_produto))
    : allProducts;

  const productMap = new Map();
  productBase.forEach(item => {
    if (!item.codigo_produto) return;
    const codigo = normalizeCodigoProduto(item.codigo_produto);
    if (!productMap.has(codigo)) {
      productMap.set(codigo, { value: codigo, label: `${codigo} - ${item.descricao || '-'}` });
    }
  });
  const productOptions = [...productMap.values()].sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));

  _cascadeCache = { familyOptions, groupOptions, productOptions };
  _cascadeCacheKey = cacheKey;
  return _cascadeCache;
}

/**
 * Agrupa histórico por produto e calcula linhas da fila investigativa.
 * `data_referencia` ordena a competência; `criado_em` identifica última/penúltima importação.
 * @param {Array<HistoricoRow>} historico
 * @param {Masters} [masters]
 * @returns {Array<ReportRow>}
 */
export function buildReportRows(historico, masters = { origens: [], familias: [], agrupamentos: [] }) {
  const grouped = {};
  historico.forEach(item => {
    const codigo = normalizeCodigoProduto(item?.codigo_produto);
    if (!codigo) return;
    if (!grouped[codigo]) grouped[codigo] = [];
    grouped[codigo].push({ ...item, codigo_produto: codigo });
  });

  return Object.values(grouped).map(items => {
    const byPeriodo = [...items].sort((a, b) => String(a.data_referencia || '').localeCompare(String(b.data_referencia || '')));
    const first = byPeriodo[0];
    const last = byPeriodo[byPeriodo.length - 1];
    const ini = Number(first?.custo_total || 0);
    const fim = Number(last?.custo_total || 0);
    const variacao = ini > 0 ? ((fim - ini) / ini) * 100 : 0;

    const byCriadoEm = [...items].sort((a, b) => String(b.criado_em || '').localeCompare(String(a.criado_em || '')));
    const ultimo = byCriadoEm[0] || null;
    const penultimo = byCriadoEm[1] || null;
    const ultimoCusto = Number(ultimo?.custo_total || 0);
    const penultimoCusto = Number(penultimo?.custo_total || 0);
    const diferenca = ultimo ? (ultimoCusto - penultimoCusto) : 0;
    const variacaoTemporal = penultimo && penultimoCusto > 0
      ? ((ultimoCusto - penultimoCusto) / penultimoCusto) * 100
      : null;
    const alertaImportacao = classifyAlert({ variacaoTemporal }).isAlert;

    const scoreInstabilidade = calcInstabilityScore(byPeriodo);
    const classificacaoInstabilidade = classifyInstability(scoreInstabilidade);

    // Detecção de mudança de regime: produto que era ESTÁVEL e ficou instável
    let mudouRegime = false;
    if (byPeriodo.length >= MIN_PONTOS_REGIME) {
      const mid = Math.floor(byPeriodo.length / 2);
      const scoreInicio = calcInstabilityScore(byPeriodo.slice(0, mid + 1));
      const scoreFim = calcInstabilityScore(byPeriodo.slice(mid));
      mudouRegime = classifyInstability(scoreInicio) === 'ESTÁVEL' && classifyInstability(scoreFim) !== 'ESTÁVEL';
    }

    return {
      codigo: first.codigo_produto,
      descricao: last.descricao || '-',
      ultimoCusto: ultimo ? ultimoCusto : null,
      penultimoCusto: penultimo ? penultimoCusto : null,
      diferenca: ultimo ? diferenca : null,
      variacaoTemporal: ultimo ? variacaoTemporal : null,
      ultimaAtualizacao: ultimo?.criado_em || null,
      dataCompetencia: ultimo?.data_referencia || null,
      inicial: ini,
      final: fim,
      variacao,
      scoreInstabilidade,
      classificacaoInstabilidade,
      alert: alertaImportacao,
      mudouRegime,
      motivoAlerta: alertaImportacao
        ? `Variação de ${Math.abs(variacaoTemporal).toFixed(2)}% entre as duas últimas importações`
        : null
    };
  });
}

/**
 * Calcula KPIs agregados da fila investigativa a partir de linhas de relatório.
 * @param {Array<ReportRow>} rows
 * @returns {{totalItens:number, totalAlertas:number, mediaVariacao:number, mudancasRegime:number}}
 */
export function calculateKpis(rows) {
  const totalItens = rows.length;
  const totalAlertas = filterAlertRows(rows, { operation: 'KPI Alertas (>5%)' }).length;
  const mudancasRegime = rows.filter(r => r.mudouRegime).length;
  const mediaVariacao = totalItens ? rows.reduce((acc, cur) => acc + cur.variacao, 0) / totalItens : 0;
  return { totalItens, totalAlertas, mediaVariacao, mudancasRegime };
}
