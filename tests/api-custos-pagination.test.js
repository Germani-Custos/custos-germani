import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createExportController } from '../view/ui-export.js';
import { calculateCascadeOptions, buildReportRows } from '../core/report-engine.js';

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
    historico_custos: [], dicionario_produtos: [], dicionario_master_produtos: [],
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
  expect(requests.filter(r => r.table === 'dicionario_master_produtos').every(r => r.fields === 'codigo_produto, origem_cod, familia_cod')).toBe(true);
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
    expect(requests.filter(r => r.table === 'historico_custos').every(r => JSON.stringify(r.orders) === JSON.stringify([
      { key: 'data_referencia', ascending: true }, { key: 'criado_em', ascending: true }, { key: 'id', ascending: true }
    ]))).toBe(true);
    somenteLeituras();
  });
});


describe('CUSTOS-ERP-01 — autoridade ERP apenas na projeção analítica', () => {
  function preparar() {
    base(6, 6);
    tables.categorias_origem.push({ id: 'oERP', codigo: '01', descricao: 'Origem ERP' });
    tables.categorias_familia.push({ id: 'fERP', codigo: '001', descricao: 'Família ERP' });
    tables.dicionario_master_produtos = [0, 1, 3, 4].map(i => ({
      codigo_produto: codigo(i), origem_cod: '01', familia_cod: '001', agrupamento_erp_valor: 'ERP-P999'
    }));
    tables.dicionario_produtos[0].familia_id = null;
    tables.dicionario_produtos[3].origem_id = null;
    tables.dicionario_produtos[3].familia_id = null;
    Object.assign(tables.dicionario_master_produtos[2], { origem_cod: null, familia_cod: null });
    Object.assign(tables.dicionario_master_produtos[3], { origem_cod: 'inexistente', familia_cod: 'f1' });
    tables.dicionario_produtos[5].agrupamento_cod = null;
  }

  it('Master prevalece sobre classificação vazia ou preenchida; ausente usa operacional; sem classificação permanece vazio', async () => {
    preparar();
    const before = globalThis.structuredClone(tables);
    const result = await api.getHistorico(filters);
    expect(result.error).toBeNull();
    const byCodigo = new Map(result.data.map(r => [r.codigo_produto, r]));
    for (const i of [0, 1]) expect(byCodigo.get(codigo(i))).toMatchObject({ origem_id: 'oERP', familia_id: 'fERP', agrupamento_cod: 'M005' });
    expect(byCodigo.get(codigo(2))).toMatchObject({ origem_id: 'o1', familia_id: 'f1' });
    for (const i of [3, 4]) expect(byCodigo.get(codigo(i))).toMatchObject({ origem_id: null, familia_id: null });
    expect(byCodigo.get(codigo(5)).agrupamento_cod).toBeNull();
    expect(tables).toEqual(before);
    somenteLeituras();
  });

  it('cascata, agregado, fila, gráficos, drill-through e exportação compartilham a família ERP', async () => {
    preparar();
    const previous = tables.historico_custos.map(r => ({ ...r, id: r.id + 10,
      data_referencia: '2026-05-01', criado_em: '2026-05-10T10:00:00Z', custo_total: 80 }));
    tables.historico_custos.push(...previous);
    const before = globalThis.structuredClone(tables);
    const masters = await api.getMasters();
    expect(masters.error).toBeNull();
    const selection = { ...filters, origem: 'oERP', familia: 'fERP', agrupamento: 'TODOS', item: 'TODOS' };
    const cascade = calculateCascadeOptions(selection, masters);
    expect(cascade.familyOptions).toContainEqual({ value: 'fERP', label: 'Família ERP' });
    const selectedCodes = [codigo(0), codigo(1)];
    expect(cascade.productOptions.map(p => p.value).sort()).toEqual(selectedCodes);
    const history = await api.getHistorico(selection);
    expect(history.error).toBeNull();
    expect(history.data).toHaveLength(4);
    const rows = buildReportRows(history.data, masters);
    expect(rows.map(r => r.codigo).sort()).toEqual(selectedCodes);
    const individual = await api.getHistorico({ ...selection, item: codigo(0) });
    expect(individual.data).toHaveLength(2);
    for (const code of selectedCodes) {
      const drill = await api.getProductHistory(code, filters);
      expect(drill.error).toBeNull();
      expect(drill.data).toHaveLength(2);
      expect(drill.data.every(r => r.codigo_produto === code && r.familia_id === 'fERP')).toBe(true);
      expect(drill.data[1].delta).toBe(20);
      expect(drill.data[0].descricao).toBe('Descrição do fato');
    }
    const comparison = await api.getLatestImportComparison(selection);
    expect(comparison.error).toBeNull();
    expect(comparison.data.imports.map(r => r.quantidade)).toEqual([2, 2]);
    const top = await api.getTopVariacoesImportacao(selection);
    expect(top.error).toBeNull();
    expect(top.data.aumentos.map(r => r.codigo_produto).sort()).toEqual(selectedCodes);

    const sheets = [];
    const xlsx = { utils: { json_to_sheet: data => { sheets.push(data); return {}; },
      book_new: () => ({}), book_append_sheet: vi.fn() }, writeFile: vi.fn() };
    const dom = { dtStart: { value: filters.start }, dtEnd: { value: filters.end }, selI: { value: 'TODOS' },
      selO: { options: [{ textContent: 'Origem ERP' }], selectedIndex: 0 },
      selF: { options: [{ textContent: 'Família ERP' }], selectedIndex: 0 },
      selA: { options: [{ textContent: 'TODOS' }], selectedIndex: 0 } };
    vi.stubGlobal('XLSX', xlsx);
    vi.stubGlobal('Swal', { fire: async () => ({ isConfirmed: true, value: ['Produto (código)'] }) });
    try {
      await createExportController({ dom, state: { reportRows: rows, reportView: { quickFilter: 'all' } },
        executeOperationalBoundary: async (_name, action) => action(),
        getOperationalPriority: () => ({ label: 'Estável' }), buildInvestigativeSummary: () => 'Contexto', showToast: vi.fn()
      }).exportReport();
      expect(xlsx.writeFile).toHaveBeenCalledOnce();
      expect(sheets[1].map(r => r['Produto (código)']).sort()).toEqual(selectedCodes);
    } finally { vi.unstubAllGlobals(); }
    expect(tables).toEqual(before);
    somenteLeituras();
  });

  it('mantém produto de Custos presente no Master mesmo sem registro operacional e ignora ERP sem fatos', async () => {
    preparar();
    tables.dicionario_produtos = [];
    tables.dicionario_master_produtos.push({ codigo_produto: '999999', origem_cod: '01', familia_cod: '001' });
    const masters = await api.getMasters();
    expect(masters.error).toBeNull();
    expect(masters.produtos).toHaveLength(6);
    expect(masters.hierarquia.find(r => r.codigo_produto === codigo(0))).toMatchObject({ origem_id: 'oERP', familia_id: 'fERP', agrupamento_cod: null });
    expect(masters.produtos.some(r => r.codigo_produto === '999999')).toBe(false);
  });

  it.each(['erro', 'pagina curta', 'contagem alterada'])('Master paginado: %s bloqueia hierarquia/histórico/gráficos/drill-through sem fallback silencioso', async mode => {
    preparar();
    tables.dicionario_master_produtos = Array.from({ length: 1001 }, (_, i) => ({ codigo_produto: codigo(i), origem_cod: '01', familia_cod: '001' }));
    tables.historico_custos.push({ ...tables.historico_custos[0], id: 100, criado_em: '2026-05-10T10:00:00Z' });
    alterarPagina = (r, response) => {
      if (r.table !== 'dicionario_master_produtos' || r.range[0] !== 500) return response;
      if (mode === 'erro') return { data: null, count: null, error: new Error('Master indisponível') };
      if (mode === 'pagina curta') return { ...response, data: response.data.slice(1) };
      return { ...response, count: 1002 };
    };
    expect((await api.getMasters()).error).not.toBeNull();
    for (const method of ['getHistorico', 'getLatestImportComparison', 'getTopVariacoesImportacao']) {
      const result = await api[method](filters);
      expect(result.error).not.toBeNull();
      expect(result.data).toBeNull();
    }
    expect((await api.getProductHistory(codigo(0), filters)).error).not.toBeNull();
    somenteLeituras();
  });
});


describe('CUSTOS-ERP-01 — identidade exata e proteção de fontes', () => {
  it('catálogo ambíguo não escolhe vencedor; rótulos iguais em códigos diferentes não misturam famílias', async () => {
    base(2, 2);
    tables.categorias_origem = [{ id: 'oERP', codigo: '01', descricao: 'ERP' }];
    tables.categorias_familia = [
      { id: 'fA', codigo: '001', descricao: 'Rótulo repetido' },
      { id: 'fB', codigo: '002', descricao: 'Rótulo repetido' }
    ];
    tables.dicionario_master_produtos = [
      { codigo_produto: codigo(0), origem_cod: '01', familia_cod: '001' },
      { codigo_produto: codigo(1), origem_cod: '01', familia_cod: '002' }
    ];
    const result = await api.getHistorico({ ...filters, familia: 'fA' });
    expect(result.data.map(r => r.codigo_produto)).toEqual([codigo(0)]);
    tables.categorias_familia.push({ id: 'fOutra', codigo: '001', descricao: 'Duplicado' });
    const ambiguous = await api.getHistorico(filters);
    expect(ambiguous.data.find(r => r.codigo_produto === codigo(0)).familia_id).toBeNull();
    expect(ambiguous.data.find(r => r.codigo_produto === codigo(1)).familia_id).toBe('fB');
    somenteLeituras();
  });

  it('identidade duplicada no Master bloqueia projeção em vez de escolher vencedor', async () => {
    base(1, 1);
    tables.dicionario_master_produtos = [{ codigo_produto: codigo(0) }, { codigo_produto: codigo(0) }];
    expect((await api.getMasters()).error).not.toBeNull();
    expect((await api.getHistorico(filters)).error).not.toBeNull();
    somenteLeituras();
  });
});
