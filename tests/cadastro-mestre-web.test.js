import { describe, expect, it, vi } from 'vitest';
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
  function setup({ publico = false, policies = 0, autorizado = true, permissao = true, dependencia = false } = {}) {
    const storage = storageWeb();
    storage.storage.getBucket.mockResolvedValue({ data: { public: publico }, error: null });
    const client = { connect: vi.fn(), end: vi.fn(), query: vi.fn(async (sql, params) => {
      if (sql.includes('FROM pg_trigger')) return { rows: [{ triggers: dependencia }] };
      if (sql.includes('FROM unnest')) return { rows: params[0].map(tabela => ({ tabela, leitura: permissao, lock: true, escrita_exigida: true })) };
      if (sql.includes('has_sequence_privilege')) return { rows: [{ permitida: permissao }] };
      if (sql.includes('FROM pg_policies')) return { rows: [{ quantidade: policies }] };
      if (sql.includes('FROM public.dicionario_master_produtos')) return { rows: [{ registro: { codigo_produto: '001' } }] };
      return { rows: [] };
    }) };
    const handler = criarCadastroMestreWebHandler({ env: { ...ambienteWeb, CADASTRO_MESTRE_EXECUTION_ENABLED: 'false' },
      criarClientePg: () => client, criarSupabase: autorizado ? storage.criarSupabase : () => ({ auth: { getUser: async () => ({ data: { user: { id: 'other-id' } } }) } }) });
    return { client, storage, handler };
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
  });
  it.each(['POST', 'DELETE'])('parâmetro de diagnóstico não habilita execução por %s', async method => {
    const { client, storage, handler } = setup();
    const res = respostaWeb();
    await handler(req({ method, query: { verificar: '1' }, body: {} }), res);
    expect([400, 405]).toContain(res.code);
    expect(client.connect).not.toHaveBeenCalled();
    expect(storage.upload).not.toHaveBeenCalled();
  });
});
