// @ts-check
/* CAD-PREVIEW-01: cálculo puro. Não gera payload de escrita nem classificação operacional. */
import { normalizeCodigoProduto } from './spreadsheet-engine.js';

/** @typedef {Record<string, unknown>} Registro */
/** @typedef {{ produtos: Registro[], origens: Registro[], familias: Registro[] }} ContextoPreview */

export const CAMPOS_CADASTRO_MESTRE = Object.freeze([
  'descricao', 'origem_cod', 'familia_cod', 'agrupamento_erp_valor'
]);

/** Normalização técnica; caixa, zeros textuais e espaços internos permanecem. */
export function textoCadastro(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string' && typeof value !== 'number') throw new Error('Valor ERP não escalar.');
  if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('Número ERP inválido.');
  return String(value).trim() || null;
}

/** Código EXATO, nunca id/descrição. Duplicidade de categoria não escolhe um vencedor. */
export function resolverCodigoExato(value, categorias) {
  const codigo = textoCadastro(value);
  if (codigo === null) return { codigo, status: 'NAO_INFORMADO', correspondencias: [] };
  const matches = categorias.filter(item => textoCadastro(item.codigo) === codigo);
  return {
    codigo,
    status: matches.length === 1 ? 'RESOLVIDO' : matches.length > 1 ? 'AMBIGUO' : 'PENDENTE',
    correspondencias: matches.map(item => ({ codigo: textoCadastro(item.codigo), id: item.id ?? null }))
  };
}

function codigoSeguro(value) {
  if (typeof value === 'number' && !Number.isSafeInteger(value)) return '';
  if (typeof value !== 'string' && typeof value !== 'number') return '';
  return normalizeCodigoProduto(value);
}

function motivoFiltro(row) {
  const tipo = (textoCadastro(row.tipo) || '').toUpperCase();
  if (tipo !== 'P' && tipo !== 'C') return 'TIPO_NAO_AUTORIZADO';
  if (!/produzido|revenda/i.test(textoCadastro(row.descr_origem) || '')) return 'ORIGEM_NAO_AUTORIZADA';
  if (/inativo|exluir/i.test(textoCadastro(row.descricao) || '')) return 'DESCRICAO_EXCLUIDA';
  return null;
}

/**
 * Recebe linhas com nomes canônicos, vindas do adaptador. Contexto é obrigatório:
 * uma leitura falha/incompleta nunca deve ser confundida com mestre vazio.
 * @param {Registro[]} linhas
 * @param {ContextoPreview} contexto
 */
export function criarPreviewCadastroMestre(linhas, contexto) {
  if (!Array.isArray(linhas) || !contexto || !['produtos', 'origens', 'familias'].every(key => Array.isArray(contexto[key]))) {
    throw new Error('Linhas e contexto completo do Cadastro Mestre são obrigatórios.');
  }
  const master = new Map();
  contexto.produtos.forEach(produto => {
    const codigo = codigoSeguro(produto.codigo_produto);
    if (!codigo || master.has(codigo)) throw new Error('Identidade inválida ou duplicada no Cadastro Mestre.');
    master.set(codigo, produto);
  });
  const presentes = new Set();
  const candidatos = new Map();
  const ocorrencias = new Map();
  const excluidos = [];
  const erros = [];
  let aposFiltros = 0;
  linhas.forEach((row, index) => {
    const linha = Number(row.linha ?? index + 2);
    const codigo = codigoSeguro(row.codigo_produto);
    // Presença física no arquivo, inclusive linhas filtradas: não simula uma ausência.
    if (codigo) {
      presentes.add(codigo);
      ocorrencias.set(codigo, [...(ocorrencias.get(codigo) || []), linha]);
    }
    try {
      const motivo = motivoFiltro(row);
      if (motivo) {
        excluidos.push({ linha, codigo_produto: codigo || null, motivo, preserva_master: master.has(codigo) });
        return;
      }
      aposFiltros++;
      if (!codigo) throw new Error('Código de produto inválido, vazio ou numericamente impreciso.');
      const recebido = Object.fromEntries(CAMPOS_CADASTRO_MESTRE
        .filter(campo => Object.hasOwn(row, campo))
        .map(campo => [campo, textoCadastro(row[campo])]));
      candidatos.set(codigo, { linha, recebido });
    } catch (error) {
      erros.push({ linha, codigo_produto: codigo || null, motivo: String(error.message) });
    }
  });
  // Não existe last-wins, mesmo que outra ocorrência do código tenha sido filtrada.
  ocorrencias.forEach((numeros, codigo) => {
    if (numeros.length > 1) {
      candidatos.delete(codigo);
      erros.push({ linha: numeros[0], codigo_produto: codigo, motivo: `Código duplicado no arquivo: linhas ${numeros.join(', ')}.` });
    }
  });

  const produtos = [];
  candidatos.forEach(({ linha, recebido }, codigo) => {
    const current = master.get(codigo);
    const atual = current ? { ...current } : null;
    const calculado = { codigo_produto: codigo };
    const diferencas = CAMPOS_CADASTRO_MESTRE.map(campo => {
      const valorAtual = textoCadastro(current?.[campo]);
      const fornecido = Object.hasOwn(recebido, campo);
      const valorRecebido = fornecido ? recebido[campo] : null;
      const proposto = valorRecebido ?? valorAtual;
      calculado[campo] = proposto;
      const tipo = !fornecido ? 'CAMPO_NAO_FORNECIDO'
        : current && valorRecebido === null ? 'CAMPO_VAZIO_PRESERVA_EXISTENTE'
          : !current ? 'NOVO_PRODUTO'
            : valorRecebido !== valorAtual ? 'ALTERACAO_POTENCIAL' : 'SEM_ALTERACAO';
      return { campo, atual: valorAtual, recebido: valorRecebido, fornecido, proposto, tipo };
    });
    const alteracoes = diferencas.filter(item => item.tipo === 'ALTERACAO_POTENCIAL');
    produtos.push({
      codigo_produto: codigo, linha, atual, recebido: { ...recebido }, calculado, diferencas,
      tipo: !current ? 'NOVO_PRODUTO' : alteracoes.length ? 'ALTERACAO_POTENCIAL' : 'SEM_ALTERACAO',
      origem: { recebido: resolverCodigoExato(recebido.origem_cod, contexto.origens), efetivo: resolverCodigoExato(calculado.origem_cod, contexto.origens) },
      familia: { recebido: resolverCodigoExato(recebido.familia_cod, contexto.familias), efetivo: resolverCodigoExato(calculado.familia_cod, contexto.familias) },
      agrupamento: { recebido: recebido.agrupamento_erp_valor ?? null, status: recebido.agrupamento_erp_valor ? 'SEM_PONTE_ERP_KUSTOS' : 'NAO_INFORMADO' },
      decisao_proposta: !current ? 'NOVO_SOMENTE_NO_MASTER_SE_ETAPA_FUTURA_AUTORIZADA'
        : alteracoes.length ? 'REVISAR_ALTERACOES_MASTER_SEM_PROJETAR' : 'PRESERVAR_MASTER'
    });
  });
  const ausentes = [...master.entries()].filter(([codigo]) => !presentes.has(codigo)).map(([codigo, current]) => ({
    codigo_produto: codigo, atual: { ...current }, recebido: null,
    tipo: 'AUSENTE_NO_ARQUIVO', decisao_proposta: 'PRESERVAR_MASTER'
  }));
  const ordenar = (a, b) => a.codigo_produto < b.codigo_produto ? -1 : a.codigo_produto > b.codigo_produto ? 1 : 0;
  produtos.sort(ordenar);
  ausentes.sort(ordenar);
  const total = predicate => produtos.filter(predicate).length;
  const pendente = status => status === 'PENDENTE' || status === 'AMBIGUO';
  return {
    versao_contrato: 'FASE_3_1', somente_preview: true,
    status: erros.length ? 'COM_ERROS' : 'OK',
    resumo: {
      linhas_lidas: linhas.length, linhas_apos_filtros: aposFiltros, linhas_excluidas: excluidos.length,
      produtos_com_preview: produtos.length, novos_produtos: total(item => item.atual === null),
      produtos_existentes: total(item => item.atual !== null), produtos_ausentes: ausentes.length,
      produtos_com_alteracoes: total(item => item.tipo === 'ALTERACAO_POTENCIAL'),
      alteracoes_potenciais: produtos.reduce((sum, item) => sum + item.diferencas.filter(d => d.tipo === 'ALTERACAO_POTENCIAL').length, 0),
      campos_vazios: produtos.reduce((sum, item) => sum + item.diferencas.filter(d => d.fornecido && d.recebido === null).length, 0),
      familias_resolvidas: total(item => item.familia.efetivo.status === 'RESOLVIDO'),
      familias_pendentes: total(item => pendente(item.familia.efetivo.status)),
      familias_nao_informadas: total(item => item.familia.efetivo.status === 'NAO_INFORMADO'),
      origens_resolvidas: total(item => item.origem.efetivo.status === 'RESOLVIDO'),
      origens_pendentes: total(item => pendente(item.origem.efetivo.status)),
      origens_nao_informadas: total(item => item.origem.efetivo.status === 'NAO_INFORMADO'),
      agrupamentos_erp_recebidos: total(item => item.agrupamento.status === 'SEM_PONTE_ERP_KUSTOS'),
      agrupamentos_erp_sem_resolucao: total(item => item.agrupamento.status === 'SEM_PONTE_ERP_KUSTOS'),
      erros: erros.length
    },
    produtos, ausentes, excluidos, erros
  };
}
