/* Executor administrativo PostgreSQL. Nunca importado pelo frontend.
   DML somente no Master/log existentes; sem DDL, RPC ou migration. */
import { createHash } from 'node:crypto';
import { prepararAprovacaoArquivoCadastroMestre } from '../../src/services/cadastro-mestre-preview.js';
import { serializarDeterministico } from '../../core/cadastro-mestre-approval-engine.js';
import { criarPlanoReconstrucaoCadastroMestre } from '../../core/cadastro-mestre-reconstruction-engine.js';

const MASTER = 'public.dicionario_master_produtos';
const LOG = 'public.log_importacao_cadastro_mestre';
const PROTEGIDAS = ['apontamentos_op', 'categorias_agrupamento', 'categorias_familia', 'categorias_origem', 'dicionario_produtos', 'historico_custos', 'mapa_produtos'];
const CAMPOS = ['descricao', 'origem_cod', 'familia_cod', 'agrupamento_erp_valor'];
const serializar = serializarDeterministico;
export const hashReconstrucao = value => createHash('sha256').update(serializar(value)).digest('hex');

export async function contextoAtual(client) {
  const ler = async (table, fields, key) => (await client.query(`SELECT to_jsonb(t) AS registro FROM (SELECT ${fields} FROM public.${table} ORDER BY ${key}) t`)).rows.map(r => r.registro);
  // Uma única conexão/transaction; nenhuma consulta ao operacional como fonte ERP.
  return { produtos: await ler('dicionario_master_produtos', '*', 'codigo_produto'),
    origens: await ler('categorias_origem', 'id,codigo,descricao', 'id'),
    familias: await ler('categorias_familia', 'id,codigo,descricao', 'id') };
}

async function fingerprintsProtegidos(client) {
  const sql = PROTEGIDAS.map(t => `SELECT '${t}' AS tabela, count(*)::int AS quantidade,
    md5(COALESCE(string_agg(to_jsonb(t)::text, E'\\n' ORDER BY to_jsonb(t)::text), '')) AS fingerprint FROM public.${t} t`).join(' UNION ALL ');
  return (await client.query(sql)).rows;
}

export async function validarDependencias(client) {
  const { rows } = await client.query(`SELECT
    EXISTS (SELECT 1 FROM pg_trigger WHERE NOT tgisinternal AND tgenabled <> 'D'
      AND tgrelid IN ('${MASTER}'::regclass, '${LOG}'::regclass)) AS triggers,
    EXISTS (SELECT 1 FROM pg_constraint WHERE contype='f' AND confrelid='${MASTER}'::regclass) AS referencias,
    EXISTS (SELECT 1 FROM pg_rewrite WHERE rulename <> '_RETURN' AND ev_class IN ('${MASTER}'::regclass, '${LOG}'::regclass)) AS regras,
    EXISTS (SELECT 1 FROM pg_inherits WHERE inhparent IN ('${MASTER}'::regclass, '${LOG}'::regclass)
      OR inhrelid IN ('${MASTER}'::regclass, '${LOG}'::regclass)) AS heranca`);
  if (Object.values(rows[0]).some(Boolean)) throw new Error('Dependências/triggers/regras do Master ou log exigem revisão antes da reconstrução. Nenhum schema será alterado automaticamente.');
}

async function inserirProdutos(client, produtos, lote) {
  const grupos = new Map();
  for (const produto of produtos) {
    const campos = CAMPOS.filter(c => Object.hasOwn(produto, c));
    const chave = campos.join(',');
    grupos.set(chave, [...(grupos.get(chave) || []), produto]);
  }
  let total = 0;
  for (const [chave, rows] of grupos) {
    const campos = chave ? chave.split(',') : [];
    const agrupamento = campos.includes('agrupamento_erp_valor');
    const columns = ['codigo_produto', ...campos, 'ultima_importacao_cadastro_mestre_id', 'criado_em', 'atualizado_em', ...(agrupamento ? ['agrupamento_erp_importacao_id'] : [])];
    const values = ['x.codigo_produto', ...campos.map(c => `x.${c}`), '$2::bigint', 'now()', 'now()', ...(agrupamento ? ['$2::bigint'] : [])];
    const result = await client.query(`INSERT INTO ${MASTER} (${columns.join(',')})
      SELECT ${values.join(',')} FROM jsonb_to_recordset($1::jsonb) AS x(codigo_produto text${campos.map(c => `,${c} text`).join('')}) RETURNING codigo_produto`, [JSON.stringify(rows), lote]);
    total += result.rows.length;
  }
  return total;
}

async function atualizarProdutos(client, produtos, lote) {
  if (!produtos.length) return 0;
  const setters = CAMPOS.map(c => `${c}=CASE WHEN x.dados ? '${c}' THEN x.dados->>'${c}' ELSE m.${c} END`);
  const result = await client.query(`UPDATE ${MASTER} m SET ${setters.join(',')}, atualizado_em=now(),
    ultima_importacao_cadastro_mestre_id=$2::bigint,
    agrupamento_erp_importacao_id=CASE WHEN x.dados ? 'agrupamento_erp_valor' THEN $2::bigint ELSE m.agrupamento_erp_importacao_id END
    FROM jsonb_to_recordset($1::jsonb) AS x(codigo_produto text,dados jsonb)
    WHERE m.codigo_produto=x.codigo_produto RETURNING m.codigo_produto`, [JSON.stringify(produtos.map(({ codigo_produto, ...dados }) => ({ codigo_produto, dados }))), lote]);
  return result.rows.length;
}

function verificarMaster(plano, depois, lote, timestamp) {
  if (serializar(depois.map(p => p.codigo_produto).sort()) !== serializar(plano.universo)) throw new Error('Universo final divergente do XLS filtrado.');
  const porCodigo = new Map(depois.map(p => [p.codigo_produto, p]));
  const alterados = new Map(plano.updates.map(p => [p.codigo_produto, p]));
  for (const esperado of plano.esperados) {
    const real = porCodigo.get(esperado.codigo_produto);
    if (CAMPOS.some(c => (real[c] ?? null) !== (esperado.calculado[c] ?? null))) throw new Error('Valores finais divergentes do Preview.');
    const patch = alterados.get(esperado.codigo_produto);
    if (esperado.atual) {
      const imagem = { ...esperado.atual, ...(patch || {}) };
      if (patch) {
        imagem.atualizado_em = timestamp;
        imagem.ultima_importacao_cadastro_mestre_id = real.ultima_importacao_cadastro_mestre_id;
        if (Object.hasOwn(patch, 'agrupamento_erp_valor')) imagem.agrupamento_erp_importacao_id = real.agrupamento_erp_importacao_id;
      }
      if (serializar(imagem) !== serializar(real)) throw new Error('Campo protegido ou proveniência anterior de produto alterado indevidamente.');
    }
    if (!esperado.atual || patch) {
      if (String(real.ultima_importacao_cadastro_mestre_id) !== lote || real.atualizado_em !== timestamp) throw new Error('Proveniência da escrita divergente.');
      if (!esperado.atual && real.criado_em !== timestamp) throw new Error('Proveniência de criação divergente.');
      const grupoMudou = !esperado.atual ? esperado.calculado.agrupamento_erp_valor !== null : Object.hasOwn(patch, 'agrupamento_erp_valor');
      if (grupoMudou && String(real.agrupamento_erp_importacao_id) !== lote) throw new Error('Proveniência do agrupamento ERP divergente.');
    }
  }
}

/**
 * Cliente dedicado; arquivo/revisão revalidados sob locks. salvarSnapshot deve
 * confirmar persistência durável (arquivo local ou Storage privado) antes do DML.
 * A confirmação é o hash completo do manifesto aprovado, não booleano genérico.
 */
export async function executarReconstrucaoCadastroMestre({ client, arquivo, evidencia, leitor, identificadorLote, autor, confirmacao, salvarSnapshot }) {
  const planoAprovado = criarPlanoReconstrucaoCadastroMestre(evidencia.manifesto, evidencia.revisao);
  const hashManifesto = hashReconstrucao(evidencia.manifesto);
  if (confirmacao !== `RECONSTRUIR_MASTER:${hashManifesto}` || !autor?.trim() || !identificadorLote?.trim() || typeof salvarSnapshot !== 'function') {
    throw new Error('Confirmação explícita do manifesto, autor, identificador de lote e snapshot durável são obrigatórios.');
  }
  let lote;
  let savepoint = false;
  let commitEnviado = false;
  let antes;
  let protegidas;
  await client.query('BEGIN');
  try {
    await client.query("SET LOCAL lock_timeout='3s'");
    await client.query("SET LOCAL statement_timeout='30s'");
    // Falhar se RLS ocultar parte do universo; exige conexão administrativa completa.
    await client.query('SET LOCAL row_security=off');
    await client.query("SET LOCAL TIME ZONE 'UTC'");
    await client.query(`LOCK TABLE ${MASTER}, ${LOG} IN EXCLUSIVE MODE NOWAIT`);
    await client.query(`LOCK TABLE ${PROTEGIDAS.map(t => 'public.' + t).join(',')} IN SHARE MODE NOWAIT`);
    await validarDependencias(client);
    const repetido = await client.query(`SELECT id FROM ${LOG} WHERE identificador_lote=$1`, [identificadorLote]);
    if (repetido.rows.length) throw new Error('Identificador de lote já registrado; não repetir automaticamente.');
    antes = await contextoAtual(client);
    const preparado = await prepararAprovacaoArquivoCadastroMestre(arquivo, antes, leitor, evidencia.manifesto.fonte.aba);
    if (serializar(preparado.manifesto) !== serializar(evidencia.manifesto)) throw new Error('Arquivo ou contexto mudou após Preview; gerar nova revisão antes de executar.');
    const plano = criarPlanoReconstrucaoCadastroMestre(preparado.manifesto, evidencia.revisao);
    if (serializar(plano) !== serializar(planoAprovado)) throw new Error('Plano divergente da revisão aprovada.');
    protegidas = await fingerprintsProtegidos(client);
    const timestamp = (await client.query("SELECT to_jsonb(now()) #>> '{}' AS timestamp")).rows[0].timestamp;
    const metadados = { contrato: plano.versao_contrato, autor, confirmacao, hash_manifesto_sha256: hashManifesto,
      fonte: preparado.manifesto.fonte, decisoes: evidencia.revisao.decisoes, resumo: plano.resumo,
      snapshot_master: antes.produtos, snapshot_sha256: hashReconstrucao(antes.produtos),
      removidos: plano.remocoes, protegidas_antes: protegidas, registros_removidos: 0 };
    lote = (await client.query(`INSERT INTO ${LOG}
      (arquivo_nome,tipo_arquivo,arquivo_hash,identificador_lote,fonte_sistema,status,total_registros,metadados_origem)
      VALUES ($1,$2,$3,$4,'ERP','processando',$5,$6::jsonb) RETURNING id::text AS id`,
    [arquivo.name, preparado.manifesto.fonte.tipo_arquivo, preparado.manifesto.fonte.hash_arquivo_sha256, identificadorLote, plano.universo.length, JSON.stringify(metadados)])).rows[0].id;
    // Cópia independente preserva a imagem anterior mesmo se a conexão/COMMIT falhar.
    const snapshotReferencia = await salvarSnapshot({ ...metadados, identificador_lote: identificadorLote, lote_id: lote, capturado_em: timestamp });
    if (snapshotReferencia) {
      await client.query(`UPDATE ${LOG} SET metadados_origem=metadados_origem || $2::jsonb WHERE id=$1`,
        [lote, JSON.stringify({ snapshot_referencia: snapshotReferencia })]);
    }
    await client.query('SAVEPOINT reconstruir_master');
    savepoint = true;
    const inseridos = await inserirProdutos(client, plano.inserts, lote);
    const atualizados = await atualizarProdutos(client, plano.updates, lote);
    const removidos = plano.remocoes.length ? (await client.query(`DELETE FROM ${MASTER} WHERE codigo_produto=ANY($1::text[]) RETURNING codigo_produto`, [plano.remocoes.map(p => p.codigo_produto)])).rows.length : 0;
    if (inseridos !== plano.resumo.inseridos || atualizados !== plano.resumo.atualizados || removidos !== plano.resumo.removidos) throw new Error('Contagens efetivas divergentes do plano aprovado.');
    const depois = await contextoAtual(client);
    verificarMaster(plano, depois.produtos, lote, timestamp);
    const protegidasDepois = await fingerprintsProtegidos(client);
    if (serializar(protegidas) !== serializar(protegidasDepois)) throw new Error('Tabela protegida mudou; reconstrução será revertida.');
    const prova = { registros_removidos: removidos, master_depois: depois.produtos.length,
      master_depois_sha256: hashReconstrucao(depois.produtos), protegidas_depois: protegidasDepois };
    await client.query(`UPDATE ${LOG} SET status='concluido',finalizado_em=now(),registros_processados=$2,
      registros_inseridos=$3,registros_atualizados=$4,metadados_origem=metadados_origem || $5::jsonb WHERE id=$1`,
    [lote, depois.produtos.length, inseridos, atualizados, JSON.stringify(prova)]);
    commitEnviado = true;
    await client.query('COMMIT');
    return { lote_id: lote, status: 'concluido', ...plano.resumo, snapshot_sha256: metadados.snapshot_sha256 };
  } catch (error) {
    if (commitEnviado) throw new Error(`COMMIT não confirmado; consultar o lote ${lote} e o snapshot antes de qualquer nova tentativa.`);
    if (savepoint) {
      try {
        await client.query('ROLLBACK TO SAVEPOINT reconstruir_master');
        const restaurado = await contextoAtual(client);
        if (serializar(restaurado.produtos) !== serializar(antes.produtos) || serializar(await fingerprintsProtegidos(client)) !== serializar(protegidas)) throw new Error('Prova de rollback divergente.');
        await client.query(`UPDATE ${LOG} SET status='falhou',finalizado_em=now(),registros_erro=1,
          registros_processados=0,registros_inseridos=0,registros_atualizados=0,
          erros=$2::jsonb WHERE id=$1`, [lote, JSON.stringify([{ code: error.code || 'RECONSTRUCAO_ABORTADA', message: error.message }])]);
        commitEnviado = true;
        await client.query('COMMIT');
      } catch {
        if (!commitEnviado) await client.query('ROLLBACK');
        throw new Error(`Falha de auditoria/COMMIT; consultar lote ${lote} e snapshot. Não repetir automaticamente.`);
      }
      throw new Error(`Reconstrução revertida integralmente; lote ${lote} registrado como falhou.`);
    }
    await client.query('ROLLBACK');
    throw error;
  }
}
