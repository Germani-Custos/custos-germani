import { beforeEach, describe, expect, it, vi } from 'vitest';
import { calculateCascadeOptions } from '../core/report-engine.js';

const client = vi.hoisted(() => ({ from: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn(), upsert: vi.fn(), rpc: vi.fn() }));
vi.mock('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm', () => ({ createClient: () => client }));
vi.mock('../src/config/app-config.js', () => ({
  appConfig: { supabase: { url: 'https://example.supabase.co', anonKey: 'test-key' }, enableVerboseLogs: false }, debugLog: vi.fn()
}));
import { api } from '../src/services/api.js';

const codigo = index => String(100000 + index);
const filters = { start: '2026-02-01', end: '2027-03-15' };
let tables;
let requests;
let alterarPagina;

beforeEach(() => {
  vi.clearAllMocks();
  tables = {
    historico_custos: [], dicionario_produtos: [],
    categorias_origem: [{ id: 'o1', descricao: 'Origem operacional' }],
    categorias_familia: [{ id: 'f1', descricao: 'Família operacional' }],
    categorias_agrupamento: [{ id: 'M005', descricao: 'Agrupamento Kustos' }]
  };
  requests = [];
  alterarPagina = (_request, response) => response;
  client.from.mockImplementation(table => {
    if (!Object.hasOwn(tables, table)) throw new Error(`Fonte fora do escopo de Custos: ${table}`);
    const request = { table, fields: null, options: null, orders: [], filters: [], range: null };
    requests.push(request);
    const query = {
      select(fields, options) { request.fields = fields; request.options = options; return query; },
      order(key, options) { request.orders.push({ key, ...options }); return query; },
      eq(key, value) { request.filters.push({ key, value, op: 'eq' }); return query; },
      in(key, value) { request.filters.push({ key, value, op: 'in' }); return query; },
      gte(key, value) { request.filters.push({ key, value, op: 'gte' }); return query; },
      lte(key, value) { request.filters.push({ key, value, op: 'lte' }); return query; },
      async range(start, end) {
        request.range = [start, end];
        const rows = tables[table].filter(row => request.filters.every(({ key, value, op }) => {
          if (op === 'eq') return row[key] === value;
          if (op === 'in') return value.includes(row[key]);
          if (op === 'gte') return row[key] >= value;
          return row[key] <= value;
        })).slice().sort((a, b) => {
          for (const { key, ascending } of request.orders) {
            const cmp = typeof a[key] === 'number' ? a[key] - b[key] : String(a[key]).localeCompare(String(b[key]));
            if (cmp) return ascending ? cmp : -cmp;
          }
          return 0;
        });
        // Simula a Data API: consulta sem range retornaria no máximo 1.000.
        const data = rows.slice(start, Math.min(end + 1, start + 1000)).map(row => request.fields === '*'
          ? { ...row } : Object.fromEntries(request.fields.split(',').map(field => [field.trim(), row[field.trim()]])));
        return alterarPagina(request, { data, count: rows.length, error: null });
      },
      then() { throw new Error('Consulta sem paginação na Auditoria de Custos'); }
    };
    return query;
  });
});

function base(total = 1370, produtos = total) {
  tables.dicionario_produtos = Array.from({ length: produtos }, (_, i) => ({
    codigo_produto: codigo(i), descricao: `Produto ${i}`, origem_id: 'o1', familia_id: 'f1', agrupamento_cod: 'M005'
  }));
  tables.historico_custos = Array.from({ length: total }, (_, i) => ({
    id: i + 1, codigo_produto: codigo(i % produtos), descricao: 'Descrição do fato', custo_total: 100,
    data_referencia: '2026-06-01', criado_em: '2026-06-10T10:00:00Z'
  })).reverse();
}

function somenteLeituras() {
  for (const method of ['insert', 'update', 'delete', 'upsert', 'rpc']) expect(client[method]).not.toHaveBeenCalled();
  expect(requests.every(r => r.options?.count === 'exact' && r.range !== null)).toBe(true);
  expect(client.from).not.toHaveBeenCalledWith('dicionario_master_produtos');
  expect(client.from).not.toHaveBeenCalledWith('apontamentos_op');
}

describe('Custos — fontes completas para hierarquia e diagnóstico', () => {
  it('6.113 produtos e 1.370 fatos: encontra os 437 códigos mesmo fora da primeira página operacional', async () => {
    base(1370, 6113);
    tables.historico_custos.forEach((row, i) => { row.codigo_produto = codigo(4000 + i % 437); });
    const before = globalThis.structuredClone(tables);
    const masters = await api.getMasters();
    expect(masters.error).toBeNull();
    expect(masters.produtos).toHaveLength(437);
    expect(masters.dicionario).toHaveLength(437);
    expect(masters.hierarquia).toHaveLength(437);
    expect(masters.origens).toEqual(tables.categorias_origem);
    expect(masters.familias).toEqual(tables.categorias_familia);
    const cascade = calculateCascadeOptions({ origem: 'o1', familia: 'f1', agrupamento: 'M005' }, masters);
    expect(cascade.productOptions).toHaveLength(437);
    expect(cascade.familyOptions).toEqual([{ value: 'f1', label: 'Família operacional' }]);
    const historyPages = requests.filter(r => r.fields === 'codigo_produto, descricao');
    expect(historyPages.map(r => r.range[0])).toEqual([0, 500, 1000]);
    expect(historyPages.every(r => JSON.stringify(r.orders) === JSON.stringify([
      { key: 'codigo_produto', ascending: true }, { key: 'id', ascending: true }
    ]))).toBe(true);
    expect(requests.filter(r => r.table === 'dicionario_produtos' && r.fields.includes('familia_id'))).toHaveLength(13);
    expect(tables).toEqual(before);
    somenteLeituras();
  });

  it('considera fatos, produtos e categorias posteriores à milésima linha no diagnóstico', async () => {
    base(1501);
    tables.dicionario_produtos.forEach(row => { row.agrupamento_cod = null; });
    tables.dicionario_produtos.at(-1).agrupamento_cod = 'M1500';
    tables.categorias_agrupamento = Array.from({ length: 1501 }, (_, i) => ({ id: `M${String(i).padStart(4, '0')}`, descricao: `Grupo ${i}` }));
    const masters = await api.getMasters();
    expect(masters.error).toBeNull();
    expect(masters.diagnostico_sem_mapa.status).toBe('ok');
    expect(masters.diagnostico_sem_mapa.rows).toHaveLength(1500);
    expect(masters.diagnostico_sem_mapa.rows).toContainEqual({ codigo_produto: codigo(1499) });
    expect(masters.diagnostico_sem_mapa.rows).not.toContainEqual({ codigo_produto: codigo(1500) });
    somenteLeituras();
  });

  it.each([0, 500, 1000, 1001, 1501])('conjunto com %i fatos/produtos termina no total exato', async total => {
    base(total);
    const masters = await api.getMasters();
    const historico = await api.getHistorico(filters);
    expect(masters.error).toBeNull();
    expect(masters.produtos).toHaveLength(total);
    expect(historico.error).toBeNull();
    expect(historico.data).toHaveLength(total);
    expect(requests.filter(r => r.table === 'historico_custos' && r.fields === '*')).toHaveLength(Math.max(1, Math.ceil(total / 500)));
    somenteLeituras();
  });

  it.each(['historico_custos', 'dicionario_produtos', 'categorias_familia'])('falha na página seguinte de %s bloqueia a hierarquia inteira', async table => {
    base();
    if (table === 'categorias_familia') tables[table] = Array.from({ length: 1001 }, (_, i) => ({ id: `f${i}`, descricao: `Família ${i}` }));
    alterarPagina = (r, response) => r.table === table && r.range[0] === 500
      ? { data: null, count: null, error: { message: 'Falha de página' } } : response;
    const masters = await api.getMasters();
    expect(masters.error).not.toBeNull();
    expect(masters.produtos).toEqual([]);
    expect(masters.hierarquia).toEqual([]);
    somenteLeituras();
  });

  it('falha somente no diagnóstico é indisponibilidade explícita, nunca zero válido', async () => {
    base();
    alterarPagina = (r, response) => r.fields === 'codigo_produto, agrupamento_cod' && r.range[0] === 500
      ? { data: null, count: null, error: { message: 'Diagnóstico indisponível' } } : response;
    const masters = await api.getMasters();
    expect(masters.error).toBeNull();
    expect(masters.diagnostico_sem_mapa.status).toBe('indisponivel');
    expect(masters.diagnostico_sem_mapa.error).not.toBeNull();
    somenteLeituras();
  });
});

describe('Custos — leitura temporal completa antes de enriquecer e filtrar', () => {
  it('desempata competências iguais por id e não cria nem modifica classificações', async () => {
    base();
    tables.dicionario_produtos[1000] = { ...tables.dicionario_produtos[1000], origem_id: null, familia_id: null, agrupamento_cod: null };
    const before = globalThis.structuredClone(tables);
    const result = await api.getHistorico(filters);
    expect(result.data.map(row => row.id)).toEqual(Array.from({ length: 1370 }, (_, i) => i + 1));
    expect(result.data[1000]).toMatchObject({ origem_id: null, familia_id: null, agrupamento_cod: null });
    expect(tables).toEqual(before);
    expect(requests.filter(r => r.table === 'historico_custos').every(r => JSON.stringify(r.orders) === JSON.stringify([
      { key: 'data_referencia', ascending: true }, { key: 'id', ascending: true }
    ]))).toBe(true);
    somenteLeituras();
  });

  it('enriquece produtos além da primeira página antes de aplicar Origem/Família/Agrupamento/Item', async () => {
    base(1501);
    const last = tables.dicionario_produtos.at(-1);
    Object.assign(last, { origem_id: 'o2', familia_id: 'f2', agrupamento_cod: 'M099' });
    const result = await api.getHistorico({ ...filters, origem: 'o2', familia: 'f2', agrupamento: 'M099', item: last.codigo_produto });
    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject(last);
    expect(requests.filter(r => r.table === 'dicionario_produtos').every(r => r.filters[0].value.length <= 500)).toBe(true);
    somenteLeituras();
  });

  it.each(['intervalo', 'comparacao'])('%s preserva recorte em todas as páginas sem incluir competências intermediárias indevidas', async mode => {
    base(1503, 1);
    tables.historico_custos.forEach(row => { row.data_referencia = ['2026-06-01', '2026-07-01', '2026-08-01'][row.id % 3]; });
    const temporal = { start: '2026-06-01', end: '2026-08-01', ...(mode === 'comparacao' ? { competencias: ['2026-06-01', '2026-08-01'] } : {}) };
    const result = await api.getHistorico(temporal);
    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(mode === 'comparacao' ? 1002 : 1503);
    expect(new Set(result.data.map(r => r.data_referencia)).size).toBe(mode === 'comparacao' ? 2 : 3);
    const pages = requests.filter(r => r.table === 'historico_custos');
    expect(pages.every(r => r.filters.length === (mode === 'comparacao' ? 1 : 2))).toBe(true);
    somenteLeituras();
  });

  it.each(['erro', 'rejeicao', 'contagem ausente', 'contagem alterada', 'pagina curta', 'ultima pagina curta'])('%s impede sucesso parcial', async mode => {
    base();
    alterarPagina = (r, response) => {
      if (r.table !== 'historico_custos') return response;
      if (mode === 'rejeicao' && r.range[0] === 500) throw new Error('Rede indisponível');
      if (mode === 'erro' && r.range[0] === 500) return { data: null, count: null, error: { message: 'Falha' } };
      if (mode === 'contagem ausente') return { ...response, count: null };
      if (mode === 'contagem alterada' && r.range[0] === 500) return { ...response, count: 1371 };
      if (mode === 'pagina curta' || (mode === 'ultima pagina curta' && r.range[0] === 1000)) return { ...response, data: response.data.slice(0, -1) };
      return response;
    };
    const result = await api.getHistorico(filters);
    expect(result.error).not.toBeNull();
    expect(result.data).toBeNull();
    somenteLeituras();
  });

  it('erro na leitura da dimensão após fatos completos também bloqueia o resultado', async () => {
    base();
    alterarPagina = (r, response) => r.table === 'dicionario_produtos' && r.filters[0].value.includes(codigo(700))
      ? { data: null, count: null, error: { message: 'Dimensão indisponível' } } : response;
    const result = await api.getHistorico(filters);
    expect(result.data).toBeNull();
    expect(result.error).not.toBeNull();
    somenteLeituras();
  });
});

describe('Custos — gráficos e drill-through sem teto de fatos', () => {
  it.each(['getLatestImportComparison', 'getTopVariacoesImportacao'])('%s alcança a importação anterior após mais de 1.000 fatos e enriquece a base completa', async method => {
    base(1501);
    const previous = tables.historico_custos.map(row => ({ ...row, id: row.id + 1501, criado_em: '2026-05-10T10:00:00Z', custo_total: 80 }));
    tables.historico_custos.push(...previous);
    const result = await api[method]({ ...filters, origem: 'o1', familia: 'f1', agrupamento: 'M005' });
    expect(result.error).toBeNull();
    expect(result.data.imports).toHaveLength(2);
    if (method === 'getLatestImportComparison') {
      expect(result.data.imports.map(r => r.quantidade)).toEqual([1501, 1501]);
      expect(result.data.resumo).toEqual({ variacao_percentual_media: 25, delta_media: 20 });
    } else {
      expect(result.data.aumentos).toHaveLength(5);
      expect(result.data.aumentos.every(r => r.variacao_percentual === 25)).toBe(true);
    }
    somenteLeituras();
  });

  it('drill-through lê todas as páginas, preserva competência/importação e calcula deltas', async () => {
    base(1370, 1);
    const result = await api.getProductHistory(codigo(0), filters);
    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(1370);
    expect(result.data[0].delta).toBeNull();
    expect(result.data.at(-1).delta).toBe(0);
    expect(requests.every(r => JSON.stringify(r.orders) === JSON.stringify([
      { key: 'data_referencia', ascending: true }, { key: 'criado_em', ascending: true }, { key: 'id', ascending: true }
    ]))).toBe(true);
    somenteLeituras();
  });
});
