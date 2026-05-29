/* Responsabilidade: utilitários de normalização de código de produto.
 *
 * ATENÇÃO — REGRA CENTRAL DO SISTEMA (NÃO VIOLAR):
 * Este módulo NÃO deve inferir categorias por descrição, palavras-chave ou
 * qualquer heurística baseada em texto. Categorização é responsabilidade
 * exclusiva do dicionario_produtos (fonte de verdade).
 *
 * Ref: MNT-04, AGENTS.md — "NUNCA misturar lógica temporal com categorização"
 *
 * Funções removidas (violavam a regra acima):
 * - suggestCategory: inferia origem/família por palavras-chave da descrição
 * - splitImportRows: usava suggestCategory para auto-categorizar produtos novos
 * - GERMANI_RULES / KEYWORDS: regras hardcoded de classificação por texto
 *
 * Se auto-sugestão for reativada no futuro, deve ser:
 * 1. Baseada em código de produto (prefixo numérico), nunca em texto livre
 * 2. Apresentada como sugestão editável, nunca gravada automaticamente
 * 3. Aprovada explicitamente antes de atualizar o dicionario_produtos
 */

/**
 * Normaliza código de produto: remove espaços, converte notação científica.
 * Usado em todo o pipeline de importação e comparação de chaves.
 * @param {*} value
 * @returns {string}
 */
export function normalizeProductCode(value) {
  const raw = String(value || '').trim().replace(',', '.');
  if (!raw) return '';

  if (/^\d+(\.\d+)?e[+-]?\d+$/i.test(raw)) {
    const num = Number(raw);
    if (Number.isFinite(num)) return num.toLocaleString('fullwide', { useGrouping: false });
  }

  return raw.replace(/\s+/g, '');
}
