import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({ from: vi.fn(), upsert: vi.fn() }));
vi.mock('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm', () => ({ createClient: () => client }));
vi.mock('../src/config/app-config.js', () => ({
  appConfig: { supabase: { url: 'https://example.supabase.co', anonKey: 'test-key' }, enableVerboseLogs: false },
  debugLog: vi.fn()
}));
import { api } from '../src/services/api.js';

const original = { codigo_produto: '001', descricao: 'Produto', origem_id: 'o1', familia_id: 'f1', agrupamento_cod: 'M005' };
let stored;

describe('edição manual do Cadastro — CAD-UX-01', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stored = { ...original };
    client.upsert.mockImplementation(async payload => {
      stored = { ...stored, ...payload };
      return { error: null };
    });
    client.from.mockImplementation(() => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { ...stored }, error: null }) }) }),
      upsert: client.upsert
    }));
  });

  it('M005 → Sem agrupamento → recarregar → M006, preservando os demais campos', async () => {
    const result = await api.upsertProductMaster({ codigo_produto: ' 001 ', agrupamento_cod: '' });
    expect(result.error).toBeNull();
    expect(client.upsert).toHaveBeenLastCalledWith({ ...original, agrupamento_cod: null }, { onConflict: 'codigo_produto' });
    const reloaded = await client.from('dicionario_produtos').select().eq().maybeSingle();
    expect(reloaded.data).toEqual({ ...original, agrupamento_cod: null });
    await api.upsertProductMaster({ codigo_produto: '001', agrupamento_cod: 'M006' });
    expect(stored).toEqual({ ...original, agrupamento_cod: 'M006' });
    expect(client.from.mock.calls.every(([table]) => table === 'dicionario_produtos')).toBe(true);
  });

  it('editar descrição com agrupamento omitido preserva M005', async () => {
    await api.upsertProductMaster({ codigo_produto: '001', descricao: 'Nova descrição' });
    expect(stored).toEqual({ ...original, descricao: 'Nova descrição' });
  });

  it('não sinaliza sucesso quando a escrita falha', async () => {
    client.upsert.mockResolvedValue({ error: { message: 'Escrita negada' } });
    const result = await api.upsertProductMaster({ codigo_produto: '001', agrupamento_cod: null });
    expect(result.error).not.toBeNull();
    expect(stored).toEqual(original);
  });
});
