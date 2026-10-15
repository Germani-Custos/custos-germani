import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { normalizeCodigoProduto } from '../core/spreadsheet-engine.js';

const client = vi.hoisted(() => ({ from: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn(), upsert: vi.fn(), rpc: vi.fn() }));
vi.mock('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm', () => ({ createClient: () => client }));
vi.mock('../src/config/app-config.js', () => ({
  appConfig: { supabase: { url: 'https://example.supabase.co', anonKey: 'test-key' }, enableVerboseLogs: false },
  debugLog: vi.fn()
}));
import { api } from '../src/services/api.js';

const paginadas = ['dicionario_produtos', 'historico_custos', 'apontamentos_op'];
const codigo = index => String(index + 1).padStart(6, '0');
let tables;
let requests;
let alterarPagina;

beforeEach(() => {
  vi.clearAllMocks();
  tables = {
    dicionario_produtos: [], historico_custos: [], apontamentos_op: [],
    categorias_origem: [{ id: 'o1', descricao: 'Origem operacional' }],
    categorias_familia: [{ id: 'f1', descricao: 'Família operacional' }],
    categorias_agrupamento: [{ id: 'M005', descricao: 'Agrupamento Kustos' }]
  };
  requests = [];
  alterarPagina = (_table, _start, response) => response;
  client.from.mockImplementation(table => {
    if (!Object.hasOwn(tables, table)) throw new Error(`Fonte inesperada: ${table}`);
    const request = { table, fields: null, options: null, order: null, range: null };
    requests.push(request);
    const query = {
      select(fields, options) { request.fields = fields; request.options = options; return query; },
      order(key, options) { request.order = { key, options }; return query; },
      async range(start, end) {
        request.range = [start, end];
        const rows = [...tables[table]].sort((a, b) => String(a[request.order.key]).localeCompare(String(b[request.order.key])));
        // Reproduz teto da Data API inclusive se o cliente pedir mais que 1.000.
        return alterarPagina(table, start, { data: rows.slice(start, Math.min(end + 1, start + 1000)), count: rows.length, error: null });
      },
      then(resolve, reject) {
        return Promise.resolve({ data: tables[table].slice(0, 1000), error: null }).then(resolve, reject);
      }
    };
    return query;
  });
});

function semEscritasOuMasterERP() {
  for (const method of ['insert', 'update', 'delete', 'upsert', 'rpc']) expect(client[method]).not.toHaveBeenCalled();
  expect(client.from.mock.calls.every(([table]) => Object.hasOwn(tables, table))).toBe(true);
  expect(client.from).not.toHaveBeenCalledWith('dicionario_master_produtos');
}

describe('Cadastro operacional — leitura completa, sem Master ERP ou persistência', () => {
  it.each(paginadas.flatMap(table => [500, 1000, 1001, 1501].map(total => [table, total])))('%s com %i linhas: inclui a última página e termina no total exato', async (table, total) => {
    const field = table === 'apontamentos_op' ? 'cod_produto' : 'codigo_produto';
    tables[table] = Array.from({ length: total }, (_, index) => ({ [field]: codigo(index) }));
    if (table === 'dicionario_produtos') tables.historico_custos = [{ codigo_produto: codigo(total - 1) }];
    const result = await api.getProductMaster();
    expect(result.error).toBeNull();
    if (table === 'dicionario_produtos') {
      expect(result.data.produtos).toHaveLength(total);
      expect(result.data.produtos.at(-1).codigo_produto).toBe(codigo(total - 1));
      expect(result.data.ausentes).toEqual([]);
    } else {
      expect(result.data.ausentes).toHaveLength(total);
      expect(result.data.ausentes).toContain(codigo(total - 1));
    }
    const pages = requests.filter(r => r.table === table);
    expect(pages).toHaveLength(Math.ceil(total / 500));
    pages.forEach((page, index) => {
      expect(page.options).toEqual({ count: 'exact' });
      expect(page.order).toEqual({ key: field, options: { ascending: true } });
      expect(page.range).toEqual([index * 500, index * 500 + 499]);
    });
    semEscritasOuMasterERP();
  });

  it('fontes vazias retornam zero, sem página extra nem ausência artificial', async () => {
    const result = await api.getProductMaster();
    expect(result.error).toBeNull();
    expect(result.data.produtos).toEqual([]);
    expect(result.data.ausentes).toEqual([]);
    for (const table of paginadas) expect(requests.filter(r => r.table === table)).toHaveLength(1);
    semEscritasOuMasterERP();
  });

  it('volume atual sintético: 6.113 produtos, 1.370 Custos e 704 OP → 501 códigos únicos e zero ausentes', async () => {
    tables.dicionario_produtos = Array.from({ length: 6113 }, (_, index) => ({ codigo_produto: codigo(index),
      descricao: `Produto operacional ${index}`, origem_id: 'o1', familia_id: 'f1', agrupamento_cod: 'M005' }));
    tables.historico_custos = Array.from({ length: 1370 }, (_, index) => ({ codigo_produto: codigo(4000 + index % 501) }));
    tables.apontamentos_op = Array.from({ length: 704 }, (_, index) => ({ cod_produto: codigo(4000 + index % 501) }));
    const result = await api.getProductMaster();
    expect(result.error).toBeNull();
    expect(new Set([...tables.historico_custos.map(row => row.codigo_produto), ...tables.apontamentos_op.map(row => row.cod_produto)]
      .map(normalizeCodigoProduto))).toHaveProperty('size', 501);
    expect(result.data.produtos).toEqual(tables.dicionario_produtos);
    expect(result.data.ausentes).toEqual([]);
    expect(requests.filter(r => r.table === 'dicionario_produtos')).toHaveLength(13);
    expect(requests.filter(r => r.table === 'historico_custos')).toHaveLength(3);
    expect(requests.filter(r => r.table === 'apontamentos_op')).toHaveLength(2);
    expect(result.data.origens).toEqual(tables.categorias_origem);
    expect(result.data.familias).toEqual(tables.categorias_familia);
    expect(result.data.agrupamentos).toEqual(tables.categorias_agrupamento);
    semEscritasOuMasterERP();
  });

  it('normaliza e deduplica entre páginas e fatos, incluindo ausentes encontrados depois da milésima linha', async () => {
    tables.dicionario_produtos = [{ codigo_produto: '000001' }];
    tables.historico_custos = [...Array.from({ length: 1000 }, () => ({ codigo_produto: '000001' })),
      { codigo_produto: ' 900002 ' }, { codigo_produto: '9e5' }, { codigo_produto: null }];
    tables.apontamentos_op = [...Array.from({ length: 1000 }, () => ({ cod_produto: '000001' })),
      { cod_produto: '900002' }, { cod_produto: ' 900003 ' }];
    const result = await api.getProductMaster();
    expect(result.error).toBeNull();
    expect(result.data.ausentes).toEqual(['900000', '900002', '900003']);
    expect(result.data.produtos).toEqual([{ codigo_produto: '000001' }]);
    semEscritasOuMasterERP();
  });

  it.each(paginadas)('falha na segunda página de %s não vira sucesso com dados parciais', async table => {
    const field = table === 'apontamentos_op' ? 'cod_produto' : 'codigo_produto';
    tables[table] = Array.from({ length: 1001 }, (_, index) => ({ [field]: codigo(index) }));
    alterarPagina = (current, start, response) => current === table && start === 500
      ? { data: null, count: null, error: { message: 'Página indisponível' } } : response;
    const result = await api.getProductMaster();
    expect(result.data).toBeNull();
    expect(result.error).not.toBeNull();
    expect(result.error.details.cause).toBe('Página indisponível');
    semEscritasOuMasterERP();
  });

  it.each(['teto menor', 'contagem alterada', 'contagem ausente', 'dados ausentes'])('%s não produz contador parcial', async modo => {
    tables.dicionario_produtos = Array.from({ length: 1001 }, (_, index) => ({ codigo_produto: codigo(index) }));
    alterarPagina = (table, start, response) => {
      if (table !== 'dicionario_produtos') return response;
      if (modo === 'teto menor') return { ...response, data: response.data.slice(0, 100) };
      if (modo === 'contagem alterada' && start === 500) return { ...response, count: 1002 };
      if (modo === 'contagem ausente') return { ...response, count: null };
      if (modo === 'dados ausentes') return { ...response, data: null };
      return response;
    };
    const result = await api.getProductMaster();
    expect(result.data).toBeNull();
    expect(result.error).not.toBeNull();
    semEscritasOuMasterERP();
  });

  it('aviso HTML nomeia o cadastro operacional', () => {
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    expect(html).toContain('código(s) importado(s) ausente(s) do cadastro operacional.');
    expect(html).not.toContain('código(s) importado(s) ausente(s) do cadastro mestre.');
  });
});
