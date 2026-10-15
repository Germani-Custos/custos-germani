import { beforeEach, describe, expect, it, vi } from 'vitest';
const client = vi.hoisted(() => ({ from: vi.fn(), upsert: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn(), rpc: vi.fn() }));
vi.mock('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm', () => ({ createClient: () => client }));
vi.mock('../src/config/app-config.js', () => ({ appConfig: { supabase: { url: 'https://example.supabase.co', anonKey: 'test-key' } }, debugLog: vi.fn() }));
import { api } from '../src/services/api.js';
let requests;
let tables;
let pagina;
beforeEach(() => {
  vi.clearAllMocks(); requests = [];
  tables = { dicionario_master_produtos: [], categorias_origem: [], categorias_familia: [] };
  pagina = (_table, _start, response) => response;
  client.from.mockImplementation(table => {
    if (!Object.hasOwn(tables, table)) throw new Error('Fonte operacional proibida');
    const request = { table };
    requests.push(request);
    return { select: (fields, options) => { Object.assign(request, { fields, options }); return {
      order: (key, order) => { Object.assign(request, { key, order }); return {
        range: async (start, end) => { Object.assign(request, { start, end }); return pagina(table, start, { data: tables[table].slice(start, end + 1), count: tables[table].length, error: null }); }
      }; }
    }; } };
  });
});

describe('API Master ERP — SELECTs integrais independentes do operacional', () => {
  it.each([0, 500, 860, 1000, 1001, 2501])('carrega %i produtos e conta sem truncamento', async total => {
    tables.dicionario_master_produtos = Array.from({ length: total }, (_, i) => ({ codigo_produto: String(i), agrupamento_erp_valor: 'P801' }));
    tables.categorias_origem = Array.from({ length: 1001 }, (_, i) => ({ id: i, codigo: String(i), descricao: `Origem ${i}` }));
    const result = await api.getCadastroMestreErp();
    expect(result.error).toBeNull();
    expect(result.data.produtos).toEqual(tables.dicionario_master_produtos);
    expect(result.data.origens).toEqual(tables.categorias_origem);
    const masterReads = requests.filter(r => r.table === 'dicionario_master_produtos');
    expect(masterReads).toHaveLength(Math.max(1, Math.ceil(total / 500)));
    masterReads.forEach((r, i) => expect(r).toMatchObject({ fields: '*', options: { count: 'exact' }, key: 'codigo_produto', order: { ascending: true }, start: i * 500, end: i * 500 + 499 }));
    for (const method of ['upsert', 'insert', 'update', 'delete', 'rpc']) expect(client[method]).not.toHaveBeenCalled();
    expect(client.from.mock.calls.every(([table]) => Object.hasOwn(tables, table))).toBe(true);
  });

  it.each(['erro', 'truncamento', 'contagem alterada'])('%s em página posterior não vira total parcial', async modo => {
    tables.dicionario_master_produtos = Array.from({ length: 1001 }, (_, i) => ({ codigo_produto: String(i) }));
    pagina = (table, start, response) => {
      if (table !== 'dicionario_master_produtos' || start !== 500) return response;
      if (modo === 'erro') return { ...response, error: { message: 'Leitura recusada' } };
      if (modo === 'truncamento') return { ...response, data: [] };
      return { ...response, count: 1002 };
    };
    const result = await api.getCadastroMestreErp();
    expect(result.data).toBeNull();
    expect(result.error).not.toBeNull();
  });
});
