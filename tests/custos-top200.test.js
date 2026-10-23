import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/services/api.js', () => ({ api: { subscribeFiltrosRealtime: vi.fn(() => () => {}) } }));
import { createInitialState } from '../view/ui-state.js';
import { createFiltersController, compareRowsBySort } from '../view/ui-filters.js';
import { createTableController, getOperationalPriority, MAX_VISIBLE_INVESTIGATION_ROWS } from '../view/ui-table.js';
import { compareByInvestigativePriority, getInvestigationRankScore, createExportController } from '../view/ui-export.js';
import { buildReportRows, calculateKpis, isAlertaCritico } from '../core/report-engine.js';

const row = (codigo, overrides = {}) => ({
  codigo, descricao: `Produto ${codigo}`, variacao: 0, variacaoTemporal: null,
  mudouRegime: false, scoreInstabilidade: 0, classificacaoInstabilidade: 'ESTÁVEL',
  diferenca: null, inicial: 10, final: 10, ...overrides
});
const rank = (a, b) => compareByInvestigativePriority(a, b, getOperationalPriority);
let headers;

beforeEach(() => {
  headers = ['codigo', 'variacao', 'mudouRegime'].map(sortKey => ({
    dataset: { sortKey }, classList: { toggle: vi.fn() }, addEventListener(_event, handler) { this.click = handler; }
  }));
  global.document = { querySelectorAll: () => headers };
});
afterEach(() => { delete global.document; delete global.XLSX; delete global.Swal; });

function harness(rows) {
  const state = createInitialState();
  state.reportRows = rows;
  const noopControl = () => ({ addEventListener() {}, value: '', classList: { add() {} } });
  const dom = {
    tableBody: { innerHTML: '', addEventListener() {} }, kpiCards: [],
    selO: noopControl(), selF: noopControl(), selA: noopControl(), selI: noopControl(),
    dtStart: noopControl(), dtEnd: noopControl(), analyzeBtn: noopControl(), exportBtn: noopControl(),
    drillClose: noopControl(), drillPanel: noopControl()
  };
  const table = createTableController({ dom, executeOperationalBoundary: vi.fn(), renderDrillThrough: vi.fn(), rerunReportForProduct: vi.fn() });
  const renderTable = vi.fn((data, options) => table.renderTable(data, options));
  const filters = createFiltersController({ dom, state, renderTable, runReport: vi.fn(), exportReport: vi.fn(), fetchMetadata: vi.fn(), executeOperationalBoundary: vi.fn() });
  const codes = () => [...dom.tableBody.innerHTML.matchAll(/data-row-type="main"/g)].length;
  const visibleCodes = () => [...dom.tableBody.innerHTML.matchAll(/data-codigo="([^"]+)" data-row-type="main"/g)].map(m => m[1]);
  return { state, dom, filters, renderTable, codes, visibleCodes };
}

function outubro() {
  // Demais candidatos sintéticos estáveis; os cinco pares reproduzem os custos/datas auditados.
  const facts = Array.from({ length: 344 }, (_, i) => ({
    codigo_produto: String(2000000 + i), descricao: `Estável ${i}`, custo_total: 10,
    data_referencia: '2026-10-14', criado_em: '2026-10-19T19:58:41Z'
  }));
  for (const [codigo, antes, depois] of [['1002012', 39.87, 37.5], ['1002152', 38.83, 36.4],
    ['MM006', 0.09, 0.08], ['MM013', 0.09, 0.08], ['MM014', 0.09, 0.08]]) {
    facts.push({ codigo_produto: codigo, custo_total: antes, data_referencia: '2026-10-05', criado_em: '2026-10-19T19:58:24Z' },
      { codigo_produto: codigo, custo_total: depois, data_referencia: '2026-10-14', criado_em: '2026-10-19T19:58:41Z' });
  }
  return buildReportRows(facts);
}

describe('LOG-05 — priorização global antes do TOP-200', () => {
  it.each([0, 37, 199, 200, 201, 349, 500])('%i candidatos: renderiza somente os primeiros da ordem global completa', total => {
    const rows = Array.from({ length: total }, (_, i) => row(String(1000 + i), {
      variacaoTemporal: i % 2 ? -(i / 100) : i / 100, variacao: 0
    }));
    if (total) rows.at(-1).mudouRegime = true;
    const original = globalThis.structuredClone(rows);
    const ctx = harness(rows);
    ctx.filters.applyTableView();
    const expected = [...rows].sort(rank);
    expect(ctx.renderTable.mock.calls[0][0]).toEqual(expected);
    expect(ctx.visibleCodes()).toEqual(expected.slice(0, 200).map(r => r.codigo));
    expect(ctx.codes()).toBe(Math.min(total, 200));
    expect(rows).toEqual(original);
    expect(ctx.state.reportRows).toHaveLength(total);
    expect(MAX_VISIBLE_INVESTIGATION_ROWS).toBe(200);
  });

  it('caso de outubro: cinco alertas antes em 345–349 passam a 1–5 pelos critérios existentes', () => {
    const rows = outubro();
    const old = [...rows].sort((a, b) => compareRowsBySort(a, b, 'variacao', 'desc'));
    expect(old.slice(0, 200).filter(isAlertaCritico)).toHaveLength(0);
    expect(old.filter(isAlertaCritico).map(r => old.indexOf(r) + 1)).toEqual([345, 346, 347, 348, 349]);
    expect(old.slice(0, 500).filter(isAlertaCritico)).toHaveLength(5);
    const kpis = calculateKpis(rows);
    const ctx = harness(rows);
    ctx.filters.applyTableView();
    expect(ctx.visibleCodes().slice(0, 5)).toEqual(['MM006', 'MM013', 'MM014', '1002152', '1002012']);
    expect(ctx.codes()).toBe(200);
    expect(calculateKpis(rows)).toEqual(kpis);
    expect(kpis).toMatchObject({ totalItens: 349, totalAlertas: 5, mudancasRegime: 0 });
  });

  it('filtra candidatos completos antes de ordenar/cortar e preserva o relatório para KPIs/exportação', () => {
    const rows = outubro();
    const ctx = harness(rows);
    ctx.state.reportView.quickFilter = 'alerts';
    ctx.filters.applyTableView();
    expect(ctx.codes()).toBe(5);
    expect(ctx.visibleCodes()).toEqual(['MM006', 'MM013', 'MM014', '1002152', '1002012']);
    expect(ctx.state.reportRows).toBe(rows);
    expect(rows).toHaveLength(349);
  });

  it('mantém alertas abaixo do TOP quando há 200 casos de criticidade superior', () => {
    const rows = Array.from({ length: 205 }, (_, i) => row(String(1000 + i), {
      classificacaoInstabilidade: 'MUITO INSTÁVEL'
    }));
    rows.push(row('ALERTA', { variacaoTemporal: -6 }));
    const ctx = harness(rows);
    ctx.filters.applyTableView();
    expect(ctx.codes()).toBe(200);
    expect(ctx.visibleCodes()).not.toContain('ALERTA');
    expect(ctx.renderTable.mock.calls[0][0].at(-1).codigo).toBe('ALERTA');
    expect(calculateKpis(ctx.state.reportRows).totalAlertas).toBe(1);
  });

  it('a exportação padrão conserva os 349 candidatos na mesma ordem global, sem corte visual', async () => {
    const rows = outubro();
    const ctx = harness(rows);
    ctx.filters.applyTableView();
    for (const key of ['selO', 'selF', 'selA']) {
      ctx.dom[key].options = [{ textContent: 'Todos' }];
      ctx.dom[key].selectedIndex = 0;
    }
    global.Swal = { fire: vi.fn().mockResolvedValue({ isConfirmed: true, value: ['Produto (código)'] }) };
    global.XLSX = { utils: { json_to_sheet: vi.fn(() => ({})), book_new: vi.fn(() => ({})), book_append_sheet: vi.fn() }, writeFile: vi.fn() };
    const exporter = createExportController({
      dom: ctx.dom, state: ctx.state, executeOperationalBoundary: async (_operation, action) => action(),
      getOperationalPriority, buildInvestigativeSummary: () => 'Contexto preservado'
    });
    await exporter.exportReport();
    const exported = global.XLSX.utils.json_to_sheet.mock.calls[1][0];
    expect(exported).toHaveLength(349);
    expect(exported.map(r => r['Produto (código)']).slice(0, 200)).toEqual(ctx.visibleCodes());
    expect(global.XLSX.writeFile).toHaveBeenCalledTimes(1);
    expect(ctx.state.reportRows).toBe(rows);
  });

  it('ordenação manual por variação permanece numérica, explícita e alterna direção', () => {
    const rows = outubro();
    const ctx = harness(rows);
    ctx.filters.bindFilters();
    headers[1].click();
    expect(ctx.state.reportView.sortKey).toBe('variacao');
    expect(ctx.state.reportView.sortDirection).toBe('desc');
    expect(ctx.visibleCodes()).toEqual([...rows].sort((a, b) => compareRowsBySort(a, b, 'variacao', 'desc')).slice(0, 200).map(r => r.codigo));
    expect(ctx.dom.tableBody.innerHTML).toContain('ordenação escolhida');
    expect(ctx.dom.tableBody.innerHTML).not.toContain('itens mais prioritários');
    headers[1].click();
    expect(ctx.state.reportView.sortDirection).toBe('asc');
    expect(ctx.visibleCodes()).toEqual([...rows].sort((a, b) => compareRowsBySort(a, b, 'variacao', 'asc')).slice(0, 200).map(r => r.codigo));
  });

  it('default permanece investigativo após recalcular ou trocar o filtro rápido', () => {
    const ctx = harness(outubro());
    ctx.filters.applyTableView();
    const initial = ctx.visibleCodes();
    ctx.state.reportView.quickFilter = 'alerts';
    ctx.filters.applyTableView();
    ctx.state.reportView.quickFilter = 'all';
    ctx.filters.applyTableView();
    expect(ctx.visibleCodes()).toEqual(initial);
    expect(ctx.state.reportView.sortKey).toBeNull();
  });
});

describe('LOG-05 — critérios já existentes, sem novos pesos', () => {
  it('criticidade precede regime, magnitude, alerta e instabilidade', () => {
    const critical = row('C', { classificacaoInstabilidade: 'MUITO INSTÁVEL' });
    const attention = row('A', { variacaoTemporal: 19, scoreInstabilidade: 100 });
    expect(rank(critical, attention)).toBeLessThan(0);
  });

  it('regime precede magnitude entre críticos', () => {
    expect(rank(row('R', { mudouRegime: true }), row('M', { variacao: 30, variacaoTemporal: 30 }))).toBeLessThan(0);
  });

  it('magnitude é absoluta: queda maior precede alta menor, sem preferência de sinal', () => {
    expect(rank(row('N', { variacaoTemporal: -12 }), row('P', { variacaoTemporal: 6 }))).toBeLessThan(0);
    expect(rank(row('A', { variacaoTemporal: -6 }), row('B', { variacaoTemporal: 6 }))).toBeLessThan(0);
  });

  it('null usa a variação de período; zero temporal válido não usa esse fallback', () => {
    expect(getInvestigationRankScore(row('N', { variacaoTemporal: null, variacao: -8 }), getOperationalPriority).magnitude).toBe(8);
    expect(getInvestigationRankScore(row('Z', { variacaoTemporal: 0, variacao: -8 }), getOperationalPriority).magnitude).toBe(0);
    expect(getInvestigationRankScore(row('V', { variacaoTemporal: null, variacao: null, scoreInstabilidade: null }), getOperationalPriority)).toMatchObject({ magnitude: 0, instabilidade: 0, reincidencia: 0 });
  });

  it('flag de alerta desempata magnitude, seguida de instabilidade e código', () => {
    const fallback = row('A', { variacaoTemporal: null, variacao: 5, classificacaoInstabilidade: 'OSCILANDO' });
    const alert = row('B', { variacaoTemporal: -5 });
    expect(rank(alert, fallback)).toBeLessThan(0);
    expect(rank(row('Z', { scoreInstabilidade: 2 }), row('A', { scoreInstabilidade: 1 }))).toBeLessThan(0);
    expect(rank(row('A'), row('B'))).toBeLessThan(0);
    expect(rank(row('A'), row('A'))).toBe(0);
  });

  it('entrada repetida ou embaralhada produz a mesma ordem quando os critérios empatam', () => {
    const rows = ['D', 'B', 'A', 'C'].map(c => row(c, { variacaoTemporal: -6 }));
    const first = [...rows].sort(rank);
    expect([...rows].reverse().sort(rank)).toEqual(first);
    expect([...rows].sort(rank)).toEqual(first);
    expect(first.map(r => r.codigo)).toEqual(['A', 'B', 'C', 'D']);
  });
});
