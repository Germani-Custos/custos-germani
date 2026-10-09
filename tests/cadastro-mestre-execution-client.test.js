import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { gunzipSync } from 'node:zlib';
import { arquivoCadastro, contexto, SheetJS } from './fixtures/cadastro-mestre-arquivo.js';
import { prepararAprovacaoArquivoCadastroMestre } from '../src/services/cadastro-mestre-preview.js';
import { decidirOperacoesCadastroMestre } from '../core/cadastro-mestre-approval-engine.js';
import { hashReconstrucao } from '../scripts/lib/cadastro-mestre-reconstruction.mjs';
import { executarReconstrucaoPelaAplicacao, consultarDisponibilidadeReconstrucao, consultarLoteReconstrucao, verificarAmbienteReconstrucao } from '../src/services/cadastro-mestre-execution.js';

const lote = 'CAD_UI_11111111-1111-4111-8111-111111111111';
const client = { auth: { getSession: vi.fn() } };
async function pedido(formato = 'xls') {
  const arquivo = arquivoCadastro(formato);
  const { manifesto, revisao } = await prepararAprovacaoArquivoCadastroMestre(arquivo, contexto, SheetJS);
  return { arquivo, manifesto, revisao: decidirOperacoesCadastroMestre(manifesto, revisao, manifesto.operacoes.map(o => o.id), 'APROVADO'), lote };
}
describe('Cliente HTTP — transporta aprovação e bytes, nunca SQL/credenciais administrativas', () => {
  beforeEach(() => {
    client.auth.getSession.mockResolvedValue({ data: { session: { access_token: 'user-token' } }, error: null });
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ status: 'concluido', identificador_lote: lote, depois: 4 }) })));
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });
  it.each(['xls', 'xlsx', 'xlsm'])('envia %s com bytes originais, hash integral e decisões', async formato => {
    const p = await pedido(formato);
    await executarReconstrucaoPelaAplicacao(client, p);
    const [url, options] = fetch.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(url).toContain('/api/reconstruir-cadastro-mestre');
    expect(options.headers.Authorization).toBe('Bearer user-token');
    expect(body.hash_manifesto).toBe(hashReconstrucao(p.manifesto));
    const bytes = Buffer.from(body.arquivo_base64, 'base64');
    expect(Buffer.from(await p.arquivo.arrayBuffer())).toEqual(body.arquivo_encoding === 'gzip' ? gunzipSync(bytes) : bytes);
    expect(body.decisoes).toEqual(p.revisao.decisoes);
    expect(body.manifesto).toBeUndefined();
    expect(body.autor).toBeUndefined();
  });
  it('revisão parcial não faz sequer requisição', async () => {
    const p = await pedido();
    p.revisao.decisoes[0].status = 'PENDENTE';
    await expect(executarReconstrucaoPelaAplicacao(client, p)).rejects.toThrow('Todas as propostas');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('sessão ausente bloqueia envio', async () => {
    client.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    await expect(consultarDisponibilidadeReconstrucao(client)).rejects.toThrow('Entre');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('resultado divergente ou resposta perdida nunca dispara retry', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'concluido', identificador_lote: lote, depois: 9 }) });
    await expect(executarReconstrucaoPelaAplicacao(client, await pedido())).rejects.toThrow('Resultado não confirmado');
    expect(fetch).toHaveBeenCalledOnce();
    fetch.mockRejectedValueOnce(new Error('Connection reset'));
    await expect(executarReconstrucaoPelaAplicacao(client, await pedido())).rejects.toThrow(lote);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('consulta de resultado é GET com lote e sem payload', async () => {
    await consultarLoteReconstrucao(client, lote);
    expect(fetch.mock.calls[0][0]).toContain(`?lote=${lote}`);
    expect(fetch.mock.calls[0][1].method).toBe('GET');
    expect(fetch.mock.calls[0][1].body).toBeUndefined();
  });
  it('diagnóstico envia somente GET autenticado, sem original, decisão ou lote', async () => {
    await verificarAmbienteReconstrucao(client);
    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch.mock.calls[0][0]).toBe('/api/reconstruir-cadastro-mestre?verificar=1');
    expect(fetch.mock.calls[0][1]).toMatchObject({ method: 'GET', headers: { Authorization: 'Bearer user-token' } });
    expect(fetch.mock.calls[0][1].body).toBeUndefined();
  });
  it('erro do GET mantém status e diagnóstico sanitizado para inspeção sem repetir requisição', async () => {
    const diagnostico = { etapa: 'tls', codigo_original: 'SELF_SIGNED_CERT_IN_CHAIN', execucao_realizada: false };
    fetch.mockResolvedValueOnce({ ok: false, status: 409, json: async () => ({ error: 'Certificado autoassinado na cadeia TLS.', diagnostico }) });
    await expect(verificarAmbienteReconstrucao(client)).rejects.toMatchObject({ status: 409, diagnostico });
    expect(fetch).toHaveBeenCalledOnce();
  });
});
