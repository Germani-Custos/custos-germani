// @ts-check
/* Catálogo ERP puro: código exato identifica; descrição nunca resolve identidade. */
import { textoCadastro } from './cadastro-mestre-preview-engine.js';

const comparar = (a, b) => a < b ? -1 : a > b ? 1 : 0;

export function proporCatalogoFamiliasCadastroMestre(linhas, produtos, categorias) {
  const universo = new Map();
  for (const produto of produtos) {
    const codigo = textoCadastro(produto.calculado.familia_cod);
    if (codigo === null) continue;
    if (!universo.has(codigo)) universo.set(codigo, []);
    universo.get(codigo).push(produto.codigo_produto);
  }
  const descricoes = new Map();
  // Ocorrências fora dos filtros também detectam conflito, mas nunca ampliam o universo.
  for (const linha of linhas) {
    const codigo = textoCadastro(linha.familia_cod);
    if (!universo.has(codigo)) continue;
    const descricao = textoCadastro(linha.familia_descricao_erp);
    if (descricao === null) continue;
    if (!descricoes.has(codigo)) descricoes.set(codigo, new Set());
    descricoes.get(codigo).add(descricao);
  }
  const familias = [...universo].sort(([a], [b]) => comparar(a, b)).map(([codigo, produtos]) => {
    const encontrados = categorias.filter(c => textoCadastro(c.codigo) === codigo);
    const rotulos = [...(descricoes.get(codigo) || [])].sort(comparar);
    const atual = encontrados.length === 1 ? { ...encontrados[0] } : null;
    const descricao = rotulos.length === 1 ? rotulos[0] : null;
    const status = encontrados.length > 1 ? 'CATALOGO_AMBIGUO' : rotulos.length > 1 ? 'CONFLITO'
      : descricao === null ? 'DESCRICAO_VAZIA' : !atual ? 'NOVA_FAMILIA'
        : textoCadastro(atual.descricao) === descricao ? 'EXISTENTE_SEM_ALTERACAO' : 'ALTERACAO_DESCRICAO';
    return { codigo, descricao_erp: descricao, descricoes_erp: rotulos, atual, status,
      produtos: [...produtos].sort(comparar), quantidade_produtos: produtos.length };
  });
  const total = status => familias.filter(f => f.status === status).length;
  return { familias, resumo: { total: familias.length, existentes_sem_alteracao: total('EXISTENTE_SEM_ALTERACAO'),
    novas: total('NOVA_FAMILIA'), atualizacoes: total('ALTERACAO_DESCRICAO'),
    conflitos: total('CONFLITO'), ambiguas: total('CATALOGO_AMBIGUO'), sem_descricao: total('DESCRICAO_VAZIA'),
    produtos_impactados_novas: familias.filter(f => f.status === 'NOVA_FAMILIA').reduce((n, f) => n + f.quantidade_produtos, 0) } };
}
