import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({ from: vi.fn(), insert: vi.fn(), update: vi.fn(), upsert: vi.fn(), delete: vi.fn(), rpc: vi.fn() }));
vi.mock('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm', () => ({ createClient: () => client }));
vi.mock('../src/config/app-config.js', () => ({ appConfig: { supabase: { url: 'https://example.supabase.co', anonKey: 'test-key' } }, debugLog: vi.fn() }));
import { api } from '../src/services/api.js';

let tables;
let requests;
let alterPage;
beforeEach(() => {
  vi.clearAllMocks();
  tables = { apontamentos_op: [], historico_custos: [] };
  requests = [];
  alterPage = (_request, response) => response;
  client.from.mockImplementation(table => {
    if (!Object.hasOwn(tables, table)) throw new Error(`Tabela não autorizada: ${table}`);
    const request = { table, filters: [], orders: [], range: null, options: null };
    requests.push(request);
    const query = {
      select(_fields, options) { request.options = options; return query; },
      eq(key, value) { request.filters.push({ key, value, op: 'eq' }); return query; },
      gte(key, value) { request.filters.push({ key, value, op: 'gte' }); return query; },
      lte(key, value) { request.filters.push({ key, value, op: 'lte' }); return query; },
      order(key, options) { request.orders.push({ key, ...options }); return query; },
      async range(start, end) {
        request.range = [start, end];
        const rows = tables[table].filter(row => request.filters.every(({ key, value, op }) =>
          op === 'eq' ? row[key] === value : op === 'gte' ? row[key] >= value : row[key] <= value))
          .slice().sort((a, b) => {
            for (const { key, ascending } of request.orders) {
              const result = String(a[key]).localeCompare(String(b[key]));
              if (result) return ascending ? result : -result;
            }
            return 0;
          });
        return alterPage(request, { data: rows.slice(start, end + 1).map(row => ({ ...row })), count: rows.length, error: null });
      }
    };
    return query;
  });
});

function op(id, date = '2026-06-01', product = '001') {
  return { id, cod_produto: product, data_referencia: date, op: 100 + id, estagio: 'MASSA', origem: 1,
    unidade: 'KG', criado_em: '2026-11-01T10:00:00Z', qtd_produzida: 10, tempo_real: 2 };
}
function custo(id, date = '2026-06-01', product = '001', created = '2026-11-02T10:00:00Z', total = 0) {
  return { id, codigo_produto: product, data_referencia: date, criado_em: created,
    custo_variavel: null, custo_direto_fixo: null, custo_total: total };
}
function onlyReads() {
  for (const name of ['insert', 'update', 'upsert', 'delete', 'rpc']) expect(client[name]).not.toHaveBeenCalled();
  expect(requests.every(r => r.options?.count === 'exact' && r.range)).toBe(true);
}

describe('OP × CUSTO histórico — leitura factual multi-competência', () => {
  it('preserva eventos, snapshots, datas, valores nulos/zero e competências explícitas sem composição', async () => {
    tables.apontamentos_op = [op(2, '2026-07-15'), op(1, '2026-06-01'), op(3, '2026-07-15')];
    tables.historico_custos = [custo(2, '2026-07-14', '001', '2026-08-01T10:00:00Z', 0),
      custo(1, '2026-06-01', '001', '2026-07-01T10:00:00Z', 10), custo(3, '2026-07-05', '001', '2026-07-20T10:00:00Z', null)];
    const before = JSON.parse(JSON.stringify(tables));
    const { data, error } = await api.getOpCustoHistorico({ produto: '001', inicioCompetencia: '2026-06', fimCompetencia: '2026-07' });
    expect(error).toBeNull();
    expect(data.versao).toBe('OP_CUSTO_HISTORICO_LEITURA_V1');
    expect(data.estado).toBe('completo');
    expect(data.opEventos.map(row => row.id)).toEqual([1, 2, 3]);
    expect(data.custoSnapshots.map(row => row.id)).toEqual([1, 3, 2]);
    expect(data.custoSnapshots.map(row => [row.data_referencia, row.criado_em, row.custo_total, row.custo_variavel])).toEqual([
      ['2026-06-01', '2026-07-01T10:00:00Z', 10, null], ['2026-07-05', '2026-07-20T10:00:00Z', null, null], ['2026-07-14', '2026-08-01T10:00:00Z', 0, null]
    ]);
    expect(data.competencias).toEqual([
      { competencia: '2026-06', op: { estado: 'completa', contagem: 1 }, custos: { estado: 'completa', contagem: 1 } },
      { competencia: '2026-07', op: { estado: 'completa', contagem: 2 }, custos: { estado: 'completa', contagem: 2 } }
    ]);
    expect(data).not.toHaveProperty('cobertura');
    expect(tables).toEqual(before); onlyReads();
  });

  it('representa fonte vazia por competência e mantém D somente como informação futura de produto explícito', async () => {
    tables.historico_custos = [custo(1, '2026-07-01')];
    const result = await api.getOpCustoHistorico({ produto: '001', inicioCompetencia: '2026-06', fimCompetencia: '2026-08' });
    expect(result.error).toBeNull();
    expect(result.data.competencias).toEqual([
      { competencia: '2026-06', op: { estado: 'completa_vazia', contagem: 0 }, custos: { estado: 'completa_vazia', contagem: 0 } },
      { competencia: '2026-07', op: { estado: 'completa_vazia', contagem: 0 }, custos: { estado: 'completa', contagem: 1 } },
      { competencia: '2026-08', op: { estado: 'completa_vazia', contagem: 0 }, custos: { estado: 'completa_vazia', contagem: 0 } }
    ]);
    onlyReads();
  });

  it.each([{}, { produto: '' }, { produto: '---', inicioCompetencia: '2026-06', fimCompetencia: '2026-07' },
    { produto: '001', inicioCompetencia: '2026-13', fimCompetencia: '2026-07' },
    { produto: '001', inicioCompetencia: '2026-08', fimCompetencia: '2026-07' },
    { produto: '001', inicioCompetencia: ['2026-06'], fimCompetencia: '2026-07' }])('rejeita entrada inválida sem I/O: %j', async params => {
    const result = await api.getOpCustoHistorico(params);
    expect(result.data).toBeNull(); expect(result.error).toBeTruthy(); expect(client.from).not.toHaveBeenCalled();
  });

  it('pagina integralmente acima de 500 e repete produto e intervalo em cada página', async () => {
    tables.apontamentos_op = Array.from({ length: 1001 }, (_, i) => op(i + 1));
    tables.historico_custos = Array.from({ length: 1001 }, (_, i) => custo(i + 1));
    const { data, error } = await api.getOpCustoHistorico({ produto: '001', inicioCompetencia: '2026-06', fimCompetencia: '2026-06' });
    expect(error).toBeNull(); expect(data.opEventos).toHaveLength(1001); expect(data.custoSnapshots).toHaveLength(1001);
    for (const table of ['apontamentos_op', 'historico_custos']) {
      const pages = requests.filter(r => r.table === table);
      expect(pages.map(r => r.range)).toEqual([[0, 499], [500, 999], [1000, 1499]]);
      expect(pages.every(r => r.filters.some(f => f.op === 'eq' && f.value === '001') && r.filters.some(f => f.op === 'gte' && f.value === '2026-06-01') && r.filters.some(f => f.op === 'lte' && f.value === '2026-06-30'))).toBe(true);
    }
    onlyReads();
  });

  it.each(['op', 'custos'])('preserva a fonte concluída, mas não declara completude após falha de %s', async table => {
    tables.apontamentos_op = [op(1)]; tables.historico_custos = [custo(1)];
    alterPage = (request, response) => request.table === (table === 'op' ? 'apontamentos_op' : 'historico_custos')
      ? { data: null, count: null, error: new Error('falha privada') } : response;
    const result = await api.getOpCustoHistorico({ produto: '001', inicioCompetencia: '2026-06', fimCompetencia: '2026-06' });
    expect(result.error?.details).toMatchObject({ code: 'FONTE_INDISPONIVEL', completa: false, fontes: [table] });
    expect(result.data.estado).toBe('incompleto');
    expect(result.data.qualidade).toEqual({ completa: false, coberturaPronta: false });
    expect(result.data.fontes[table].estado).toBe('erro');
    expect(result.data.fontes[table === 'op' ? 'custos' : 'op'].estado).toBe('completa');
    expect(JSON.stringify(result.error.details)).not.toContain('falha privada'); onlyReads();
  });

  it.each(['count', 'short', 'duplicate'])('recusa %s sem classificar leitura como completa', async failure => {
    tables.apontamentos_op = Array.from({ length: 501 }, (_, i) => op(i + 1)); tables.historico_custos = [custo(1)];
    alterPage = (request, response) => {
      if (request.table !== 'apontamentos_op' || request.range[0] !== 500) return response;
      if (failure === 'count') return { ...response, count: 502 };
      if (failure === 'short') return { ...response, data: [] };
      return { ...response, data: response.data.map(row => ({ ...row, id: 1 })) };
    };
    const result = await api.getOpCustoHistorico({ produto: '001', inicioCompetencia: '2026-06', fimCompetencia: '2026-06' });
    expect(result.error).toBeTruthy(); expect(result.data.qualidade.completa).toBe(false);
    expect(result.data.fontes.op.estado).toBe('erro'); onlyReads();
  });

  it('preserva registros com código inválido em diagnósticos, sem ocultá-los ou usar criado_em como competência', async () => {
    tables.apontamentos_op = [op(1)]; tables.historico_custos = [custo(1)];
    alterPage = (request, response) => ({ ...response, data: response.data.map(row => ({ ...row,
      [request.table === 'apontamentos_op' ? 'cod_produto' : 'codigo_produto']: '', criado_em: '2026-06-01T00:00:00Z' })) });
    const { data, error } = await api.getOpCustoHistorico({ produto: '001', inicioCompetencia: '2026-06', fimCompetencia: '2026-06' });
    expect(error).toBeNull(); expect(data.opEventos).toHaveLength(1); expect(data.custoSnapshots).toHaveLength(1);
    expect(data.diagnosticos.opNaoVinculavel).toHaveLength(1); expect(data.diagnosticos.custoNaoVinculavel).toHaveLength(1);
    expect(data.competencias[0].op).toEqual({ estado: 'completa', contagem: 1 }); onlyReads();
  });
});
