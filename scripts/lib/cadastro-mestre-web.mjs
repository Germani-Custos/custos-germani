/* Transporte/autorização server-side. A reconstrução pertence ao executor central. */
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';
import SheetJS from 'xlsx';
import { prepararAprovacaoArquivoCadastroMestre } from '../../src/services/cadastro-mestre-preview.js';
import { criarPlanoReconstrucaoCadastroMestre } from '../../core/cadastro-mestre-reconstruction-engine.js';
import { serializarDeterministico } from '../../core/cadastro-mestre-approval-engine.js';
import { contextoAtual, executarReconstrucaoCadastroMestre, hashReconstrucao, validarDependencias } from './cadastro-mestre-reconstruction.mjs';
import { criarDiagnosticoCadastroMestre } from './cadastro-mestre-diagnostic.mjs';

const MAX_REQUEST = 4 * 1024 * 1024;
const MAX_FILE = 16 * 1024 * 1024;
const loteValido = value => typeof value === 'string' && /^CAD_UI_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const erroHttp = (status, message) => Object.assign(new Error(message), { httpStatus: status });

function configuracao(env, somenteLeitura = false) {
  const url = env.VITE_SUPABASE_URL;
  const admins = (env.CADASTRO_MESTRE_EXECUTION_ADMIN_IDS || '').split(',').map(v => v.trim()).filter(Boolean);
  if ((!somenteLeitura && env.CADASTRO_MESTRE_EXECUTION_ENABLED !== 'true') || !url || !env.VITE_SUPABASE_ANON_KEY ||
      !env.CADASTRO_MESTRE_DATABASE_URL || !env.CADASTRO_MESTRE_STORAGE_SECRET_KEY ||
      !env.CADASTRO_MESTRE_SNAPSHOT_BUCKET || !env.CADASTRO_MESTRE_APP_ORIGIN || !admins.length) {
    throw erroHttp(503, 'Execução administrativa indisponível. Solicite a configuração ao administrador.');
  }
  const projeto = new URL(url);
  const db = new URL(env.CADASTRO_MESTRE_DATABASE_URL);
  const ref = projeto.hostname.split('.')[0];
  const direto = db.hostname === `db.${ref}.supabase.co`;
  const pooler = db.hostname.endsWith('.pooler.supabase.com') && decodeURIComponent(db.username).endsWith(`.${ref}`);
  if (projeto.protocol !== 'https:' || !projeto.hostname.endsWith('.supabase.co') ||
      !['postgres:', 'postgresql:'].includes(db.protocol) || (!direto && !pooler) ||
      !/^[a-z0-9][a-z0-9_-]{0,62}$/.test(env.CADASTRO_MESTRE_SNAPSHOT_BUCKET) ||
      new URL(env.CADASTRO_MESTRE_APP_ORIGIN).origin !== env.CADASTRO_MESTRE_APP_ORIGIN) {
    throw erroHttp(503, 'Configuração administrativa inválida ou projeto divergente.');
  }
  // Não permitir que sslmode na URL substitua a validação TLS do driver.
  for (const key of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) db.searchParams.delete(key);
  return { url: projeto.origin, key: env.VITE_SUPABASE_ANON_KEY, admins,
    origin: env.CADASTRO_MESTRE_APP_ORIGIN, bucket: env.CADASTRO_MESTRE_SNAPSHOT_BUCKET,
    secret: env.CADASTRO_MESTRE_STORAGE_SECRET_KEY, database: db.toString(), ca: env.CADASTRO_MESTRE_DATABASE_CA };
}

function lerPedido(body) {
  if (typeof body === 'string') {
    if (Buffer.byteLength(body) > MAX_REQUEST) throw erroHttp(413, 'Arquivo/revisão excedem o limite de envio de 4 MiB.');
    try { body = JSON.parse(body); } catch { throw erroHttp(400, 'Pedido inválido.'); }
  }
  if (!body || Buffer.byteLength(JSON.stringify(body)) > MAX_REQUEST) throw erroHttp(413, 'Arquivo/revisão excedem o limite de envio de 4 MiB.');
  if (!loteValido(body.lote) || !/^[a-f0-9]{64}$/.test(body.hash_manifesto || '') ||
      body.confirmacao !== `RECONSTRUIR_MASTER:${body.hash_manifesto}` ||
      typeof body.nome !== 'string' || body.nome.length > 200 || /[\\/]/.test(body.nome) || [...body.nome].some(c => c.charCodeAt(0) < 32) ||
      !/\.(xls|xlsx|xlsm)$/i.test(body.nome) || typeof body.aba !== 'string' || body.aba.length > 200 ||
      !Array.isArray(body.decisoes) || body.decisoes.length > 30000 ||
      body.decisoes.some(d => typeof d?.id !== 'string' || d.id.length > 200 || d.status !== 'APROVADO') ||
      typeof body.arquivo_base64 !== 'string') {
    throw erroHttp(400, 'Arquivo, lote, confirmação ou aprovação integral inválidos.');
  }
  let bytes = Buffer.from(body.arquivo_base64, 'base64');
  if (bytes.toString('base64') !== body.arquivo_base64) throw erroHttp(400, 'Arquivo base64 inválido.');
  try {
    if (body.arquivo_encoding === 'gzip') bytes = gunzipSync(bytes, { maxOutputLength: MAX_FILE });
    else if (body.arquivo_encoding !== 'raw') throw new Error('Encoding inválido');
  } catch { throw erroHttp(400, 'Arquivo comprimido inválido ou maior que 16 MiB.'); }
  if (!bytes.length || bytes.length > MAX_FILE) throw erroHttp(413, 'Arquivo vazio ou maior que 16 MiB.');
  return { ...body, arquivo: { name: body.nome, arrayBuffer: async () => bytes } };
}

async function evidenciaAtual(client, pedido, leitor) {
  // Contexto integral mesmo com RLS; a execução relê novamente sob os locks centrais.
  await client.query('BEGIN READ ONLY');
  let contexto;
  try {
    await client.query("SET LOCAL TIME ZONE 'UTC'");
    await client.query('SET LOCAL row_security=off');
    contexto = await contextoAtual(client);
  } finally { await client.query('ROLLBACK'); }
  const { manifesto } = await prepararAprovacaoArquivoCadastroMestre(pedido.arquivo, contexto, leitor, pedido.aba);
  if (hashReconstrucao(manifesto) !== pedido.hash_manifesto) throw erroHttp(409, 'Arquivo ou contexto mudou após o Preview. Gere novo Preview e aprovação.');
  const revisao = { versao_contrato: manifesto.versao_contrato, vinculo_manifesto: serializarDeterministico(manifesto), decisoes: pedido.decisoes };
  try { criarPlanoReconstrucaoCadastroMestre(manifesto, revisao); }
  catch { throw erroHttp(400, 'Aprovação incompleta ou reconstrução bloqueada. Gere nova revisão.'); }
  return { manifesto, revisao };
}

async function snapshotPrivado(storage, bucket, referencia, snapshot) {
  const bytes = Buffer.from(JSON.stringify(snapshot, null, 2) + '\n');
  const { error } = await storage.from(bucket).upload(referencia, bytes, { contentType: 'application/json', upsert: false });
  if (error) throw erroHttp(503, 'Snapshot durável indisponível. O Master não será modificado.');
  const { data, error: readError } = await storage.from(bucket).download(referencia);
  if (readError || !data || sha(Buffer.from(await data.arrayBuffer())) !== sha(bytes)) {
    throw erroHttp(503, 'Não foi possível conferir o snapshot durável. O Master não será modificado.');
  }
  return `storage://${bucket}/${referencia}`;
}

async function verificarAmbiente(client, storage, cfg, habilitada, diagnostico) {
  diagnostico.iniciar('storage');
  const bucket = await storage.getBucket(cfg.bucket);
  if (bucket.error) {
    if (Number(bucket.error.status ?? bucket.error.statusCode) === 404 || bucket.error.code === 'NoSuchBucket') diagnostico.iniciar('bucket');
    throw Object.assign(erroHttp(503, 'Bucket privado ausente ou inacessível.'), {
      cause: bucket.error, status: bucket.error.status, statusCode: bucket.error.statusCode
    });
  }
  diagnostico.concluir();
  diagnostico.iniciar('bucket');
  if (bucket.data?.public !== false) throw erroHttp(503, 'Bucket privado ausente ou inacessível.');
  diagnostico.concluir();
  diagnostico.iniciar('leitura_postgresql');
  await client.query('BEGIN READ ONLY');
  let falha;
  let resultado;
  try {
    await client.query("SET LOCAL TIME ZONE 'UTC'");
    await client.query('SET LOCAL row_security=off');
    diagnostico.iniciar('dependencias');
    await validarDependencias(client);
    diagnostico.concluir();
    diagnostico.iniciar('leitura_postgresql');
    const contexto = await contextoAtual(client);
    diagnostico.concluir();
    diagnostico.iniciar('permissoes');
    const tabelas = ['dicionario_master_produtos', 'log_importacao_cadastro_mestre', 'historico_custos',
      'apontamentos_op', 'dicionario_produtos', 'mapa_produtos', 'categorias_origem', 'categorias_familia', 'categorias_agrupamento'];
    const { rows } = await client.query(`SELECT t AS tabela,
      has_table_privilege('public.' || t, 'SELECT') AS leitura,
      has_table_privilege('public.' || t, 'UPDATE,DELETE,TRUNCATE') AS lock,
      CASE WHEN t='dicionario_master_produtos' THEN
        has_table_privilege('public.' || t,'INSERT') AND has_table_privilege('public.' || t,'UPDATE') AND has_table_privilege('public.' || t,'DELETE')
      WHEN t='log_importacao_cadastro_mestre' THEN
        has_table_privilege('public.' || t,'INSERT') AND has_table_privilege('public.' || t,'UPDATE')
      ELSE true END AS escrita_exigida FROM unnest($1::text[]) t`, [tabelas]);
    const sequence = await client.query(`SELECT has_sequence_privilege(
      pg_get_serial_sequence('public.log_importacao_cadastro_mestre','id'),'USAGE') AS permitida`);
    if (rows.some(r => !r.leitura || !r.lock || !r.escrita_exigida) || sequence.rows[0]?.permitida !== true) {
      throw erroHttp(503, 'Permissões administrativas insuficientes. Nenhum privilégio será concedido automaticamente.');
    }
    diagnostico.concluir();
    diagnostico.iniciar('policies');
    const policies = await client.query("SELECT count(*)::int AS quantidade FROM pg_policies WHERE schemaname='storage' AND tablename='objects'");
    // Sem interpretar expressões arbitrárias de policies. Revisão explícita se houver acesso por cliente.
    if (policies.rows[0]?.quantidade !== 0) throw erroHttp(503, 'Policies de Storage exigem revisão antes da habilitação.');
    diagnostico.concluir();
    resultado = { pronto_para_habilitar: true, execucao_habilitada: habilitada, execucao_realizada: false,
      master_atual: contexto.produtos.length, bucket_privado: true, permissoes: true, dependencias: true,
      snapshot_upload_testado: false, rollback_producao_testado: false };
  } catch (error) { falha = error; }
  finally {
    // Não substituir a etapa/erro original caso o encerramento da leitura também falhe.
    try { await client.query('ROLLBACK'); }
    catch (error) { if (!falha) { diagnostico.iniciar('leitura_postgresql'); falha = error; } }
  }
  if (falha) throw falha;
  return resultado;
}

export function criarCadastroMestreWebHandler({ env = process.env, criarSupabase = createClient,
  criarClientePg = options => new pg.Client(options), leitor = SheetJS } = {}) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (!['GET', 'POST'].includes(req.method)) { res.setHeader('Allow', 'GET, POST'); return res.status(405).json({ error: 'Método não permitido.' }); }
    let client;
    let pedido;
    let executando = false;
    const diagnostico = req.method === 'GET' && req.query?.verificar === '1';
    const etapas = diagnostico ? criarDiagnosticoCadastroMestre() : null;
    try {
      if (req.query?.verificar !== undefined && !diagnostico) throw erroHttp(400, 'Diagnóstico disponível somente por GET verificar=1.');
      const cfg = configuracao(env, diagnostico || (req.method === 'GET' && !!req.query?.lote));
      etapas?.concluir('configuracao');
      etapas?.iniciar('origem');
      if ((req.method === 'POST' || req.headers.origin) && req.headers.origin !== cfg.origin) throw erroHttp(403, 'Origem não autorizada.');
      etapas?.concluir();
      etapas?.iniciar('autenticacao');
      const match = /^Bearer ([^\s]+)$/.exec(req.headers.authorization || '');
      if (!match) throw erroHttp(401, 'Entre na aplicação antes de executar a reconstrução.');
      const auth = criarSupabase(cfg.url, cfg.key, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data, error } = await auth.auth.getUser(match[1]);
      const user = data?.user;
      if (error || !user || user.is_anonymous) throw erroHttp(401, 'Sessão inválida ou expirada. Entre novamente.');
      etapas?.concluir();
      etapas?.iniciar('autorizacao');
      if (!cfg.admins.includes(user.id)) throw erroHttp(403, 'Usuário sem autorização administrativa para reconstruir o Master.');
      etapas?.concluir();
      const loteConsulta = req.query?.lote;
      if (diagnostico && loteConsulta) throw erroHttp(400, 'Diagnóstico e consulta de lote são ações separadas.');
      if (req.method === 'GET' && !loteConsulta && !diagnostico) return res.status(200).json({ disponivel: true });
      if (req.method === 'GET' && loteConsulta && !loteValido(loteConsulta)) throw erroHttp(400, 'Identificador de lote inválido.');
      if (req.method === 'POST') pedido = lerPedido(req.body);
      etapas?.iniciar('conexao_postgresql');
      client = criarClientePg({ connectionString: cfg.database, ssl: { rejectUnauthorized: true, ...(cfg.ca ? { ca: cfg.ca } : {}) }, connectionTimeoutMillis: 5000 });
      await client.connect();
      etapas?.concluir();
      etapas?.concluir('tls');
      if (diagnostico) {
        etapas.iniciar('storage');
        const storage = criarSupabase(cfg.url, cfg.secret, { auth: { persistSession: false, autoRefreshToken: false } }).storage;
        const resultado = await verificarAmbiente(client, storage, cfg, env.CADASTRO_MESTRE_EXECUTION_ENABLED === 'true', etapas);
        return res.status(200).json({ ...resultado, diagnostico: etapas.resultado() });
      }
      if (req.method === 'GET') {
        const { rows } = await client.query(`SELECT id::text AS lote_id,status,registros_inseridos AS inseridos,registros_atualizados AS atualizados,
          metadados_origem->'registros_removidos' AS removidos,metadados_origem->'master_depois' AS depois,
          metadados_origem->>'snapshot_referencia' AS snapshot_referencia FROM public.log_importacao_cadastro_mestre
          WHERE identificador_lote=$1 AND metadados_origem->>'contrato'='RECONSTRUCAO_UNIVERSO_V1'`, [loteConsulta]);
        return res.status(200).json({ identificador_lote: loteConsulta, resultado: rows[0] || null });
      }
      const storage = criarSupabase(cfg.url, cfg.secret, { auth: { persistSession: false, autoRefreshToken: false } }).storage;
      const bucket = await storage.getBucket(cfg.bucket);
      if (bucket.error || !bucket.data || bucket.data.public !== false) throw erroHttp(503, 'Snapshot exige bucket privado existente. Nenhum bucket será criado automaticamente.');
      const evidencia = await evidenciaAtual(client, pedido, leitor);
      executando = true;
      const referencia = `${pedido.lote}/${pedido.hash_manifesto}.json`;
      const result = await executarReconstrucaoCadastroMestre({ client, arquivo: pedido.arquivo, evidencia, leitor,
        identificadorLote: pedido.lote, autor: `supabase-auth:${user.id}`, confirmacao: pedido.confirmacao,
        salvarSnapshot: snapshot => snapshotPrivado(storage, cfg.bucket, referencia, snapshot) });
      return res.status(200).json({ ...result, identificador_lote: pedido.lote, snapshot_referencia: `storage://${cfg.bucket}/${referencia}` });
    } catch (error) {
      if (diagnostico) {
        const detalhe = etapas.resultado(error);
        return res.status(error.httpStatus || 409).json({ error: detalhe.mensagem,
          diagnostico: detalhe, execucao_realizada: false, execucao_habilitada: env.CADASTRO_MESTRE_EXECUTION_ENABLED === 'true' });
      }
      // Nenhum erro PostgreSQL/Storage, URL, token ou snapshot integral atravessa a fronteira HTTP.
      return res.status(error.httpStatus || 409).json({ error: error.httpStatus ? error.message :
        'Execução não confirmada. Consulte o lote antes de qualquer nova tentativa; pode ter ocorrido rollback ou perda da resposta do COMMIT.',
        identificador_lote: pedido?.lote || null, consultar_lote: executando });
    } finally { if (client) { try { await client.end(); } catch { /* Resposta/COMMIT não pode ser substituída por erro de encerramento. */ } } }
  };
}
