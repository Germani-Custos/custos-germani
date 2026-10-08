import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({ from: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn(), upsert: vi.fn(), rpc: vi.fn() }));
vi.mock('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm', () => ({ createClient: () => client }));
vi.mock('../src/config/app-config.js', () => ({
  appConfig: { supabase: { url: 'https://example.supabase.co', anonKey: 'test-key' }, enableVerboseLogs: false },
  debugLog: vi.fn()
}));
import { api } from '../src/services/api.js';
import { criarManifestoCadastroMestre, criarRevisaoCadastroMestre, decidirOperacoesCadastroMestre, obterOperacoesAprovadasCadastroMestre } from '../core/cadastro-mestre-approval-engine.js';

describe('api.getCadastroMestrePreviewContext', () => {
  beforeEach(() => vi.clearAllMocks());
  it('integra apenas leituras das três fontes do Preview sem chamar métodos de escrita', async () => {
    const tables = { dicionario_master_produtos: [{ codigo_produto: '1' }], categorias_origem: [{ codigo: '01' }], categorias_familia: [{ codigo: 'F1' }] };
    client.from.mockImplementation(table => ({ select: () => ({ order: () => ({ range: async () => ({ data: tables[table], count: tables[table].length, error: null }) }) }) }));
    const result = await api.getCadastroMestrePreviewContext();
    expect(result.error).toBeNull();
    expect(result.data.produtos).toEqual(tables.dicionario_master_produtos);
    expect(client.from.mock.calls.map(([table]) => table).sort()).toEqual(Object.keys(tables).sort());
    for (const method of ['insert', 'update', 'delete', 'upsert', 'rpc']) expect(client[method]).not.toHaveBeenCalled();
  });
  it('retorna erro explícito, não contexto vazio, em falha de acesso', async () => {
    client.from.mockImplementation(() => ({ select: () => ({ order: () => ({ range: async () => ({ data: null, count: null, error: { message: 'Acesso negado' } }) }) }) }));
    const result = await api.getCadastroMestrePreviewContext();
    expect(result.data).toBeNull();
    expect(result.error.message).toContain('contexto completo');
  });
  it('SELECT → manifesto → revisão sintética não chama persistência Supabase', async () => {
    const tables = { dicionario_master_produtos: [{ codigo_produto: '1', descricao: 'Atual', origem_cod: '01', familia_cod: 'F1', agrupamento_erp_valor: null }], categorias_origem: [{ codigo: '01' }], categorias_familia: [{ codigo: 'F1' }] };
    client.from.mockImplementation(table => ({ select: () => ({ order: () => ({ range: async () => ({ data: tables[table], count: tables[table].length, error: null }) }) }) }));
    const contexto = await api.getCadastroMestrePreviewContext();
    const m = criarManifestoCadastroMestre([{ codigo_produto: '1', descricao: 'Nova', tipo: 'P', descr_origem: 'Produzido', origem_cod: '01', familia_cod: 'F1', agrupamento_erp_valor: 'P005' }], contexto.data);
    const r = decidirOperacoesCadastroMestre(m, criarRevisaoCadastroMestre(m), m.operacoes.map(o => o.id), 'APROVADO');
    expect(obterOperacoesAprovadasCadastroMestre(m, r).operacoes).toHaveLength(2);
    for (const method of ['insert', 'update', 'delete', 'upsert', 'rpc']) expect(client[method]).not.toHaveBeenCalled();
  });
});
