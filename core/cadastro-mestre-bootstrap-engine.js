// @ts-check
/* CAD-BOOTSTRAP-01: leitura e avaliação puras de evidências históricas. Sem I/O/admissão. */
import { normalizeCodigoProduto } from './spreadsheet-engine.js';
import { avaliarElegibilidadeCadastroMestre } from './cadastro-mestre-preview-engine.js';

const FONTES_PERSISTIDAS = new Set(['master', 'operacional', 'custos', 'op', 'mapa']);
const copiar = value => JSON.parse(JSON.stringify(value));

function codigoSeguro(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return '';
  if (typeof value === 'number' && !Number.isSafeInteger(value)) return '';
  return normalizeCodigoProduto(value);
}

function lista(value) { return Array.isArray(value) ? value : []; }

/**
 * Avalia uma identidade sem decidir admissão ou escrever qualquer destino.
 * `execucoes` só é individual quando traz a mesma identidade e `comprovada:true`;
 * contagens de lote devem ficar em `execucoes_agregadas` e não contam aqui.
 * @param {Record<string, unknown>} entrada
 */
export function avaliarBootstrapCadastroMestre(entrada = {}) {
  const codigo_produto = codigoSeguro(entrada.codigo_produto);
  if (!codigo_produto) {
    return { codigo_produto: null, identidade: 'INVALIDA', reconhecimento: 'INDETERMINADO',
      observacoes: [], elegibilidade: { status: 'INDETERMINADA', motivo: 'CODIGO_INVALIDO' },
      aprovacoes: [], execucoes: [], fatos: { custos: false, op: false }, conflitos: [],
      admissao_detalhado: { status: 'PENDENTE_DE_CONTRATO' }, evidencias: ['EVIDENCIA_INSUFICIENTE'] };
  }

  const fontes = /** @type {Record<string, unknown>} */ (entrada.fontes && typeof entrada.fontes === 'object' ? entrada.fontes : {});
  const reconhecida = [...FONTES_PERSISTIDAS].some(fonte => fontes[fonte] === true);
  const observacoes = lista(entrada.observacoes).filter(item => item && typeof item === 'object')
    .map(item => ({ fonte: String(item.fonte || 'NAO_INFORMADA'), arquivo: item.arquivo ?? null,
      linha: Number.isInteger(item.linha) ? item.linha : null, direta: item.direta !== false }))
    .sort((a, b) => `${a.fonte}/${a.arquivo ?? ''}/${a.linha ?? ''}`.localeCompare(`${b.fonte}/${b.arquivo ?? ''}/${b.linha ?? ''}`));
  const erp = /** @type {Record<string, unknown> | null} */ (entrada.erp && typeof entrada.erp === 'object' ? entrada.erp : null);
  const elegibilidade = erp
    ? { status: avaliarElegibilidadeCadastroMestre(erp).elegivel ? 'ELEGIVEL' : 'INELEGIVEL', ...avaliarElegibilidadeCadastroMestre(erp) }
    : { status: 'INDETERMINADA', motivo: 'SEM_LINHA_ERP_VERIFICAVEL' };
  const aprovacoes = lista(entrada.aprovacoes).filter(item => item && typeof item === 'object' && item.status === 'APROVADO' && typeof item.id === 'string' && item.id)
    .map(item => ({ id: item.id, lote: item.lote ?? null, categoria: item.categoria ?? null, direta: true }))
    .sort((a, b) => a.id.localeCompare(b.id));
  const execucoes = lista(entrada.execucoes).filter(item => item && typeof item === 'object'
    && item.comprovada === true && codigoSeguro(item.codigo_produto) === codigo_produto)
    .map(item => ({ id: item.id ?? null, lote: item.lote ?? null, operacao: item.operacao ?? null, direta: true }))
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const conflitos = lista(entrada.conflitos).filter(Boolean).map(String).sort();
  const evidencias = new Set();
  if (reconhecida) evidencias.add('PRESENCA_HISTORICA_COMPROVADA');
  if (observacoes.length) evidencias.add('OBSERVACAO_ERP_COMPROVADA');
  if (elegibilidade.status === 'ELEGIVEL' || elegibilidade.status === 'INELEGIVEL') evidencias.add('ELEGIBILIDADE_COMPROVADA');
  if (aprovacoes.length) evidencias.add('APROVACAO_INDIVIDUAL_COMPROVADA');
  if (execucoes.length) evidencias.add('EXECUCAO_COMPROVADA');
  if (fontes.custos === true) evidencias.add('FATO_CUSTOS_EXISTENTE');
  if (fontes.op === true) evidencias.add('EVENTO_OP_EXISTENTE');
  if (conflitos.length) evidencias.add('CONFLITO_DE_EVIDENCIAS');
  if (!evidencias.size || (!reconhecida && !observacoes.length)) evidencias.add('EVIDENCIA_INSUFICIENTE');
  return {
    codigo_produto, identidade: 'VALIDA', reconhecimento: reconhecida ? 'RECONHECIDA' : 'NAO_RECONHECIDA',
    observacoes, elegibilidade, aprovacoes, execucoes,
    execucoes_agregadas: lista(entrada.execucoes_agregadas).map(copiar),
    fatos: { custos: fontes.custos === true, op: fontes.op === true }, conflitos,
    // A Etapa 5 não define o contrato de suficiência para admissão.
    admissao_detalhado: { status: 'PENDENTE_DE_CONTRATO' }, evidencias: [...evidencias].sort()
  };
}

/** @param {Record<string, unknown>[]} entradas */
export function criarRelatorioBootstrapCadastroMestre(entradas = []) {
  if (!Array.isArray(entradas)) throw new Error('A lista de identidades é obrigatória.');
  const identidades = entradas.map(avaliarBootstrapCadastroMestre)
    .sort((a, b) => String(a.codigo_produto).localeCompare(String(b.codigo_produto)));
  const total = predicado => identidades.filter(predicado).length;
  return { versao_contrato: 'CAD_BOOTSTRAP_EVIDENCIAS_V1', somente_diagnostico: true, identidades,
    resumo: { total_identidades: identidades.length, reconhecidas: total(i => i.reconhecimento === 'RECONHECIDA'),
      elegiveis: total(i => i.elegibilidade.status === 'ELEGIVEL'), inelegiveis: total(i => i.elegibilidade.status === 'INELEGIVEL'),
      elegibilidade_indeterminada: total(i => i.elegibilidade.status === 'INDETERMINADA'),
      aprovacoes_individuais: total(i => i.aprovacoes.length > 0), execucoes_individuais: total(i => i.execucoes.length > 0),
      presenca_historica: total(i => i.evidencias.includes('PRESENCA_HISTORICA_COMPROVADA')),
      fatos_custos: total(i => i.fatos.custos), eventos_op: total(i => i.fatos.op),
      conflitos: total(i => i.conflitos.length > 0), evidencia_insuficiente: total(i => i.evidencias.includes('EVIDENCIA_INSUFICIENTE')),
      admissao_pendente: identidades.length } };
}
