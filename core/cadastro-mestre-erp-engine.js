// @ts-check
/* Modelo puro de consulta ERP. Não filtra o universo oficial nem projeta classificação operacional. */
import { normalizeCodigoProduto, normalizeText } from './spreadsheet-engine.js';
import { resolverCodigoExato, textoCadastro } from './cadastro-mestre-preview-engine.js';

export const CADASTRO_MESTRE_ERP_PAGE_SIZE = 50;

function categoria(value, categorias) {
  const resolucao = resolverCodigoExato(value, categorias);
  if (resolucao.status === 'NAO_INFORMADO') return { codigo: null, label: 'Não informada' };
  const codigo = resolucao.codigo;
  if (resolucao.status !== 'RESOLVIDO') return { codigo, label: `${codigo} — ${resolucao.status === 'AMBIGUO' ? 'Código ambíguo' : 'Sem correspondência no catálogo'}` };
  const registro = categorias.find(item => textoCadastro(item.codigo) === codigo);
  return { codigo, label: `${codigo} — ${textoCadastro(registro.descricao) || 'Sem descrição no catálogo'}` };
}

export function prepararConsultaCadastroMestreErp(contexto) {
  if (!contexto || !['produtos', 'origens', 'familias'].every(key => Array.isArray(contexto[key]))) throw new Error('Consulta ERP exige contexto completo.');
  const codigos = new Set();
  const produtos = contexto.produtos.map(produto => {
    const codigo = normalizeCodigoProduto(produto.codigo_produto);
    if (!codigo || codigos.has(codigo)) throw new Error('Código inválido ou duplicado na consulta do Master ERP.');
    codigos.add(codigo);
    return { codigo_produto: codigo, descricao: textoCadastro(produto.descricao),
      origem: categoria(produto.origem_cod, contexto.origens), familia: categoria(produto.familia_cod, contexto.familias),
      agrupamento_erp_valor: textoCadastro(produto.agrupamento_erp_valor),
      agrupamento_comercial_erp_cod: textoCadastro(produto.agrupamento_comercial_erp_cod),
      agrupamento_comercial_erp_descricao: textoCadastro(produto.agrupamento_comercial_erp_descricao) };
  }).sort((a, b) => a.codigo_produto < b.codigo_produto ? -1 : a.codigo_produto > b.codigo_produto ? 1 : 0);
  const opcoes = campo => [...new Map(produtos.filter(p => p[campo].codigo !== null)
    .map(p => [p[campo].codigo, { value: p[campo].codigo, label: p[campo].label }])).values()]
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  return { produtos, origens: opcoes('origem'), familias: opcoes('familia') };
}

export function consultarCadastroMestreErp(produtos, filtros = {}, pagina = 1) {
  const busca = normalizeText(filtros.busca || '');
  const encontrados = produtos.filter(p => (!busca || normalizeText(`${p.codigo_produto} ${p.descricao || ''}`).includes(busca)) &&
    (!filtros.origem || p.origem.codigo === filtros.origem) && (!filtros.familia || p.familia.codigo === filtros.familia));
  const paginas = Math.max(1, Math.ceil(encontrados.length / CADASTRO_MESTRE_ERP_PAGE_SIZE));
  const atual = Math.min(paginas, Math.max(1, Number.isSafeInteger(pagina) ? pagina : 1));
  const inicio = (atual - 1) * CADASTRO_MESTRE_ERP_PAGE_SIZE;
  return { produtos: encontrados.slice(inicio, inicio + CADASTRO_MESTRE_ERP_PAGE_SIZE),
    total: encontrados.length, pagina: atual, paginas, inicio: encontrados.length ? inicio + 1 : 0,
    fim: Math.min(inicio + CADASTRO_MESTRE_ERP_PAGE_SIZE, encontrados.length) };
}
