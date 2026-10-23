import { beforeEach, describe, expect, it, vi } from 'vitest';
import { analyzeOpCustoContext } from '../core/op-custo-engine.js';
import { buildReportRows } from '../core/report-engine.js';
import { buildOpInvestigationQueue } from '../core/op-investigation-engine.js';
import { toInvestigationResult } from '../core/investigation-contract.js';

const client = vi.hoisted(() => ({ from: vi.fn(), insert: vi.fn(), upsert: vi.fn(), update: vi.fn(), delete: vi.fn(), rpc: vi.fn() }));
vi.mock('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm', () => ({ createClient: () => client }));
vi.mock('../src/config/app-config.js', () => ({ appConfig: { supabase: { url: 'https://example.supabase.co', anonKey: 'test-key' } }, debugLog: vi.fn() }));
import { api } from '../src/services/api.js';

let tables;
let requests;
let alterPage;
beforeEach(() => {
  vi.clearAllMocks();
  tables = { apontamentos_op: [], historico_custos: [], dicionario_produtos: [], dicionario_master_produtos: [], categorias_origem: [], categorias_familia: [] };
  requests = [];
  alterPage = (_request, response) => response;
  client.from.mockImplementation(table => {
    if (!Object.hasOwn(tables, table)) throw new Error(`Fonte fora do contexto: ${table}`);
    const request = { table, fields: null, options: null, orders: [], filters: [], range: null };
    requests.push(request);
    const query = {
      select(fields, options) { request.fields = fields; request.options = options; return query; },
      order(key, options) { request.orders.push({ key, ...options }); return query; },
      in(key, value) { request.filters.push({ key, value, op: 'in' }); return query; },
      gte(key, value) { request.filters.push({ key, value, op: 'gte' }); return query; },
      lte(key, value) { request.filters.push({ key, value, op: 'lte' }); return query; },
      async range(start, end) {
        request.range = [start, end];
        const rows = tables[table].filter(row => request.filters.every(({ key, value, op }) =>
          op === 'in' ? value.includes(row[key]) : op === 'gte' ? row[key] >= value : row[key] <= value))
          .slice().sort((a, b) => {
            for (const { key, ascending } of request.orders) {
              const cmp = typeof a[key] === 'number' ? a[key] - b[key] : String(a[key]).localeCompare(String(b[key]));
              if (cmp) return ascending ? cmp : -cmp;
            }
            return 0;
          });
        const data = rows.slice(start, end + 1).map(row => request.fields === '*' ? { ...row }
          : Object.fromEntries(request.fields.split(',').map(f => [f.trim(), row[f.trim()]])));
        return alterPage(request, { data, count: rows.length, error: null });
      },
      then() { throw new Error('Consulta sem paginação'); },
      insert: client.insert, update: client.update, delete: client.delete, upsert: client.upsert
    };
    return query;
  });
});

function base(total = 1) {
  tables.apontamentos_op = Array.from({ length: total }, (_, i) => ({
    id: i + 1, op: 738, cod_produto: String(100000 + i), descricao: 'OP original', cod_estagio: '01',
    estagio: 'MASSA', origem: 0, unidade: 'CX', log_importacao_op_id: 7, data_referencia: '2026-10-05',
    criado_em: '2026-11-01T10:00:00Z', qtd_prevista: 100, qtd_produzida: 80, tempo_previsto: 10,
    tempo_real: 30, tempo_parada: 20, kg_hora_previsto: 100, kg_hora_real: 50
  })).reverse();
  tables.historico_custos = tables.apontamentos_op.map(row => ({ id: row.id, codigo_produto: row.cod_produto,
    descricao: 'Snapshot original', custo_variavel: 70, custo_direto_fixo: 30, custo_total: 100,
    data_referencia: '2026-10-14', criado_em: '2026-11-10T10:00:00Z' }));
  tables.dicionario_produtos = tables.apontamentos_op.map(row => ({ codigo_produto: row.cod_produto,
    descricao: 'Descrição operacional', origem_id: 'o1', familia_id: 'f1', agrupamento_cod: 'A1' }));
  tables.categorias_origem = [{ id: 'o1', codigo: '01', descricao: 'Operacional' }, { id: 'oERP', codigo: '02', descricao: 'ERP' }];
  tables.categorias_familia = [{ id: 'f1', codigo: '01', descricao: 'Operacional' }, { id: 'fERP', codigo: '02', descricao: 'ERP' }];
}
function analisar(data, produtoSolicitado) {
  return analyzeOpCustoContext({ contexto: data, analisesOp: data.analisesOp, analisesCusto: data.analisesCusto, produtoSolicitado });
}
function somenteLeituras() {
  for (const method of ['insert', 'upsert', 'update', 'delete', 'rpc']) expect(client[method]).not.toHaveBeenCalled();
  expect(requests.every(r => r.options?.count === 'exact' && r.range !== null)).toBe(true);
}

describe('OP × CUSTO — API mensal integral', () => {
  it.each([0, 1, 499, 500, 501, 1000, 1001, 1201])('%i registros em cada fonte, páginas 500 e conjunto completo antes de A/B/C', async total => {
    base(total);
    const before = globalThis.structuredClone(tables);
    const { data, error } = await api.getOpCustoContext({ competencia: '2026-10' });
    expect(error).toBeNull();
    expect(data.opEventos).toHaveLength(total);
    expect(data.custoSnapshots).toHaveLength(total);
    expect(data.opEventos.map(r => r.id)).toEqual(Array.from({ length: total }, (_, i) => i + 1));
    expect(data.custoSnapshots.map(r => r.id)).toEqual(Array.from({ length: total }, (_, i) => i + 1));
    expect(data.analisesOp).toHaveLength(total);
    expect(data.analisesCusto).toHaveLength(total);
    expect(data.cobertura).toEqual({ ambos: total, somenteOp: 0, somenteCusto: 0 });
    expect(analisar(data).produtos).toHaveLength(total);
    for (const table of ['apontamentos_op', 'historico_custos']) {
      const pages = requests.filter(r => r.table === table);
      expect(pages.map(r => r.range)).toEqual(Array.from({ length: Math.max(1, Math.ceil(total / 500)) }, (_, i) => [i * 500, i * 500 + 499]));
      expect(pages.every(r => JSON.stringify(r.filters) === JSON.stringify([
        { key: 'data_referencia', value: '2026-10-01', op: 'gte' },
        { key: 'data_referencia', value: '2026-10-31', op: 'lte' }
      ]))).toBe(true);
      expect(pages.every(r => r.orders.at(-1).key === 'id' && r.orders.at(-1).ascending)).toBe(true);
    }
    if (total) {
      expect(requests.filter(r => r.table === 'dicionario_produtos')).toHaveLength(Math.ceil(total / 500));
      expect(requests.filter(r => r.table === 'categorias_origem')).toHaveLength(1);
      expect(requests.filter(r => r.table === 'categorias_familia')).toHaveLength(1);
    }
    expect(tables).toEqual(before);
    somenteLeituras();
  });
  it('mantém múltiplas datas no mês e ignora importação para definir competência', async () => {
    base();
    tables.apontamentos_op.push({ ...tables.apontamentos_op[0], id: 2, data_referencia: '2026-10-14', estagio: 'FORNO' },
      { ...tables.apontamentos_op[0], id: 3, data_referencia: '2026-11-01', criado_em: '2026-10-01T00:00:00Z' });
    tables.historico_custos.push({ ...tables.historico_custos[0], id: 2, data_referencia: '2026-10-05', criado_em: '2026-10-01T00:00:00Z', custo_total: 90 },
      { ...tables.historico_custos[0], id: 3, data_referencia: '2026-11-01', criado_em: '2026-12-01T00:00:00Z', custo_total: 1000 });
    const { data, error } = await api.getOpCustoContext({ competencia: '2026-10', periodo: { inicio: '2026-10-01', fimInclusivo: '2026-10-31' } });
    expect(error).toBeNull();
    expect(data.opEventos.map(r => r.data_referencia)).toEqual(['2026-10-14', '2026-10-05']);
    expect(data.custoSnapshots.map(r => r.data_referencia)).toEqual(['2026-10-05', '2026-10-14']);
    expect(analisar(data).produtos[0].custo.referencia.idsCandidatos).toEqual([1]);
    expect(data.analisesOp.map(r => r.resultadoOriginal)).toEqual(buildOpInvestigationQueue(data.opEventos).map(toInvestigationResult));
    expect(data.analisesCusto[0].resultadoOriginal).toEqual(buildReportRows(data.custoSnapshots.map(r => ({ ...r, ...r.classificacaoCustos })))[0]);
    somenteLeituras();
  });
  it('reutiliza classificação operacional OP e autoridade ERP Custo sem substituir fatos/descrições', async () => {
    base();
    tables.dicionario_master_produtos = [{ codigo_produto: '100000', origem_cod: '02', familia_cod: '02' }];
    const { data } = await api.getOpCustoContext({ competencia: '2026-10' });
    expect(data.opEventos[0].classificacaoMestre).toMatchObject({ origem: 'Operacional', familia: 'Operacional' });
    expect(data.custoSnapshots[0]).toMatchObject({ descricao: 'Snapshot original', classificacaoCustos: { origem_id: 'oERP', familia_id: 'fERP', agrupamento_cod: 'A1' } });
    expect(data.analisesCusto[0]).toMatchObject({ prioridadeOriginal: null, qualidadePrioridade: 'aguarda_presenter_existente' });
    somenteLeituras();
  });
  it.each(['op', 'custos', 'ambas'])('fonte vazia confirmada: %s', async vazia => {
    base();
    if (vazia !== 'custos') tables.apontamentos_op = [];
    if (vazia !== 'op') tables.historico_custos = [];
    const { data, error } = await api.getOpCustoContext({ competencia: '2026-10', produto: '999999' });
    expect(error).toBeNull();
    expect(data.cobertura).toEqual({ ambos: 0, somenteOp: vazia === 'custos' ? 1 : 0, somenteCusto: vazia === 'op' ? 1 : 0 });
    expect(analisar(data, data.produtoSolicitado).produtos.at(-1).cobertura).toBe('D');
    somenteLeituras();
  });
  it('produto opcional não restringe o universo mensal ou esconde B/C', async () => {
    base(2); tables.historico_custos.pop();
    const { data } = await api.getOpCustoContext({ competencia: '2026-10', produto: '100000' });
    expect(data.cobertura).toEqual({ ambos: 1, somenteOp: 1, somenteCusto: 0 });
    expect(data.opEventos).toHaveLength(2);
    expect(requests.filter(r => ['apontamentos_op', 'historico_custos'].includes(r.table)).every(r => r.filters.length === 2)).toBe(true);
  });
  it.each(['short', 'count', 'missing-count', 'error', 'rejection', 'duplicate', 'missing-id'])('recusa %s em cada fonte, sem resultados parciais', async failure => {
    for (const table of ['apontamentos_op', 'historico_custos']) {
      base(1001);
      alterPage = (r, response) => {
        if (r.table !== table || r.range[0] !== 500) return response;
        if (failure === 'short') response.data.pop();
        if (failure === 'count') response.count++;
        if (failure === 'missing-count') response.count = null;
        if (failure === 'error') response.error = { message: 'Falha técnica privada' };
        if (failure === 'rejection') throw new Error('Falha técnica privada');
        if (failure === 'duplicate') response.data[0].id = 1;
        if (failure === 'missing-id') delete response.data[0].id;
        return response;
      };
      const result = await api.getOpCustoContext({ competencia: '2026-10' });
      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
      const code = failure === 'duplicate' ? 'IDENTIDADE_REPETIDA' : failure === 'missing-id' ? 'IDENTIDADE_INVALIDA'
        : failure === 'short' ? 'LEITURA_INCOMPLETA' : ['count', 'missing-count'].includes(failure) ? 'CONTAGEM_DIVERGENTE'
          : table === 'apontamentos_op' ? 'FONTE_OP_INDISPONIVEL' : 'FONTE_CUSTO_INDISPONIVEL';
      expect(result.error.details.code).toBe(code);
      expect(JSON.stringify(result.error.details)).not.toContain('Falha técnica privada');
    }
    somenteLeituras();
  });
  it.each(['dicionario_produtos', 'dicionario_master_produtos', 'categorias_origem', 'categorias_familia'])('falha de %s impede contexto falsamente completo', async table => {
    base();
    alterPage = (r, response) => r.table === table ? { ...response, error: { message: 'Indisponível' } } : response;
    const result = await api.getOpCustoContext({ competencia: '2026-10' });
    expect(result.data).toBeNull();
    expect(result.error.details.code).toBe('ENRIQUECIMENTO_INDISPONIVEL');
    somenteLeituras();
  });
  it('fatos com códigos inválidos continuam disponíveis em diagnóstico, sem cobertura fabricada', async () => {
    base();
    tables.apontamentos_op[0].cod_produto = '';
    tables.historico_custos[0].codigo_produto = '-1';
    const { data, error } = await api.getOpCustoContext({ competencia: '2026-10' });
    expect(error).toBeNull();
    expect(data.opEventos).toHaveLength(1); expect(data.custoSnapshots).toHaveLength(1);
    expect(data.qualidade.diagnosticos.opNaoVinculavel).toHaveLength(1);
    expect(data.qualidade.diagnosticos.custoNaoVinculavel).toHaveLength(1);
    expect(data.cobertura).toEqual({ ambos: 0, somenteOp: 0, somenteCusto: 0 });
    expect(data.analisesOp).toEqual([]); expect(data.analisesCusto).toEqual([]);
    expect(analisar(data).produtos).toEqual([]);
    somenteLeituras();
  });
  it.each([
    {}, { competencia: ['2026-09', '2026-10'] }, { competencia: '2026-13' },
    { competencia: '2026-10', periodo: { inicio: '2026-10-05', fimInclusivo: '2026-10-31' } },
    { competencia: '2026-10', produto: '' }
  ])('entrada inválida %s não inicia I/O', async params => {
    const result = await api.getOpCustoContext(params);
    expect(result.data).toBeNull(); expect(result.error).toBeTruthy();
    expect(client.from).not.toHaveBeenCalled();
  });
});
