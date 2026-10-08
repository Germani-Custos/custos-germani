// @ts-check
/* CAD-APPROVAL-01: propostas e decisões locais. Sem I/O, executor ou ponte ERP → Kustos. */
import { criarPreviewCadastroMestre, textoCadastro } from './cadastro-mestre-preview-engine.js';
import { normalizeCodigoProduto } from './spreadsheet-engine.js';

const comparar = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const copiar = value => JSON.parse(JSON.stringify(value));

/** Serialização de dados JSON com ordem estável de chaves, sem relógio/aleatoriedade. */
export function serializarDeterministico(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(serializarDeterministico).join(',')}]`;
  return `{${Object.keys(value).sort(comparar).filter(key => value[key] !== undefined)
    .map(key => `${JSON.stringify(key)}:${serializarDeterministico(value[key])}`).join(',')}}`;
}

/**
 * Cria propostas por campo. INSERT é indivisível; descrição e agrupamento de um
 * existente são decisões independentes. Origem/família ERP não viram FK Kustos.
 * @param {import('./cadastro-mestre-preview-engine.js').Registro[]} linhas
 * @param {import('./cadastro-mestre-preview-engine.js').ContextoPreview} contexto
 * @param {Record<string, unknown>} fonte
 */
export function criarManifestoCadastroMestre(linhas, contexto, fonte = {}) {
  const preview = criarPreviewCadastroMestre(linhas, contexto);
  const operacoes = [];
  const preservacoes = [];
  const pendencias = [];
  const semAlteracao = [];
  const porValor = new Map();
  for (const produto of preview.produtos) {
    const codigo = produto.codigo_produto;
    const agrupamento = produto.agrupamento.recebido;
    const novo = produto.atual === null;
    if (agrupamento !== null) {
      const dist = porValor.get(agrupamento) || { valor: agrupamento, novos: 0, existentes: 0, total: 0 };
      dist[novo ? 'novos' : 'existentes']++;
      dist.total++;
      porValor.set(agrupamento, dist);
    }
    for (const { campo, resolucao } of [{ campo: 'origem_cod', resolucao: produto.origem.efetivo }, { campo: 'familia_cod', resolucao: produto.familia.efetivo }]) {
      if (resolucao.status !== 'RESOLVIDO') pendencias.push({ codigo_produto: codigo, campo, codigo: resolucao.codigo, status: resolucao.status, impede_dado_erp_bruto: false });
    }
    if (agrupamento !== null) pendencias.push({ codigo_produto: codigo, campo: 'agrupamento_erp_valor', codigo: agrupamento, status: 'SEM_PONTE_ERP_KUSTOS', impede_dado_erp_bruto: false });
    const foraEscopo = produto.diferencas.filter(d => ['origem_cod', 'familia_cod'].includes(d.campo) && d.tipo === 'ALTERACAO_POTENCIAL');
    const bloqueios = foraEscopo.map(d => ({ campo: d.campo, atual: d.atual, recebido: d.recebido, motivo: 'ALTERACAO_FORA_ESCOPO_FASE_3_3' }));
    for (const bloqueio of bloqueios) pendencias.push({ codigo_produto: codigo, ...bloqueio, status: 'BLOQUEADO', impede_dado_erp_bruto: true });
    for (const diferenca of produto.diferencas) {
      if (diferenca.fornecido && diferenca.recebido === null) preservacoes.push({
        codigo_produto: codigo, campo: diferenca.campo, atual: diferenca.atual,
        tipo: novo ? 'CAMPO_VAZIO_OMITIDO_NO_INSERT' : 'CAMPO_VAZIO_PRESERVA_EXISTENTE', operacao: null
      });
      else if (!diferenca.fornecido) preservacoes.push({ codigo_produto: codigo, campo: diferenca.campo, atual: diferenca.atual, tipo: 'CAMPO_NAO_FORNECIDO', operacao: null });
    }
    const adicionar = (categoria, dados, diferencas) => {
      operacoes.push({
        id: `${categoria}:${encodeURIComponent(codigo)}`, categoria,
        acao: novo ? 'INSERT' : 'UPDATE', tabela: 'dicionario_master_produtos',
        codigo_produto: codigo, linha: produto.linha,
        dados, atual: copiar(produto.atual), recebido: copiar(produto.recebido),
        diferencas: copiar(diferencas), origem: copiar(produto.origem), familia: copiar(produto.familia),
        agrupamento: copiar(produto.agrupamento), aprovavel: bloqueios.length === 0, bloqueios,
        precondicao: novo ? { produto_deve_estar_ausente: true }
          : { produto_deve_existir: true, valores_anteriores: Object.fromEntries(Object.keys(dados).map(campo => [campo, textoCadastro(produto.atual[campo])])) },
        // Não são valores NULL nem IDs fictícios. O lote BIGINT só existe na execução futura.
        campos_lote_na_execucao: ['ultima_importacao_cadastro_mestre_id',
          ...(Object.hasOwn(dados, 'agrupamento_erp_valor') ? ['agrupamento_erp_importacao_id'] : [])]
      });
    };
    if (novo) {
      const dados = { codigo_produto: codigo, ...Object.fromEntries(Object.entries(produto.recebido).filter(([, valor]) => valor !== null)) };
      adicionar('NOVO_PRODUTO', dados, produto.diferencas);
    } else {
      const antes = operacoes.length;
      for (const [campo, categoria] of [['descricao', 'ATUALIZAR_DESCRICAO'], ['agrupamento_erp_valor', 'ATUALIZAR_AGRUPAMENTO_ERP']]) {
        const diferenca = produto.diferencas.find(d => d.campo === campo);
        if (diferenca.tipo === 'ALTERACAO_POTENCIAL' && diferenca.recebido !== null) adicionar(categoria, { [campo]: diferenca.recebido }, [diferenca]);
      }
      if (antes === operacoes.length && !bloqueios.length) semAlteracao.push(codigo);
    }
  }
  operacoes.sort((a, b) => comparar(a.codigo_produto, b.codigo_produto) || comparar(a.categoria, b.categoria));
  const elegiveis = new Set(preview.produtos.map(p => p.codigo_produto));
  const fisicamentePresentes = new Set(linhas.map(r => normalizeCodigoProduto(r.codigo_produto)));
  // Não confundir ausente no conjunto filtrado com ausente fisicamente no XLSM.
  const preservados = contexto.produtos.filter(p => !elegiveis.has(normalizeCodigoProduto(p.codigo_produto)))
    .map(p => ({ codigo_produto: normalizeCodigoProduto(p.codigo_produto), motivo: fisicamentePresentes.has(normalizeCodigoProduto(p.codigo_produto)) ? 'FORA_DO_CONJUNTO_FILTRADO' : 'AUSENTE_NO_ARQUIVO', operacao: null }))
    .sort((a, b) => comparar(a.codigo_produto, b.codigo_produto));
  const existentes = preview.produtos.filter(p => p.atual !== null);
  const alteradosBase = existentes.filter(p => p.diferencas.some(d => d.campo !== 'agrupamento_erp_valor' && d.tipo === 'ALTERACAO_POTENCIAL')).length;
  const inserts = operacoes.filter(o => o.acao === 'INSERT');
  const updates = operacoes.filter(o => o.acao === 'UPDATE');
  return {
    versao_contrato: 'FASE_3_3', somente_preparacao: true, execucao_permitida: false,
    fonte: copiar(fonte), status: preview.status,
    resumo_base: { produtos: preview.produtos.length, existentes: existentes.length, novos: inserts.length,
      existentes_sem_alteracao: existentes.length - alteradosBase, existentes_com_alteracao: alteradosBase,
      alteracoes_descricao: operacoes.filter(o => o.categoria === 'ATUALIZAR_DESCRICAO').length },
    resumo: {
      ...preview.resumo, inserts_propostos: inserts.length, updates_propostos: updates.length,
      produtos_existentes_com_update: new Set(updates.map(o => o.codigo_produto)).size,
      operacoes_propostas: operacoes.length, operacoes_bloqueadas: operacoes.filter(o => !o.aprovavel).length,
      existentes_sem_operacao: semAlteracao.length, produtos_fora_conjunto_preservados: preservados.length,
      agrupamentos_erp_preenchidos: preview.produtos.filter(p => p.agrupamento.recebido !== null).length,
      agrupamentos_erp_vazios: preview.produtos.filter(p => p.agrupamento.recebido === null).length,
      agrupamentos_erp_distintos: porValor.size,
      agrupamentos_erp_novos: inserts.filter(o => Object.hasOwn(o.dados, 'agrupamento_erp_valor')).length,
      agrupamentos_erp_existentes: existentes.filter(p => p.agrupamento.recebido !== null).length,
      preservacoes_campos: preservacoes.length
    },
    distribuicao_agrupamento: [...porValor.values()].sort((a, b) => comparar(a.valor, b.valor)),
    operacoes, preservacoes, preservados, sem_alteracao: semAlteracao,
    pendencias, produtos: preview.produtos, erros: preview.erros
  };
}

/** Todas as propostas começam PENDENTES; uma revisão não é autorização de execução. */
export function criarRevisaoCadastroMestre(manifesto) {
  return { versao_contrato: 'FASE_3_3', vinculo_manifesto: serializarDeterministico(manifesto),
    decisoes: manifesto.operacoes.map(o => ({ id: o.id, status: 'PENDENTE' })) };
}

function validarRevisao(manifesto, revisao) {
  if (!revisao || revisao.vinculo_manifesto !== serializarDeterministico(manifesto)) throw new Error('Revisão não pertence a este manifesto; gerar nova revisão.');
  const ids = manifesto.operacoes.map(o => o.id);
  if (new Set(ids).size !== ids.length || revisao.decisoes.length !== ids.length || new Set(revisao.decisoes.map(d => d.id)).size !== ids.length
    || revisao.decisoes.some(d => !ids.includes(d.id) || !['PENDENTE', 'APROVADO', 'REJEITADO'].includes(d.status))) throw new Error('Decisões incompletas, duplicadas ou inválidas.');
  if (revisao.decisoes.some(d => d.status === 'APROVADO' && !manifesto.operacoes.find(o => o.id === d.id).aprovavel)) throw new Error('Operação bloqueada não pode ser aprovada.');
}

/** IDs explícitos, individual ou lote. Falha é atômica, nunca altera os argumentos. */
export function decidirOperacoesCadastroMestre(manifesto, revisao, ids, decisao) {
  validarRevisao(manifesto, revisao);
  if (!['APROVADO', 'REJEITADO', 'PENDENTE'].includes(decisao) || !Array.isArray(ids) || new Set(ids).size !== ids.length) throw new Error('Decisão ou seleção inválida.');
  for (const id of ids) {
    const operacao = manifesto.operacoes.find(o => o.id === id);
    if (!operacao) throw new Error('Operação inexistente.');
    if (decisao === 'APROVADO' && !operacao.aprovavel) throw new Error('Operação bloqueada por alteração fora do escopo.');
  }
  return { ...revisao, decisoes: revisao.decisoes.map(d => ids.includes(d.id) ? { ...d, status: decisao } : { ...d }) };
}

/** Conjunto explícito para a próxima etapa; não executa, não gera lote nem datas. */
export function obterOperacoesAprovadasCadastroMestre(manifesto, revisao) {
  validarRevisao(manifesto, revisao);
  const aprovadas = new Set(revisao.decisoes.filter(d => d.status === 'APROVADO').map(d => d.id));
  return { versao_contrato: 'FASE_3_3', somente_preparacao: true, execucao_permitida: false,
    fonte: copiar(manifesto.fonte), vinculo_manifesto: revisao.vinculo_manifesto,
    decisoes: copiar(revisao.decisoes),
    operacoes: copiar(manifesto.operacoes.filter(o => aprovadas.has(o.id))) };
}
