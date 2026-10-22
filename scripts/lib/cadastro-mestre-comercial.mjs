/* Administração Node, sem importação pelo frontend ou pelo executor de reconstrução. */
import { createHash } from 'node:crypto';
import { lerArquivoCadastroMestre, prepararAprovacaoDadosCadastroMestre } from '../../src/services/cadastro-mestre-preview.js';
import { criarDadosExecucaoCadastroMestre } from '../../core/cadastro-mestre-execution-data.js';
import { serializarDeterministico as serializar } from '../../core/cadastro-mestre-approval-engine.js';

export const CAMPOS_COMERCIAIS = Object.freeze(['agrupamento_comercial_erp_cod', 'agrupamento_comercial_erp_descricao']);
export const hashBytesComerciais = bytes => createHash('sha256').update(bytes).digest('hex');
export const hashManifestoComercial = value => hashBytesComerciais(serializar(value));
const igual = (a, b, motivo) => {
  if (serializar(a) !== serializar(b)) throw new Error(motivo);
};
const par = obj => Object.fromEntries(CAMPOS_COMERCIAIS.map(c => [c, obj?.[c] ?? null]));
const catalogo = rows => rows.map(({ id, codigo, descricao }) => ({ id, codigo, descricao }));
const contextoFotografia = fotografia => ({ produtos: fotografia.contexto.produtos,
  origens: catalogo(fotografia.contexto.origens), familias: catalogo(fotografia.contexto.familias) });

/** Revalida a fotografia e o manifesto integral da Fase A contra os bytes do XLS.
 * Não recebe patches livres, não conecta ao banco e não aprova execução.
 * Retém os bytes lidos uma única vez para impedir troca do arquivo entre validações.
 */
export async function validarCargaComercial({ manifesto, hashManifesto, fotografiaBytes, arquivo, leitor }) {
  // O chamador não pode mudar a evidência enquanto o adapter assíncrono está lendo.
  manifesto = JSON.parse(JSON.stringify(manifesto));
  if (!/^[a-f0-9]{64}$/.test(hashManifesto || '') || hashManifestoComercial(manifesto) !== hashManifesto) {
    throw new Error('Hash do manifesto comercial divergente ou ausente.');
  }
  igual([manifesto.tipo, manifesto.somente_preparacao, manifesto.execucao_permitida, manifesto.decisao],
    ['MANIFESTO_COMERCIAL_PARA_REVISAO_FASE_A', true, false, 'PENDENTE_DE_REVISAO_E_EXECUTOR_ISOLADO'], 'Contrato da Fase A inválido.');
  igual(manifesto.destino, { tabela: 'dicionario_master_produtos', campos: CAMPOS_COMERCIAIS }, 'Destino comercial inválido.');
  if (hashBytesComerciais(fotografiaBytes) !== manifesto.fotografia.sha256) throw new Error('Hash da fotografia divergente.');
  const fotografia = JSON.parse(Buffer.from(fotografiaBytes).toString('utf8'));
  const contexto = contextoFotografia(fotografia);
  igual([contexto.produtos.length, new Set(contexto.produtos.map(p => p.codigo_produto)).size,
    fotografia.capturado_em, manifesto.fotografia.produtos, manifesto.fotografia.campos_master],
  [860, 860, manifesto.fotografia.capturado_em, 860, 11], 'Fotografia/universo esperado divergente.');
  if (contexto.produtos.some(p => Object.keys(p).length !== 11 || !CAMPOS_COMERCIAIS.every(c => Object.hasOwn(p, c)))) {
    throw new Error('Estrutura da fotografia do Master divergente.');
  }
  const bytes = Buffer.from(await arquivo.arrayBuffer());
  igual([hashBytesComerciais(bytes), bytes.length, arquivo.name],
    [manifesto.fonte.sha256, manifesto.fonte.bytes, manifesto.fonte.arquivo], 'XLS diferente do manifesto.');
  const leitura = await lerArquivoCadastroMestre({ name: arquivo.name, arrayBuffer: async () => bytes }, leitor, manifesto.fonte.aba);
  if (!CAMPOS_COMERCIAIS.every(c => Object.hasOwn(leitura.colunas, c))) throw new Error('Colunas comerciais obrigatórias para esta carga isolada.');
  const dados = criarDadosExecucaoCadastroMestre(leitura, manifesto.fonte.sha256);
  const { manifesto: m } = await prepararAprovacaoDadosCadastroMestre(dados, contexto);
  igual([leitura.aba, leitura.colunas, leitor.version, dados.versao_transporte, m.versao_contrato,
    m.fonte.hash_dados_sha256, m.fonte.hash_contexto_sha256, manifesto.fonte.adapter],
  [manifesto.fonte.aba, manifesto.fonte.colunas, manifesto.fonte.sheetjs, manifesto.fonte.transporte, manifesto.fonte.contrato_base,
    manifesto.fonte.hash_dados, manifesto.fonte.hash_contexto, 'src/services/cadastro-mestre-preview.js#lerArquivoCadastroMestre'],
  'Adapter, contrato ou hashes revalidados divergentes.');
  if (m.status !== 'OK' || m.reconstrucao_bloqueada || m.erros.length) throw new Error('XLS/manifesto bloqueado pelos motores existentes.');
  const brutos = new Map(leitura.linhas.map(p => [p.linha, p]));
  const produtos = m.produtos.map(p => {
    if (!p.atual) throw new Error('Produto inexistente: esta carga não insere produtos.');
    const erp = par(p.recebido), proposto = par(p.calculado), atual = par(p.atual);
    igual(erp, proposto, 'Valor proposto não reproduz o ERP.');
    const alterados = CAMPOS_COMERCIAIS.filter(c => atual[c] !== proposto[c]);
    return { codigo_produto: p.codigo_produto, linha_xls: p.linha, valor_erp: erp, valor_erp_bruto: par(brutos.get(p.linha)),
      valor_atual_master: atual, valor_proposto: proposto,
      acao_proposta: alterados.length ? 'ATUALIZAR_APENAS_CAMPOS_COMERCIAIS' : 'MANTER_NULL', campos_alterados: alterados };
  });
  const pares = new Map();
  for (const p of produtos) {
    const [cod, descricao] = CAMPOS_COMERCIAIS.map(c => p.valor_erp[c]);
    if (cod !== null) {
      if (!pares.has(cod)) pares.set(cod, new Set());
      if (descricao !== null) pares.get(cod).add(descricao);
    }
  }
  const outras = m.operacoes.filter(o => !(o.tabela === 'dicionario_master_produtos' && o.acao === 'UPDATE'
    && Object.keys(o.dados).every(c => CAMPOS_COMERCIAIS.includes(c))));
  const resumo = { linhas: leitura.linhas.length, universo: produtos.length, existentes: produtos.length, novos: 0,
    com_agrupamento: produtos.filter(p => p.valor_erp[CAMPOS_COMERCIAIS[0]] !== null).length,
    sem_agrupamento: produtos.filter(p => p.valor_erp[CAMPOS_COMERCIAIS[0]] === null).length,
    codigos_distintos: pares.size, conflitos: [...pares.values()].filter(v => v.size > 1).length, campos_inferidos: 0,
    produtos_a_atualizar: produtos.filter(p => p.campos_alterados.length).length,
    produtos_mantem_null: produtos.filter(p => !p.campos_alterados.length).length,
    alteracoes_campos: produtos.reduce((s, p) => s + p.campos_alterados.length, 0),
    limpezas_para_null: produtos.filter(p => p.campos_alterados.some(c => p.valor_proposto[c] === null)).length,
    outras_operacoes_no_manifesto_generico: outras.length, inserts_manifesto_generico: m.resumo.inserts_propostos,
    remocoes_manifesto_generico: m.remocoes.length };
  igual(resumo, manifesto.resumo, 'Contagens diferentes da Fase A.');
  // Este executor fecha somente a carga aprovada; mudanças de universo exigem nova revisão.
  igual(resumo, { linhas: 6230, universo: 860, existentes: 860, novos: 0, com_agrupamento: 162, sem_agrupamento: 698,
    codigos_distintos: 29, conflitos: 0, campos_inferidos: 0, produtos_a_atualizar: 162, produtos_mantem_null: 698,
    alteracoes_campos: 324, limpezas_para_null: 0, outras_operacoes_no_manifesto_generico: 0,
    inserts_manifesto_generico: 0, remocoes_manifesto_generico: 0 }, 'Volume da carga aprovada divergente.');
  igual(produtos, manifesto.produtos, 'Propostas diferentes da Fase A.');
  igual(produtos.map(p => p.codigo_produto).sort(), contexto.produtos.map(p => p.codigo_produto).sort(), 'Identidade do universo divergente.');
  if (produtos.some(p => CAMPOS_COMERCIAIS.some(c => p.valor_atual_master[c] !== null)
    || (p.acao_proposta === 'MANTER_NULL' && CAMPOS_COMERCIAIS.some(c => p.valor_proposto[c] !== null)))) {
    throw new Error('Esta carga exige fotografia inicial NULL e 698 produtos mantidos NULL.');
  }
  return { resumo, contexto, produtos, hashManifesto, fotografiaSha256: manifesto.fotografia.sha256 };
}

const identificar = name => `public."${name.replaceAll('"', '""')}"`;
async function tabelasPublicas(client) {
  const { rows } = await client.query("SELECT c.relname AS tabela,row_security_active(c.oid) AS rls_ativa FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p') ORDER BY c.relname");
  if (rows.some(r => r.rls_ativa)) throw new Error('RLS ativa para esta conexão impede prova integral das tabelas; acesso não será alterado.');
  return rows.map(r => r.tabela);
}
async function imagens(client, tabelas) {
  const result = {};
  for (const t of tabelas) {
    const rows = (await client.query(`SELECT to_jsonb(t) AS registro FROM ${identificar(t)} t ORDER BY to_jsonb(t)::text`)).rows.map(r => r.registro);
    result[t] = { quantidade: rows.length, sha256: hashManifestoComercial(rows) };
  }
  return result;
}
async function lerContexto(client) {
  const ler = async (t, fields, key) => (await client.query(`SELECT to_jsonb(t) AS registro FROM (SELECT ${fields} FROM ${identificar(t)} ORDER BY ${key}) t`)).rows.map(r => r.registro);
  return { produtos: await ler('dicionario_master_produtos', '*', 'codigo_produto'),
    origens: await ler('categorias_origem', 'id,codigo,descricao', 'id'), familias: await ler('categorias_familia', 'id,codigo,descricao', 'id') };
}
async function guardarDependencias(client) {
  const { rows } = await client.query(`SELECT
    EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.dicionario_master_produtos'::regclass AND NOT tgisinternal AND tgenabled<>'D') AS triggers,
    EXISTS (SELECT 1 FROM pg_rewrite WHERE ev_class='public.dicionario_master_produtos'::regclass AND rulename<>'_RETURN') AS regras,
    EXISTS (SELECT 1 FROM pg_inherits WHERE inhparent='public.dicionario_master_produtos'::regclass OR inhrelid='public.dicionario_master_produtos'::regclass) AS heranca,
    EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.dicionario_master_produtos'::regclass AND contype IN ('c','x')) AS expressoes,
    row_security_active('public.dicionario_master_produtos'::regclass) AS rls_ativa_para_conexao,
    EXISTS (SELECT 1 FROM pg_constraint c WHERE c.contype='f' AND (
      (c.confrelid='public.dicionario_master_produtos'::regclass AND c.confkey && ARRAY(SELECT attnum FROM pg_attribute WHERE attrelid=c.confrelid AND attname IN ('agrupamento_comercial_erp_cod','agrupamento_comercial_erp_descricao')))
      OR (c.conrelid='public.dicionario_master_produtos'::regclass AND c.conkey && ARRAY(SELECT attnum FROM pg_attribute WHERE attrelid=c.conrelid AND attname IN ('agrupamento_comercial_erp_cod','agrupamento_comercial_erp_descricao'))))) AS referencias`);
  if (!rows[0] || Object.values(rows[0]).some(Boolean)) throw new Error('Dependência do Master exige revisão; nada será desabilitado ou alterado.');
}

/** Cliente administrativo dedicado, sem transação aberta. Nunca usar como teste em produção.
 * A confirmação explícita é independente do manifesto de diagnóstico (que permanece imutável).
 * Única escrita SQL: UPDATE parametrizado do par comercial; sem log, timestamps ou proveniência.
 */
export async function executarCargaComercial({ client, confirmacao, ...entrada }) {
  const plano = await validarCargaComercial(entrada);
  if (confirmacao !== `APLICAR_AGRUP_COM:${plano.hashManifesto}`) throw new Error('Confirmação explícita do hash comercial obrigatória.');
  let iniciou = false, commitEnviado = false;
  try {
    await client.query('BEGIN ISOLATION LEVEL READ COMMITTED'); iniciou = true;
    await client.query("SET LOCAL lock_timeout='5s'");
    await client.query("SET LOCAL statement_timeout='30s'");
    const tabelas = await tabelasPublicas(client);
    if (!['dicionario_master_produtos', 'categorias_origem', 'categorias_familia'].every(t => tabelas.includes(t))) throw new Error('Tabelas esperadas ausentes.');
    // Bloqueia DML concorrente e DDL nas relações fotografadas, sem modificar nenhuma.
    await client.query('LOCK TABLE public.dicionario_master_produtos IN EXCLUSIVE MODE NOWAIT');
    const outrasTabelas = tabelas.filter(t => t !== 'dicionario_master_produtos');
    if (outrasTabelas.length) await client.query(`LOCK TABLE ${outrasTabelas.map(identificar).join(',')} IN SHARE MODE NOWAIT`);
    igual(await tabelasPublicas(client), tabelas, 'Catálogo público mudou durante a validação.');
    await guardarDependencias(client);
    const antes = await lerContexto(client);
    igual(antes, plano.contexto, 'Master/catálogos divergentes da fotografia; execução bloqueada.');
    const provasAntes = await imagens(client, outrasTabelas);
    const atualizacoes = plano.produtos.filter(p => p.campos_alterados.length).map(p => ({ codigo_produto: p.codigo_produto, ...p.valor_proposto }));
    const result = await client.query(`UPDATE public.dicionario_master_produtos AS m
      SET agrupamento_comercial_erp_cod=x.agrupamento_comercial_erp_cod,
          agrupamento_comercial_erp_descricao=x.agrupamento_comercial_erp_descricao
      FROM jsonb_to_recordset($1::jsonb) AS x(codigo_produto text,agrupamento_comercial_erp_cod text,agrupamento_comercial_erp_descricao text)
      WHERE m.codigo_produto=x.codigo_produto RETURNING m.codigo_produto`, [JSON.stringify(atualizacoes)]);
    igual(result.rows.map(r => r.codigo_produto).sort(), atualizacoes.map(p => p.codigo_produto).sort(), 'Produtos atualizados divergentes; rollback obrigatório.');
    const depois = await lerContexto(client);
    const patches = new Map(atualizacoes.map(p => [p.codigo_produto, p]));
    const esperado = { ...antes, produtos: antes.produtos.map(p => ({ ...p, ...patches.get(p.codigo_produto) })) };
    igual(depois, esperado, 'Imagem final diferente do par comercial aprovado; rollback obrigatório.');
    igual(await tabelasPublicas(client), tabelas, 'Catálogo público mudou; rollback obrigatório.');
    const provasDepois = await imagens(client, outrasTabelas);
    igual(provasDepois, provasAntes, 'Outra tabela mudou; rollback obrigatório.');
    const saida = { contrato: 'CARGA_COMERCIAL_ISOLADA_V1', status: 'COMMIT_CONFIRMADO', hash_manifesto: plano.hashManifesto,
      fotografia_sha256: plano.fotografiaSha256, ...plano.resumo,
      master_antes_sha256: hashManifestoComercial(antes.produtos), master_depois_sha256: hashManifestoComercial(depois.produtos),
      outras_tabelas_antes: provasAntes, outras_tabelas_depois: provasDepois,
      campos_escritos: [...CAMPOS_COMERCIAIS], outras_colunas_preservadas: true, inseridos: 0, removidos: 0 };
    commitEnviado = true;
    await client.query('COMMIT');
    return saida;
  } catch (error) {
    if (commitEnviado) throw new Error('Resultado do COMMIT desconhecido. Não repetir; conferir o banco pela fotografia/manifesto.', { cause: error });
    if (iniciou) {
      try { await client.query('ROLLBACK'); }
      catch (rollbackError) { throw new Error('ROLLBACK não confirmado; encerrar conexão e verificar antes de repetir.', { cause: rollbackError }); }
    }
    throw error;
  }
}
