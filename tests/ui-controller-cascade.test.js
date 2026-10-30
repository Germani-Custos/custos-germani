import { beforeEach, describe, expect, it, vi } from 'vitest';

// Exercita o orquestrador público via callbacks injetados; bootstrap fica
// aguardando sessão, sem exportar internos ou carregar clientes/CDNs reais.
const h = vi.hoisted(() => ({
  dom: {}, state: null, filters: null,
  api: { getCurrentUser: () => new Promise(() => {}), getHistorico: vi.fn(), getMasters: vi.fn() },
  charts: { renderImportComparisonChart: vi.fn(), renderTopVariationsPanel: vi.fn(), renderTemporalAnalysis: vi.fn(), applyReportLayout: vi.fn() },
  drill: { refreshActive: vi.fn(), renderDrillThrough: vi.fn() },
  table: { renderTable: vi.fn(), getOperationalPriority: vi.fn(), buildInvestigativeSummary: vi.fn() }
}));
vi.mock('../src/services/api.js', () => ({ api: h.api }));
vi.mock('../view/ui-dom.js', () => ({ getDomRefs: () => h.dom }));
vi.mock('../view/ui-charts.js', () => ({ createChartsController: () => h.charts }));
vi.mock('../view/ui-drill-through.js', () => ({ createDrillThroughController: () => h.drill }));
vi.mock('../view/ui-table.js', () => ({ createTableController: () => h.table }));
vi.mock('../view/ui-import.js', () => ({ createImportController: () => ({ bindUpload() {} }) }));
vi.mock('../view/ui-import-op.js', () => ({ createImportOpController: () => ({ bindUpload() {} }) }));
vi.mock('../view/ui-op.js', () => ({ createOpController: () => ({}) }));
vi.mock('../view/ui-op-custo.js', () => ({ createOpCustoController: () => ({ bind() {} }) }));
vi.mock('../view/ui-product-master.js', () => ({ createProductMasterController: () => ({ bind() {} }) }));
vi.mock('../view/documentation-controller.js', () => ({ bindDocumentationView() {} }));
vi.mock('../view/ui-filters.js', () => ({ createFiltersController: args => {
  h.filters = args;
  h.state = args.state;
  return { bindFilters() {}, refreshCascade: vi.fn(), applyTableView: vi.fn() };
}, getOrderedInvestigationRows: rows => rows }));

const control = value => ({ value, textContent: '', addEventListener: vi.fn(), replaceChildren: vi.fn(), classList: { add: vi.fn(), remove: vi.fn() } });

beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  Object.assign(h.dom, {
    navItems: [], searchProduct: control(''),
    dtStart: control('2026-05-01'), dtEnd: control('2026-06-01'),
    selO: control('TODAS'), selF: control('TODAS'), selA: control('M005'), selI: control('TODOS'),
    reportContent: control(''), productSuggestions: {}, orphansBanner: control(''),
    kpiItens: {}, kpiAlertas: {}, kpiRegime: {}, kpiMedia: {}
  });
  vi.stubGlobal('document', { addEventListener: vi.fn(), createElement: () => ({}) });
  vi.stubGlobal('Swal', { fire: vi.fn() });
  await import('../view/ui-controller.js');
});

describe('Orquestração da cascata e consumidores', () => {
  it('transmite o mesmo grupo a relatório, KPIs/gráficos e universo elegível do drill-through', async () => {
    h.api.getHistorico.mockResolvedValue({ data: [
      { codigo_produto: '001', custo_total: 80, data_referencia: '2026-05-01', criado_em: '2026-05-10' },
      { codigo_produto: '001', custo_total: 100, data_referencia: '2026-06-01', criado_em: '2026-06-10' }
    ], error: null });
    await h.filters.runReport();
    expect(h.api.getHistorico).toHaveBeenCalledWith(expect.objectContaining({ agrupamento: 'M005' }));
    expect(h.dom.kpiItens.textContent).toBe(1);
    expect(h.dom.kpiAlertas.textContent).toBe(1);
    expect(h.state.reportRows.map(r => r.codigo)).toEqual(['001']);
    for (const method of ['renderImportComparisonChart', 'renderTopVariationsPanel']) {
      expect(h.charts[method]).toHaveBeenCalledWith(expect.objectContaining({ agrupamento: 'M005' }));
    }
    expect(h.charts.renderTemporalAnalysis).toHaveBeenCalledWith(expect.any(Array), expect.objectContaining({ agrupamento: 'M005' }));
    expect(h.drill.refreshActive).toHaveBeenCalledWith(expect.objectContaining({ start: '2026-05-01' }), ['001']);
  });

  it('recorte vazio limpa a fonte do XLSX e invalida o drill-through anterior', async () => {
    h.state.reportRows = [{ codigo: 'ANTIGO' }];
    h.api.getHistorico.mockResolvedValue({ data: [], error: null });
    await h.filters.runReport();
    expect(h.state.reportRows).toEqual([]);
    expect(h.drill.refreshActive).toHaveBeenCalledWith(expect.any(Object), []);
    await h.filters.exportReport();
    expect(global.Swal.fire).toHaveBeenCalledWith(expect.objectContaining({ text: 'Rode a análise antes de exportar.' }));
  });

  it('callback de realtime relê masters antes de atualizar opções', async () => {
    h.api.getMasters.mockResolvedValue({ origens: [], familias: [], agrupamentos: [], produtos: [], dicionario: [], hierarquia: [], error: null });
    await h.filters.fetchMetadata();
    expect(h.api.getMasters).toHaveBeenCalledOnce();
    expect(h.state.masters.agrupamentos).toEqual([]);
  });
});
