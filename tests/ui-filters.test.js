import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

// Harness de mocks (opção b): não exporta internos nem toca no runtime.
// O módulo api é mockado (cliente Supabase real do CDN nunca é carregado).
vi.mock('../src/services/api.js', () => ({
  api: { subscribeFiltrosRealtime: vi.fn(() => () => {}) }
}));

import {
  createFiltersController,
  getRowsMatchingQuickFilter,
  compareRowsBySort
} from '../view/ui-filters.js';

// ── getRowsMatchingQuickFilter (fonte canônica de "quais linhas") ─────────────
describe('getRowsMatchingQuickFilter — filtro rápido da fila', () => {
  const rows = [
    { codigo: 'A', variacao: 10, mudouRegime: false, variacaoTemporal: 6 },  // alerta (≥5%) + positiva
    { codigo: 'B', variacao: -3, mudouRegime: true, variacaoTemporal: 2 },   // regime
    { codigo: 'C', variacao: 4, mudouRegime: false, variacaoTemporal: 1 }    // positiva
  ];

  it('alerts: mantém apenas linhas com |variação temporal| ≥ 5%', () => {
    expect(getRowsMatchingQuickFilter(rows, 'teste', 'alerts').map(r => r.codigo)).toEqual(['A']);
  });

  it('positive: mantém apenas variação no período > 0', () => {
    expect(getRowsMatchingQuickFilter(rows, 'teste', 'positive').map(r => r.codigo)).toEqual(['A', 'C']);
  });

  it('regime: mantém apenas mudança de regime', () => {
    expect(getRowsMatchingQuickFilter(rows, 'teste', 'regime').map(r => r.codigo)).toEqual(['B']);
  });

  it('all (ou desconhecido): não filtra nada', () => {
    expect(getRowsMatchingQuickFilter(rows, 'teste', 'all')).toBe(rows);
    expect(getRowsMatchingQuickFilter(rows, 'teste', 'qualquer')).toBe(rows);
  });
});

// ── compareRowsBySort (fonte canônica de "em que ordem") ──────────────────────
describe('compareRowsBySort — ordenação da tabela', () => {
  it('numérico: compara por valor com direção', () => {
    expect(compareRowsBySort({ variacao: 1 }, { variacao: 2 }, 'variacao', 'asc')).toBeLessThan(0);
    expect(compareRowsBySort({ variacao: 1 }, { variacao: 2 }, 'variacao', 'desc')).toBeGreaterThan(0);
  });

  it('alfabético: compara por localeCompare pt-BR', () => {
    expect(compareRowsBySort({ codigo: 'A' }, { codigo: 'B' }, 'codigo', 'asc')).toBeLessThan(0);
    expect(compareRowsBySort({ codigo: 'B' }, { codigo: 'A' }, 'codigo', 'asc')).toBeGreaterThan(0);
  });

  it('booleano (alert/mudouRegime): true vs false conforme direção', () => {
    // desc: true (1) vem antes de false (0)
    expect(compareRowsBySort({ mudouRegime: true }, { mudouRegime: false }, 'mudouRegime', 'desc')).toBeLessThan(0);
    expect(compareRowsBySort({ alert: false }, { alert: true }, 'alert', 'desc')).toBeGreaterThan(0);
  });
});

// ── refreshCascade (reset em cadeia origem → família → agrupamento → item) ─────
function fakeSelect(value) {
  return { value, replaceChildren() {} };
}

function setupCascade() {
  const dom = {
    selO: fakeSelect('1'),
    selF: fakeSelect('10'),
    selA: fakeSelect('G1'),
    selI: fakeSelect('001'),
    dtStart: { value: '' },
    dtEnd: { value: '' }
  };
  const masters = {
    origens: [{ id: 1, descricao: 'O1' }],
    familias: [{ id: 10, descricao: 'F10' }],
    agrupamentos: [{ id: 'G1', descricao: 'Grp1' }],
    produtos: [{ codigo_produto: '001', descricao: 'P1' }, { codigo_produto: '002', descricao: 'P2' }],
    dicionario: [],
    hierarquia: [
      { codigo_produto: '001', origem_id: 1, familia_id: 10, agrupamento_cod: 'G1' },
      { codigo_produto: '002', origem_id: 1, familia_id: 10, agrupamento_cod: 'G1' }
    ]
  };
  const state = { masters, reportRows: [], reportView: { quickFilter: 'all', sortKey: null, sortDirection: 'desc' } };
  const runReport = vi.fn();
  const { refreshCascade } = createFiltersController({
    dom, state,
    executeOperationalBoundary: async (_op, action) => action(),
    fetchMetadata: vi.fn(),
    renderTable: vi.fn(),
    runReport,
    exportReport: vi.fn()
  });
  return { dom, state, refreshCascade, runReport };
}

describe('createFiltersController — refreshCascade em cadeia', () => {
  beforeEach(() => {
    global.document = { createElement: () => ({}), querySelectorAll: () => [] };
  });
  afterEach(() => { delete global.document; });

  it('trigger origem: zera família, agrupamento e item', () => {
    const { dom, refreshCascade } = setupCascade();
    refreshCascade('origem');
    expect(dom.selF.value).toBe('TODAS');
    expect(dom.selA.value).toBe('TODOS');
    expect(dom.selI.value).toBe('TODOS');
  });

  it('trigger familia: preserva família, zera agrupamento e item', () => {
    const { dom, refreshCascade } = setupCascade();
    refreshCascade('familia');
    expect(dom.selF.value).toBe('10');
    expect(dom.selA.value).toBe('TODOS');
    expect(dom.selI.value).toBe('TODOS');
  });

  it('trigger agrupamento: preserva família e agrupamento, zera apenas item', () => {
    const { dom, refreshCascade } = setupCascade();
    refreshCascade('agrupamento');
    expect(dom.selF.value).toBe('10');
    expect(dom.selA.value).toBe('G1');
    expect(dom.selI.value).toBe('TODOS');
  });

  it('dispara autoRefreshReport (runReport) quando há período preenchido', () => {
    const { dom, refreshCascade, runReport } = setupCascade();
    dom.dtStart.value = '2026-01-01';
    dom.dtEnd.value = '2026-03-31';
    refreshCascade('agrupamento');
    expect(runReport).toHaveBeenCalledWith({ silent: true });
  });

  it('reload/realtime: grupo removido volta a TODOS e produtos usam o valor aceito no mesmo refresh', () => {
    const { dom, state, refreshCascade, runReport } = setupCascade();
    dom.selI.replaceChildren = (...options) => { dom.selI.options = options; };
    refreshCascade();
    state.masters.hierarquia[0].agrupamento_cod = null;
    state.masters.hierarquia[1].agrupamento_cod = null;
    dom.dtStart.value = '2026-01-01';
    dom.dtEnd.value = '2026-03-31';
    refreshCascade();
    expect(dom.selA.value).toBe('TODOS');
    expect(dom.selI.options.map(o => o.value)).toEqual(['TODOS', '001', '002']);
    expect(dom.selI.value).toBe('001');
    expect(runReport).toHaveBeenLastCalledWith({ silent: true });
  });

  it('grupo ainda válido após reload invalida produto que saiu do recorte', () => {
    const { dom, state, refreshCascade } = setupCascade();
    state.masters.agrupamentos.push({ id: 'G2', descricao: 'Grp2' });
    state.masters.hierarquia[0].agrupamento_cod = 'G2';
    dom.selI.replaceChildren = (...options) => { dom.selI.options = options; };
    refreshCascade();
    expect(dom.selA.value).toBe('G1');
    expect(dom.selI.value).toBe('TODOS');
    expect(dom.selI.options.map(o => o.value)).toEqual(['TODOS', '002']);
  });

  it.each(['familia', 'origem'])('%s recalcula as opções e limpa seleções dependentes', trigger => {
    const { dom, state, refreshCascade } = setupCascade();
    state.masters.familias.push({ id: '20', descricao: 'F20' });
    state.masters.agrupamentos.push({ id: 'G2', descricao: 'Grp2' });
    Object.assign(state.masters.hierarquia[1], { origem_id: '2', familia_id: '20', agrupamento_cod: 'G2' });
    dom.selA.replaceChildren = (...options) => { dom.selA.options = options; };
    dom.selI.replaceChildren = (...options) => { dom.selI.options = options; };
    dom.selO.value = trigger === 'origem' ? '2' : 'TODAS';
    dom.selF.value = '20';
    refreshCascade(trigger);
    expect(dom.selA.value).toBe('TODOS');
    expect(dom.selI.value).toBe('TODOS');
    expect(dom.selA.options.map(o => o.value)).toEqual(['TODOS', 'G2']);
    expect(dom.selI.options.map(o => o.value)).toEqual(['TODOS', '002']);
    expect(dom.selF.value).toBe(trigger === 'origem' ? 'TODAS' : '20');
  });
});
