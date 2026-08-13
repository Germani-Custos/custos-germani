// @ts-check
/* Fonte pura de resolução do cadastro mestre de produtos. Não acessa DOM/API. */
import { normalizeCodigoProduto } from './spreadsheet-engine.js';

const ERP_MASTER_FIELDS = ['descricao', 'origem_id', 'familia_id'];

function hasValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== '';
}

function cleanText(value) {
  return hasValue(value) ? String(value).trim() : null;
}

/** @param {Array<Record<string, unknown>>} produtos */
export function createProductMasterIndex(produtos = []) {
  const index = new Map();
  (produtos || []).forEach(produto => {
    const codigo = normalizeCodigoProduto(produto?.codigo_produto);
    if (codigo && !index.has(codigo)) index.set(codigo, { ...produto, codigo_produto: codigo });
  });
  return index;
}

/** @param {Record<string, unknown>} produto */
export function getProductClassificationStatus(produto) {
  if (!produto) return 'ausente';
  return produto.origem_id && produto.familia_id ? 'classificado' : 'sem_classificacao';
}

/** @param {Record<string, unknown>} row @param {Map<string, Record<string, unknown>>} index */
export function resolveProductClassification(row, index) {
  const codigo = normalizeCodigoProduto(row?.cod_produto ?? row?.codigo_produto);
  const produto = codigo ? index.get(codigo) : null;
  return { codigo_produto: codigo, produto: produto || null, status: getProductClassificationStatus(produto) };
}

/**
 * Localiza uma coluna do XLSM sem depender de todas as colunas ERP nele.
 * @param {Array<Record<string, unknown>>} rows
 */
export function detectProductMasterColumns(rows = []) {
  const headers = [...new Set((rows || []).flatMap(row => Object.keys(row || {})))];
  const normalized = new Map(headers.map(header => [String(header).normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase(), header]));
  const find = (...names) => names.map(name => normalized.get(name)).find(Boolean) || null;
  return {
    codigo_produto: find('produto', 'codigo produto', 'cod produto', 'codigo', 'cod'),
    descricao: find('descricao', 'descrição', 'desc'),
    origem: find('origem'),
    familia: find('familia', 'família')
  };
}

/**
 * Resolve valores oficiais do ERP para IDs já cadastrados, sem inferir novos.
 * @param {unknown} value @param {Array<Record<string, unknown>>} categories
 */
export function resolveCategoryId(value, categories = []) {
  const text = cleanText(value);
  if (!text) return null;
  const normalized = text.toLocaleLowerCase('pt-BR');
  const match = (categories || []).find(item =>
    String(item?.id ?? '') === text ||
    String(item?.codigo ?? '').toLocaleLowerCase('pt-BR') === normalized ||
    String(item?.descricao ?? '').toLocaleLowerCase('pt-BR') === normalized
  );
  return match?.id ?? null;
}

/**
 * Reconcilia o XLSM oficial incrementalmente. Vazio nunca remove dados e
 * `agrupamento_cod` não entra no XLSM: é administrado manualmente pelo Kustos.
 * @param {Array<Record<string, unknown>>} rows
 * @param {{ produtos?: Array<Record<string, unknown>>, origens?: Array<Record<string, unknown>>, familias?: Array<Record<string, unknown>> }} masters
 */
export function reconcileProductMasterImport(rows = [], masters = {}) {
  const columns = detectProductMasterColumns(rows);
  const existing = createProductMasterIndex(masters.produtos || []);
  const invalidRows = [];
  const unresolvedCategories = [];
  const byCode = new Map();

  if (!columns.codigo_produto) return { rows: [], invalidRows: [{ linha: null, motivo: 'Coluna Produto não encontrada.' }], unresolvedCategories: [], columns };

  (rows || []).forEach((row, index) => {
    const codigo = normalizeCodigoProduto(row?.[columns.codigo_produto]);
    if (!codigo) {
      invalidRows.push({ linha: index + 2, motivo: 'Produto inválido ou vazio.' });
      return;
    }
    const current = existing.get(codigo) || { codigo_produto: codigo };
    const next = { ...current, codigo_produto: codigo };
    const descricao = columns.descricao ? cleanText(row?.[columns.descricao]) : null;
    if (descricao) next.descricao = descricao;

    const categoryMappings = [
      { source: 'origem', target: 'origem_id', categories: masters.origens || [] },
      { source: 'familia', target: 'familia_id', categories: masters.familias || [] }
    ];
    categoryMappings.forEach(({ source, target, categories }) => {
      const raw = columns[source] ? cleanText(row?.[columns[source]]) : null;
      if (!raw) return;
      const resolved = resolveCategoryId(raw, categories);
      if (resolved) next[target] = resolved;
      else unresolvedCategories.push({ linha: index + 2, campo: source, valor: raw, codigo_produto: codigo });
    });
    byCode.set(codigo, next);
  });

  return { rows: [...byCode.values()], invalidRows, unresolvedCategories, columns };
}

/** Retorna somente campos persistíveis e preserva agrupamento Kustos existente. */
export function buildProductMasterPayload(product = {}) {
  const payload = { codigo_produto: normalizeCodigoProduto(product.codigo_produto) };
  ERP_MASTER_FIELDS.forEach(field => { if (hasValue(product[field])) payload[field] = cleanText(product[field]); });
  if (hasValue(product.agrupamento_cod)) payload.agrupamento_cod = cleanText(product.agrupamento_cod);
  return payload;
}
