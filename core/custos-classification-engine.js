// @ts-check
/* Projeção analítica de Custos em memória. Não altera fatos nem cadastros. */
import { normalizeCodigoProduto } from './spreadsheet-engine.js';
import { resolverCodigoExato } from './cadastro-mestre-preview-engine.js';

/** Master presente é autoridade inclusive para campos vazios/sem resolução.
 * Fallback operacional somente para códigos ausentes do Master.
 * Agrupamento e descrição continuam operacionais; nenhum campo ERP de agrupamento é lido.
 */
export function classificarCustos(rows, operacional, contexto) {
  const master = new Map();
  for (const produto of contexto.produtos) {
    const codigo = normalizeCodigoProduto(produto.codigo_produto);
    if (!codigo || master.has(codigo)) throw new Error('Identidade inválida ou duplicada no Master ERP para Custos.');
    master.set(codigo, produto);
  }
  const operacionais = new Map(operacional.map(p => [normalizeCodigoProduto(p.codigo_produto), p]));
  const resolverId = (valor, catalogo) => {
    const resolucao = resolverCodigoExato(valor, catalogo);
    return resolucao.status === 'RESOLVIDO' ? resolucao.correspondencias[0].id : null;
  };
  // Resolve cada produto uma vez por carga, mesmo com múltiplas competências.
  const classificacoes = new Map();
  return rows.map(row => {
    const codigo = normalizeCodigoProduto(row.codigo_produto);
    if (!classificacoes.has(codigo)) {
      const op = operacionais.get(codigo);
      const erp = master.get(codigo);
      classificacoes.set(codigo, {
        origem_id: erp ? resolverId(erp.origem_cod, contexto.origens) : op?.origem_id ?? null,
        familia_id: erp ? resolverId(erp.familia_cod, contexto.familias) : op?.familia_id ?? null,
        agrupamento_cod: op?.agrupamento_cod ?? null,
        descricao: op?.descricao || null
      });
    }
    const classificacao = classificacoes.get(codigo);
    return { ...row, ...classificacao, descricao: classificacao.descricao || row.descricao || null };
  });
}
