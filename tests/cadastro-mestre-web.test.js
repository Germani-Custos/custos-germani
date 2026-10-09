import { describe, expect, it, vi } from 'vitest';
import pg from 'pg';
import { rootCertificates } from 'node:tls';
import { criarCadastroMestreWebHandler } from '../scripts/lib/cadastro-mestre-web.mjs';
import { ambienteWeb, respostaWeb, storageWeb } from './fixtures/cadastro-mestre-web.js';
const req = (extras = {}) => ({ method: 'GET', headers: { authorization: 'Bearer valid-token', origin: ambienteWeb.CADASTRO_MESTRE_APP_ORIGIN }, ...extras });

describe('Fronteira administrativa HTTP — sem conexão real', () => {
  function setup({ env = ambienteWeb, user = { id: 'admin-id' }, error = null } = {}) {
    const getUser = vi.fn().mockResolvedValue({ data: { user }, error });
    const criarClientePg = vi.fn(() => { throw new Error('Conexão proibida neste teste'); });
    const handler = criarCadastroMestreWebHandler({ env, criarSupabase: () => ({ auth: { getUser } }), criarClientePg });
    return { handler, criarClientePg, getUser };
  }
  it('habilitação ausente falha fechada, sem autenticar/conectar', async () => {
    const { handler, criarClientePg, getUser } = setup({ env: { ...ambienteWeb, CADASTRO_MESTRE_EXECUTION_ENABLED: 'false' } });
    const res = respostaWeb();
    await handler(req(), res);
    expect(res.code).toBe(503);
    expect(getUser).not.toHaveBeenCalled();
    expect(criarClientePg).not.toHaveBeenCalled();
  });
  it.each([{ headers: {} }, { user: { id: 'other-id' } }, { user: { id: 'admin-id', is_anonymous: true } }, { error: new Error('expired') }])('bloqueia acesso ausente/não administrativo/anônimo/expirado (%j)', async input => {
    const { handler, criarClientePg } = setup(input);
    const res = respostaWeb();
    await handler(req(input.headers ? { headers: input.headers } : {}), res);
    expect([401, 403]).toContain(res.code);
    expect(criarClientePg).not.toHaveBeenCalled();
  });
  it('não confia em user_metadata nem em autor enviado pelo cliente', async () => {
    const { handler, criarClientePg } = setup({ user: { id: 'other-id', user_metadata: { admin: true, role: 'admin' } } });
    const res = respostaWeb();
    await handler(req({ method: 'POST', body: { autor: 'admin-id' } }), res);
    expect(res.code).toBe(403);
    expect(criarClientePg).not.toHaveBeenCalled();
  });
  it('consulta de disponibilidade só valida identidade/configuração, não abre transação', async () => {
    const { handler, criarClientePg, getUser } = setup();
    const res = respostaWeb();
    await handler(req(), res);
    expect(res.body).toEqual({ disponivel: true });
    expect(getUser).toHaveBeenCalledWith('valid-token');
    expect(criarClientePg).not.toHaveBeenCalled();
  });
  it('POST de origem divergente é bloqueado antes da autenticação e conexão', async () => {
    const { handler, criarClientePg, getUser } = setup();
    const res = respostaWeb();
    await handler(req({ method: 'POST', headers: { authorization: 'Bearer valid-token', origin: 'https://outro.example' } }), res);
    expect(res.code).toBe(403);
    expect(getUser).not.toHaveBeenCalled();
    expect(criarClientePg).not.toHaveBeenCalled();
  });
  it('configuração apontando a outro projeto é recusada', async () => {
    const { handler, criarClientePg } = setup({ env: { ...ambienteWeb, CADASTRO_MESTRE_DATABASE_URL: 'postgresql://postgres:test@db.outro.supabase.co/postgres' } });
    const res = respostaWeb();
    await handler(req(), res);
    expect(res.code).toBe(503);
    expect(criarClientePg).not.toHaveBeenCalled();
  });
  it.each([{}, '{invalid', JSON.stringify({ arquivo_base64: 'a'.repeat(4 * 1024 * 1024) })])('pedido inválido ou grande não conecta', async body => {
    const { handler, criarClientePg } = setup();
    const res = respostaWeb();
    await handler(req({ method: 'POST', body }), res);
    expect([400, 413]).toContain(res.code);
    expect(criarClientePg).not.toHaveBeenCalled();
    expect(JSON.stringify(res.body)).not.toContain('secret-test');
  });
});

describe('Diagnóstico autenticado somente leitura com execução desabilitada', () => {
  function setup({ publico = false, policies = 0, autorizado = true, permissao = true, dependencia = false,
    connectError, bucketError, queryError, rollbackError, env = {}, authError } = {}) {
    const storage = storageWeb();
    storage.storage.getBucket.mockResolvedValue({ data: { public: publico }, error: bucketError || null });
    const client = { connect: connectError ? vi.fn().mockRejectedValue(connectError) : vi.fn(), end: vi.fn(), query: vi.fn(async (sql, params) => {
      if (sql === 'ROLLBACK' && rollbackError) throw rollbackError;
      if (sql.includes('FROM pg_trigger') && queryError) throw queryError;
      if (sql.includes('FROM pg_trigger')) return { rows: [{ triggers: dependencia }] };
      if (sql.includes('FROM unnest')) return { rows: params[0].map(tabela => ({ tabela, leitura: permissao, lock: true, escrita_exigida: true })) };
      if (sql.includes('has_sequence_privilege')) return { rows: [{ permitida: permissao }] };
      if (sql.includes('FROM pg_policies')) return { rows: [{ quantidade: policies }] };
      if (sql.includes('FROM public.dicionario_master_produtos')) return { rows: [{ registro: { codigo_produto: '001' } }] };
      return { rows: [] };
    }) };
    const ambiente = { ...ambienteWeb, CADASTRO_MESTRE_EXECUTION_ENABLED: 'false', ...env };
    const handler = criarCadastroMestreWebHandler({ env: ambiente,
      criarClientePg: options => {
        // Parser real do driver, sem conectar a PostgreSQL.
        client.connectionParameters = new pg.Client(options).connectionParameters;
        return client;
      }, criarSupabase: autorizado && !authError ? storage.criarSupabase : () => ({ auth: { getUser: async () => ({ data: { user: { id: 'other-id' } }, error: authError }) } }) });
    return { client, storage, handler, ambiente };
  }
  it('valida infraestrutura sem DML, upload, lote ou executor', async () => {
    const { client, storage, handler } = setup();
    const res = respostaWeb();
    await handler(req({ query: { verificar: '1' } }), res);
    expect(res.code).toBe(200);
    expect(res.body).toMatchObject({ pronto_para_habilitar: true, execucao_habilitada: false, execucao_realizada: false,
      master_atual: 1, snapshot_upload_testado: false, rollback_producao_testado: false });
    expect(client.query.mock.calls[0][0]).toBe('BEGIN READ ONLY');
    expect(client.query.mock.calls.at(-1)[0]).toBe('ROLLBACK');
    expect(client.query.mock.calls.every(([sql]) => /^(BEGIN READ ONLY|SET LOCAL|SELECT|ROLLBACK)/.test(sql))).toBe(true);
    expect(storage.upload).not.toHaveBeenCalled();
    expect(storage.download).not.toHaveBeenCalled();
    expect(JSON.stringify(res.body)).not.toContain(ambienteWeb.CADASTRO_MESTRE_STORAGE_SECRET_KEY);
    for (const etapa of ['configuracao', 'conexao_postgresql', 'tls', 'storage', 'bucket', 'autenticacao', 'autorizacao']) {
      expect(res.body.diagnostico.etapas[etapa]).toBe('OK');
    }
  });
  it.each([{ publico: true }, { policies: 1 }, { permissao: false }, { dependencia: true }])('recusa bucket/policies/permissões/dependências inválidos (%j)', async input => {
    const { client, storage, handler } = setup(input);
    const res = respostaWeb();
    await handler(req({ query: { verificar: '1' } }), res);
    expect([503, 409]).toContain(res.code);
    expect(client.query.mock.calls.every(([sql]) => /^(BEGIN READ ONLY|SET LOCAL|SELECT|ROLLBACK)/.test(sql))).toBe(true);
    expect(storage.upload).not.toHaveBeenCalled();
    if (!input.publico) expect(client.query.mock.calls.at(-1)[0]).toBe('ROLLBACK');
  });
  it('usuário não autorizado não abre conexão de diagnóstico', async () => {
    const { client, handler } = setup({ autorizado: false });
    const res = respostaWeb();
    await handler(req({ query: { verificar: '1' } }), res);
    expect(res.code).toBe(403);
    expect(client.connect).not.toHaveBeenCalled();
    expect(res.body.diagnostico.ca_presente).toBeUndefined();
    expect(res.body.diagnostico.postgres_host).toBeUndefined();
  });
  it.each(['POST', 'DELETE'])('parâmetro de diagnóstico não habilita execução por %s', async method => {
    const { client, storage, handler } = setup();
    const res = respostaWeb();
    await handler(req({ method, query: { verificar: '1' }, body: {} }), res);
    expect([400, 405]).toContain(res.code);
    expect(client.connect).not.toHaveBeenCalled();
    expect(storage.upload).not.toHaveBeenCalled();
  });
  const canario = 'SEGREDO-NAO-PODE-SAIR';
  const erroSecreto = code => Object.assign(new Error(`postgresql://senha:${canario}@host/db`), {
    code, detail: canario, hint: canario, stack: canario, cause: { message: canario }
  });
  it.each([rootCertificates[0], '-----BEGIN CERTIFICATE-----\\nINVALIDO\\n-----END CERTIFICATE-----'])('inspeciona CA no GET autorizado antes da falha TLS, sem reparar configuração', async ca => {
    const { client, storage, handler, ambiente } = setup({ connectError: erroSecreto('SELF_SIGNED_CERT_IN_CHAIN'), env: {
      CADASTRO_MESTRE_DATABASE_CA: ca,
      CADASTRO_MESTRE_DATABASE_URL: `postgresql://postgres.teste:${canario}@aws-0-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=require`
    } });
    const res = respostaWeb();
    await handler(req({ query: { verificar: '1' } }), res);
    expect(res.code).toBe(409);
    expect(res.body.diagnostico).toMatchObject({ ca_presente: true, ca_tamanho: Buffer.byteLength(ca),
      ca_x509_valido: ca === rootCertificates[0], postgres_host: 'aws-0-sa-east-1.pooler.supabase.com',
      postgres_port: 5432, postgres_database: 'postgres', postgres_user_sanitizado: 'postgres.[PROJECT_REF]',
      postgres_ssl_ca_configurado: true, postgres_ssl_ca_corresponde_variavel: true,
      tls_codigo: 'SELF_SIGNED_CERT_IN_CHAIN', tls_mensagem_sanitizada: 'Certificado autoassinado na cadeia TLS.', execucao_realizada: false });
    expect(client.connectionParameters.ssl).toEqual({ rejectUnauthorized: true, ca });
    expect(ambiente.CADASTRO_MESTRE_DATABASE_CA).toBe(ca);
    expect(ambiente.CADASTRO_MESTRE_EXECUTION_ENABLED).toBe('false');
    for (const segredo of [ca, canario, ambiente.CADASTRO_MESTRE_DATABASE_URL, ambiente.CADASTRO_MESTRE_STORAGE_SECRET_KEY, 'valid-token']) {
      expect(JSON.stringify(res.body)).not.toContain(segredo);
    }
    expect(client.query).not.toHaveBeenCalled();
    expect(storage.storage.getBucket).not.toHaveBeenCalled();
    expect(storage.upload).not.toHaveBeenCalled();
  });
  it.each([
    ['SELF_SIGNED_CERT_IN_CHAIN', 'tls'], ['ERR_TLS_CERT_ALTNAME_INVALID', 'tls'],
    ['ERR_OSSL_PEM_NO_START_LINE', 'tls'], ['ENOTFOUND', 'conexao_postgresql'],
    ['ECONNREFUSED', 'conexao_postgresql'], ['28P01', 'conexao_postgresql'],
    [canario, 'conexao_postgresql']
  ])('conexão recusada %s identifica etapa %s sem vazar credenciais', async (code, etapa) => {
    const { client, storage, handler, ambiente } = setup({ connectError: erroSecreto(code) });
    const res = respostaWeb();
    await handler(req({ query: { verificar: '1' } }), res);
    expect(res.code).toBe(409);
    expect(res.body.diagnostico).toMatchObject({ etapa, codigo_original: code === canario ? 'NAO_CLASSIFICADO' : code, execucao_realizada: false });
    expect(res.body.diagnostico.etapas.autorizacao).toBe('OK');
    expect(res.body.diagnostico.etapas.storage).toBe('NAO_VERIFICADO');
    expect(JSON.stringify(res.body)).not.toContain(canario);
    expect(JSON.stringify(res.body)).not.toContain('postgresql://');
    expect(client.query).not.toHaveBeenCalled();
    expect(client.end).toHaveBeenCalledOnce();
    expect(storage.storage.getBucket).not.toHaveBeenCalled();
    expect(storage.upload).not.toHaveBeenCalled();
    expect(ambiente.CADASTRO_MESTRE_EXECUTION_ENABLED).toBe('false');
  });
  it.each([[401, 'storage'], [403, 'storage'], [404, 'bucket']])('distingue Storage HTTP %s da etapa %s', async (statusCode, etapa) => {
    const { handler, client, storage } = setup({ bucketError: { statusCode: String(statusCode), message: canario } });
    const res = respostaWeb();
    await handler(req({ query: { verificar: '1' } }), res);
    expect(res.code).toBe(503);
    expect(res.body.diagnostico).toMatchObject({ etapa, codigo_original: `STORAGE_HTTP_${statusCode}` });
    expect(JSON.stringify(res.body)).not.toContain(canario);
    expect(client.query).not.toHaveBeenCalled();
    expect(storage.upload).not.toHaveBeenCalled();
    expect(storage.storage.from).not.toHaveBeenCalled();
  });
  it('reconhece código de bucket na API moderna sem expor mensagem/statusCode arbitrário', async () => {
    const { handler, client } = setup({ bucketError: { status: 400, statusCode: canario, code: 'NoSuchBucket', message: canario } });
    const res = respostaWeb();
    await handler(req({ query: { verificar: '1' } }), res);
    expect(res.body.diagnostico).toMatchObject({ etapa: 'bucket', codigo_original: 'NoSuchBucket' });
    expect(JSON.stringify(res.body)).not.toContain(canario);
    expect(client.query).not.toHaveBeenCalled();
  });
  it('falha no encerramento da leitura não retorna sucesso', async () => {
    const { handler } = setup({ rollbackError: erroSecreto('ECONNRESET') });
    const res = respostaWeb();
    await handler(req({ query: { verificar: '1' } }), res);
    expect(res.code).toBe(409);
    expect(res.body.diagnostico).toMatchObject({ etapa: 'leitura_postgresql', codigo_original: 'ECONNRESET' });
    expect(res.body.pronto_para_habilitar).toBeUndefined();
  });
  it.each([
    [{ env: { CADASTRO_MESTRE_DATABASE_URL: '' } }, 'configuracao', 503],
    [{ env: { CADASTRO_MESTRE_DATABASE_URL: canario } }, 'configuracao', 409],
    [{ authError: erroSecreto(canario) }, 'autenticacao', 401],
    [{ autorizado: false }, 'autorizacao', 403]
  ])('identifica guarda anterior à conexão sem detalhes sensíveis (%j)', async (input, etapa, status) => {
    const { handler, client, storage } = setup(input);
    const res = respostaWeb();
    await handler(req({ query: { verificar: '1' } }), res);
    expect(res.code).toBe(status);
    expect(res.body.diagnostico.etapa).toBe(etapa);
    expect(JSON.stringify(res.body)).not.toContain(canario);
    expect(client.connect).not.toHaveBeenCalled();
    expect(storage.storage.getBucket).not.toHaveBeenCalled();
  });
  it('preserva erro original da leitura mesmo quando ROLLBACK também falha', async () => {
    const { handler, client, storage } = setup({ queryError: erroSecreto('42501'), rollbackError: erroSecreto('ECONNRESET') });
    const res = respostaWeb();
    await handler(req({ query: { verificar: '1' } }), res);
    expect(res.body.diagnostico).toMatchObject({ etapa: 'dependencias', codigo_original: '42501' });
    expect(client.query.mock.calls.at(-1)[0]).toBe('ROLLBACK');
    expect(client.query.mock.calls.every(([sql]) => /^(BEGIN READ ONLY|SET LOCAL|SELECT|ROLLBACK)/.test(sql))).toBe(true);
    expect(JSON.stringify(res.body)).not.toContain(canario);
    expect(storage.upload).not.toHaveBeenCalled();
  });
});
