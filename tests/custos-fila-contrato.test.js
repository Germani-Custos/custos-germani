import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as XLSX from 'xlsx';

vi.mock('../src/services/api.js', () => ({ api: { subscribeFiltrosRealtime: vi.fn(() => () => {}) } }));
import { buildReportRows } from '../core/report-engine.js';
import { createInitialState } from '../view/ui-state.js';
import { createFiltersController } from '../view/ui-filters.js';
import { buildInvestigativeSummary, createTableController, getOperationalPriority } from '../view/ui-table.js';
import { createExportController } from '../view/ui-export.js';

function facts(costs, codigo = '001') {
  return costs.map((custo_total, i) => ({
    codigo_produto: codigo, descricao: 'Produto', custo_total,
    data_referencia: `2026-10-${String(i + 5).padStart(2, '0')}`,
    criado_em: `2026-10-19T12:00:${String(i).padStart(2, '0')}Z`
  }));
}

function control(extra = {}) {
  return { value: '', classList: { add() {}, toggle() {} },
    addEventListener(_type, handler) { this.click = handler; }, ...extra };
}

function setup(rows) {
  const headers = ['variacao', 'codigo'].map(sortKey => control({ dataset: { sortKey } }));
  global.document = { querySelectorAll: () => headers };
  const dom = {
    dtStart: control({ value: '2026-10-01' }), dtEnd: control({ value: '2026-10-31' }),
    selO: control({ options: [{ textContent: 'TODAS' }], selectedIndex: 0 }),
    selF: control({ options: [{ textContent: 'TODAS' }], selectedIndex: 0 }),
    selA: control({ options: [{ textContent: 'TODOS' }], selectedIndex: 0 }),
    selI: control(), analyzeBtn: control(), exportBtn: control(),
    investigationSortBtn: control(), drillClose: control(), drillPanel: control(),
    tableBody: control({ innerHTML: '' }), kpiCards: []
  };
  const state = createInitialState();
  state.reportRows = rows;
  const runReport = vi.fn();
  const table = createTableController({ dom, executeOperationalBoundary: vi.fn(),
    renderDrillThrough: vi.fn(), rerunReportForProduct: vi.fn() });
  const renderTable = vi.fn((...args) => table.renderTable(...args));
  const filters = createFiltersController({ dom, state, runReport, renderTable,
    fetchMetadata: vi.fn(), exportReport: vi.fn(), executeOperationalBoundary: vi.fn() });
  const exporter = createExportController({ dom, state, getOperationalPriority, buildInvestigativeSummary,
    executeOperationalBoundary: async (_operation, action) => action() });
  filters.bindFilters();
  const visible = () => [...dom.tableBody.innerHTML.matchAll(/data-codigo="([^"]+)" data-row-type="main"/g)].map(m => m[1]);
  async function exported() {
    await exporter.exportReport();
    const wb = global.XLSX.writeFile.mock.calls.at(-1)[0];
    return {
      rows: XLSX.utils.sheet_to_json(wb.Sheets['Fila Investigativa']),
      metadata: XLSX.utils.sheet_to_json(wb.Sheets.Contexto)
    };
  }
  return { dom, state, headers, filters, renderTable, visible, exported, runReport };
}

beforeEach(() => {
  // Monta workbook/worksheets reais; somente o download é substituído.
  global.XLSX = { ...XLSX, writeFile: vi.fn() };
  global.Swal = { fire: vi.fn().mockResolvedValue({ isConfirmed: true, value: [
    'Produto (código)', 'Contexto investigativo', 'Alerta atual (≥5%)', 'Variação da última importação (%)'
  ] }) };
});
afterEach(() => { delete global.document; delete global.XLSX; delete global.Swal; });

describe('LOG-06 — mesma fila completa na tela e no workbook', () => {
  const candidates = () => buildReportRows([
    ...facts([100, 101], '001'), ...facts([100, 94], '002'), ...facts([100, 104], '003')
  ]);

  it.each([
    [null, 'desc', ['002', '003', '001']],
    ['variacao', 'desc', ['003', '001', '002']],
    ['variacao', 'asc', ['002', '001', '003']],
    ['codigo', 'desc', ['003', '002', '001']],
    ['codigo', 'asc', ['001', '002', '003']]
  ])('ordem %s/%s é idêntica em UI e XLSX', async (key, direction, expected) => {
    const ctx = setup(candidates());
    ctx.state.reportView.sortKey = key;
    ctx.state.reportView.sortDirection = direction;
    ctx.filters.applyTableView();
    const out = await ctx.exported();
    expect(ctx.visible()).toEqual(expected);
    expect(out.rows.map(r => r['Produto (código)'])).toEqual(expected);
    const order = out.metadata.find(r => r.Campo === 'Ordenação aplicada').Valor;
    expect(order).toContain(key ? `Manual: ${key} (${direction})` : 'Prioridade investigativa:');
    expect(order).not.toMatch(/reincid/i);
  });

  it('troca coluna/direção e restaura prioridade sem perder recorte/filtro ou refazer consulta', async () => {
    const ctx = setup(candidates());
    ctx.state.reportView.quickFilter = 'positive';
    ctx.headers[0].click();
    expect(ctx.visible()).toEqual(['003', '001']);
    ctx.headers[0].click();
    expect(ctx.visible()).toEqual(['001', '003']);
    ctx.headers[1].click();
    expect(ctx.state.reportView).toMatchObject({ sortKey: 'codigo', sortDirection: 'desc' });
    ctx.dom.investigationSortBtn.click();
    expect(ctx.state.reportView).toMatchObject({ sortKey: null, sortDirection: 'desc', quickFilter: 'positive' });
    expect(ctx.visible()).toEqual(['003', '001']);
    expect((await ctx.exported()).rows.map(r => r['Produto (código)'])).toEqual(ctx.visible());
    expect(ctx.state.reportRows).toHaveLength(3);
    expect(ctx.dom.dtStart.value).toBe('2026-10-01');
    expect(ctx.runReport).not.toHaveBeenCalled();
  });

  it.each([null, 'variacao'])('exporta >200 completos em ordem %s, sem duplicar/perder linhas ou alterar KPIs', async key => {
    const rows = buildReportRows(Array.from({ length: 210 }, (_, i) => facts([100, i % 2 ? 94 : 101], String(1000 + i))).flat());
    const ctx = setup(rows);
    const before = globalThis.structuredClone(rows);
    ctx.state.reportView.sortKey = key;
    ctx.filters.applyTableView();
    const out = await ctx.exported();
    expect(out.rows).toHaveLength(210);
    expect(new Set(out.rows.map(r => r['Produto (código)'])).size).toBe(210);
    expect(out.rows.slice(0, 200).map(r => r['Produto (código)'])).toEqual(ctx.visible());
    expect(ctx.dom.tableBody.innerHTML).toContain(key ? 'ordenação escolhida' : 'itens mais prioritários de 210');
    expect(ctx.state.reportRows).toEqual(before);
  });
});

describe('LOG-04 — contexto factual, sem recorrência inferida', () => {
  it.each([
    [[100, 106], 'Alerta de alta'],
    [[100, 94], 'Alerta de queda'],
    [[9.24, 9.39], 'Alta no período'],
    [[100, 104], 'Alta no período'],
    [[100], 'Sem comparativo'],
    [[100, 106, 100], 'Alerta de queda'],
    [[100, 106, 112.36], 'Alerta de alta']
  ])('série %j: resumo só afirma evidência disponível no ReportRow', (costs, expected) => {
    const [row] = buildReportRows(facts(costs));
    const summary = buildInvestigativeSummary(row);
    expect(summary).toContain(expected);
    expect(summary).not.toMatch(/2ª|consecutiv|reincid|recorr|estabilidade longa|crescente/i);
    expect(getOperationalPriority(row).reason).not.toMatch(/recorr|reincid/i);
  });

  it('dois alertas de alta podem ser comprovados nos fatos, mas o agregado não transporta sua contagem', () => {
    const input = facts([100, 106, 112.36]);
    // Prova independente: duas transições de +6%, não duas representações da mesma transição.
    expect(input.slice(1).map((r, i) => (r.custo_total / input[i].custo_total - 1) * 100))
      .toEqual([expect.closeTo(6), expect.closeTo(6)]);
    const [aggregate] = buildReportRows(input);
    expect(aggregate.variacao).toBeCloseTo(12.36);
    expect(aggregate.variacaoTemporal).toBeCloseTo(6);
    // Sem contrato de contagem/proveniência das transições, o presenter é conservador.
    expect(buildInvestigativeSummary(aggregate)).toContain('Alerta de alta');
    expect(buildInvestigativeSummary(aggregate)).not.toMatch(/consecutiv|reincid|recorr/i);
  });

  it('XLSX distingue alerta atual, não alerta e falta de base, sem inventar reincidência', async () => {
    const ctx = setup(buildReportRows([
      ...facts([100, 106], '001'), ...facts([100, 101], '002'), ...facts([100], '003')
    ]));
    const out = await ctx.exported();
    expect(out.rows.map(r => r['Alerta atual (≥5%)'])).toEqual(['SIM', 'NÃO', 'SEM COMPARATIVO']);
    expect(out.rows[2]['Variação da última importação (%)']).toBe('—');
    expect(JSON.stringify(out)).not.toMatch(/2ª|reincid|recorr|consecutiv/i);
    expect(global.Swal.fire.mock.calls[0][0].html).toContain('Alerta atual (≥5%)');
    expect(global.Swal.fire.mock.calls[0][0].html).not.toContain('Reincidência');
  });

  it('mudança de regime não inventa duração da estabilidade anterior', () => {
    const [row] = buildReportRows(facts([100, 101, 102, 120]));
    expect(row.mudouRegime).toBe(true);
    expect(buildInvestigativeSummary(row)).toContain('Mudança de regime no recorte analisado.');
    expect(buildInvestigativeSummary(row)).not.toMatch(/longa|consecutiv|reincid/i);
  });
});
