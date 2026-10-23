import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildOpInvestigationQueue } from '../core/op-investigation-engine.js';

const client = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm', () => ({ createClient: () => client }));
vi.mock('../src/config/app-config.js', () => ({
  appConfig: { supabase: { url: 'https://example.supabase.co', anonKey: 'test-key' }, enableVerboseLogs: false }, debugLog: vi.fn()
}));
import { api } from '../src/services/api.js';

let tables;
let requests;
let alterPage;
const order = [
  { key: 'data_referencia', ascending: false }, { key: 'estagio', ascending: true },
  { key: 'origem', ascending: true }, { key: 'op', ascending: true }, { key: 'id', ascending: true }
];

beforeEach(() => {
  vi.clearAllMocks();
  tables = { apontamentos_op: [], dicionario_produtos: [], categorias_origem: [], categorias_familia: [] };
  requests = [];
  alterPage = (_request, result) => result;
  client.from.mockImplementation(table => {
    if (!Object.hasOwn(tables, table)) throw new Error(`Fonte fora da leitura de OP: ${table}`);
    const request = { table, fields: '', options: null, filters: [], orders: [], range: null };
    requests.push(request);
    const respond = () => {
      const rows = tables[table].filter(row => request.filters.every(({ key, value, op }) =>
        op === 'in' ? value.includes(row[key]) : row[key] === value)).slice().sort((a, b) => {
        for (const { key, ascending } of request.orders) {
          const cmp = typeof a[key] === 'number' ? a[key] - b[key] : String(a[key]).localeCompare(String(b[key]));
          if (cmp) return ascending ? cmp : -cmp;
        }
        return 0;
      });
      const [start, end] = request.range || [0, 999];
      return alterPage(request, { data: rows.slice(start, end + 1).map(row => ({ ...row })),
        count: request.options?.count === 'exact' ? rows.length : null, error: null });
    };
    const query = {
      select(fields, options) { request.fields = fields; request.options = options; return query; },
      order(key, options) { request.orders.push({ key, ...options }); return query; },
      eq(key, value) { request.filters.push({ key, value, op: 'eq' }); return query; },
      in(key, value) { request.filters.push({ key, value, op: 'in' }); return query; },
      range(start, end) { request.range = [start, end]; return Promise.resolve(respond()); },
      then(resolve, reject) { return Promise.resolve(respond()).then(resolve, reject); }
    };
    return query;
  });
});

function base(total) {
  tables.apontamentos_op = Array.from({ length: total }, (_, i) => ({
    id: i + 1, data_referencia: '2026-06-01', estagio: 'MASSA', origem: 0, op: i + 1,
    cod_produto: String(100000 + i), descricao: `Produto ${i}`, criado_em: '2026-10-01T12:00:00Z',
    qtd_prevista: 100, qtd_produzida: 90, tempo_previsto: 10, tempo_real: 12,
    kg_hora_previsto: 5, kg_hora_real: 4, tempo_parada: 1
  })).reverse();
  tables.dicionario_produtos = tables.apontamentos_op.map(row => ({
    codigo_produto: row.cod_produto, descricao: row.descricao, origem_id: 'o1', familia_id: 'f1'
  }));
  tables.categorias_origem = [{ id: 'o1', descricao: 'Origem operacional' }];
  tables.categorias_familia = [{ id: 'f1', descricao: 'Família operacional' }];
}

describe('MNT-OP-05 — leitura integral da Auditoria de OP', () => {
  it.each([0, 37, 999, 1000, 1001, 1469, 2501])('%i registros sem perda, repetição ou teto total', async total => {
    base(total);
    const before = globalThis.structuredClone(tables);
    const result = await api.getApontamentosOp();
    expect(result.error).toBeNull();
    expect(result.data.map(row => row.id)).toEqual(Array.from({ length: total }, (_, i) => i + 1));
    expect(new Set(result.data.map(row => row.id)).size).toBe(total);
    expect(result.data.map(({ classificacaoMestre: _classificacaoMestre, ...row }) => row)).toEqual([...tables.apontamentos_op].reverse());
    expect(result.data.every(row => row.classificacaoMestre.origem === 'Origem operacional' &&
      row.classificacaoMestre.familia === 'Família operacional')).toBe(true);
    expect(buildOpInvestigationQueue(result.data)).toHaveLength(total);
    expect(tables).toEqual(before);
    const pages = requests.filter(r => r.table === 'apontamentos_op');
    expect(pages.map(r => r.range)).toEqual(Array.from({ length: Math.max(1, Math.ceil(total / 500)) }, (_, i) => [i * 500, i * 500 + 499]));
    expect(pages.every(r => JSON.stringify(r.orders) === JSON.stringify(order))).toBe(true);
    expect(requests.every(r => r.options?.count === 'exact' && r.range !== null)).toBe(true);
    expect(requests.filter(r => r.table === 'dicionario_produtos').every(r =>
      r.filters[0].value.length <= 500)).toBe(true);
  });

  it('preserva a ordem anterior e desempata por id quando todas as chaves de negócio empatam', async () => {
    base(1469);
    tables.apontamentos_op.forEach(row => {
      row.op = 0;
      row.data_referencia = row.id % 2 ? '2026-07-01' : '2026-06-01';
      row.estagio = row.id % 3 ? 'MASSA' : 'BISCOITO';
      row.origem = row.id % 5;
    });
    const expected = [...tables.apontamentos_op].sort((a, b) => b.data_referencia.localeCompare(a.data_referencia) ||
      a.estagio.localeCompare(b.estagio) || a.origem - b.origem || a.op - b.op || a.id - b.id);
    const first = await api.getApontamentosOp();
    tables.apontamentos_op.reverse();
    const second = await api.getApontamentosOp();
    expect(first.data.map(r => r.id)).toEqual(expected.map(r => r.id));
    expect(second.data).toEqual(first.data);
  });

  it('repete todos os filtros antes do range, inclusive origem/OP zero e competência normalizada', async () => {
    base(2501);
    tables.apontamentos_op.forEach(row => { row.op = 0; row.cod_produto = '100001'; });
    tables.apontamentos_op[0].data_referencia = '2026-07-01';
    tables.apontamentos_op[1].estagio = 'BISCOITO';
    tables.apontamentos_op[2].origem = 1;
    tables.apontamentos_op[3].op = 1;
    tables.apontamentos_op[4].cod_produto = '999999';
    const result = await api.getApontamentosOp({ dataReferencia: '2026-06', estagio: 'MASSA', origem: 0, op: 0, codProduto: '100001' });
    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(2496);
    expect(result.data.every(row => row.data_referencia === '2026-06-01' && row.estagio === 'MASSA' &&
      row.origem === 0 && row.op === 0 && row.cod_produto === '100001')).toBe(true);
    const pages = requests.filter(r => r.table === 'apontamentos_op');
    expect(pages).toHaveLength(5);
    expect(pages.every(r => r.filters.length === 5 && JSON.stringify(r.filters) === JSON.stringify(pages[0].filters))).toBe(true);
  });

  it.each(['short', 'empty', 'count', 'missing-count', 'error', 'duplicate'])('recusa resultado parcial: %s na segunda página', async failure => {
    base(1469);
    alterPage = (r, response) => {
      if (r.table !== 'apontamentos_op' || r.range?.[0] !== 500) return response;
      if (failure === 'short') response.data.pop();
      if (failure === 'empty') response.data = [];
      if (failure === 'count') response.count++;
      if (failure === 'missing-count') response.count = null;
      if (failure === 'error') response.error = { message: 'Falha de rede' };
      if (failure === 'duplicate') response.data[0] = { ...response.data[0], id: 1 };
      return response;
    };
    const result = await api.getApontamentosOp();
    expect(result.error).toBeTruthy();
    expect(result.data).toBeNull();
    expect(requests.every(r => r.table === 'apontamentos_op')).toBe(true);
  });

  it('enriquece também catálogos além da milésima posição sem alterar classificação operacional', async () => {
    base(1);
    for (const table of ['categorias_origem', 'categorias_familia']) {
      tables[table] = Array.from({ length: 1201 }, (_, i) => ({ id: String(i), descricao: `Categoria ${i}` }));
    }
    tables.dicionario_produtos[0].origem_id = '1200';
    tables.dicionario_produtos[0].familia_id = '1200';
    const result = await api.getApontamentosOp();
    expect(result.error).toBeNull();
    expect(result.data[0].classificacaoMestre).toMatchObject({ origem: 'Categoria 1200', familia: 'Categoria 1200' });
  });

  it.each(['dicionario_produtos', 'categorias_origem', 'categorias_familia'])('não investiga com enriquecimento parcial de %s', async table => {
    base(1469);
    alterPage = (r, response) => r.table === table ? { ...response, data: [] } : response;
    const result = await api.getApontamentosOp();
    expect(result.error).toBeTruthy();
    expect(result.data).toBeNull();
  });
});
