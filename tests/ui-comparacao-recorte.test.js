import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const api = vi.hoisted(() => ({ getLatestImportComparison: vi.fn(), getTopVariacoesImportacao: vi.fn() }));
vi.mock('../src/services/api.js', () => ({ api }));
import { createChartsController } from '../view/ui-charts.js';

let dom;
let state;
let charts;
beforeEach(() => {
  vi.clearAllMocks();
  const element = () => ({ textContent: '', innerHTML: '', className: '', classList: { add: vi.fn(), remove: vi.fn(), toggle: vi.fn() } });
  dom = Object.fromEntries(['mainChart', 'topVariationsPanel', 'topIncreasesList', 'topReductionsList', 'trendChart', 'trendFallback', 'trendBadge'].map(key => [key, element()]));
  state = { chart: { destroy: vi.fn() }, trendChart: null };
  charts = createChartsController({ dom, state });
  vi.stubGlobal('document', { documentElement: {} });
  vi.stubGlobal('window', { getComputedStyle: () => ({ getPropertyValue: () => '#000000' }) });
  vi.stubGlobal('Swal', { fire: vi.fn() });
  vi.stubGlobal('Chart', vi.fn(function (_canvas, config) { this.config = config; this.destroy = vi.fn(); }));
});
afterEach(() => { vi.unstubAllGlobals(); });

describe('LOG-03 — consumidores não mostram comparação falsa', () => {
  it.each([
    { data: null, error: new Error('Leitura indisponível') },
    { data: { imports: [], resumo: null, estadoComparacao: 'insuficiente' }, error: null },
    { data: { imports: [{ criado_em: '2026-06-01', media: 10, quantidade: 1 }], resumo: null, estadoComparacao: 'insuficiente' }, error: null },
    { data: { imports: [{ media: 10, quantidade: 1 }, { media: 20, quantidade: 1 }], resumo: null, estadoComparacao: 'disponivel' }, error: null },
    { data: { imports: [{ media: 0, quantidade: 0 }, { media: 0, quantidade: 0 }], resumo: { variacao_percentual_media: 0 }, estadoComparacao: 'disponivel' }, error: null }
  ])('limpa gráfico anterior e recusa erro/ausência/zero fictício: %j', async response => {
    api.getLatestImportComparison.mockResolvedValue(response);
    const old = state.chart;
    expect(await charts.renderImportComparisonChart({ start: '2026-04-01', end: '2026-06-30' })).toBe(false);
    expect(old.destroy).toHaveBeenCalledOnce();
    expect(state.chart).toBeNull();
    expect(globalThis.Chart).not.toHaveBeenCalled();
  });

  it('zero observado renderiza; percentual sem denominador não vira 0%', async () => {
    api.getLatestImportComparison.mockResolvedValue({ error: null, data: {
      estadoComparacao: 'disponivel', imports: [
        { criado_em: '2026-07-02T00:00:00Z', media: 10, quantidade: 1 },
        { criado_em: '2026-07-01T00:00:00Z', media: 0, quantidade: 1 }
      ], resumo: { variacao_percentual_media: null, delta_media: 10 }
    } });
    expect(await charts.renderImportComparisonChart({})).toBe(true);
    const config = state.chart.config;
    expect(config.data.datasets[0].data).toEqual([10, 0]);
    const text = config.options.plugins.tooltip.callbacks.afterBody([{ dataIndex: 0 }]);
    expect(text).toContain('indisponível');
    expect(text).not.toContain('0.00%');
  });

  it('TOP identifica a data completa de cada par, com escape HTML', async () => {
    api.getTopVariacoesImportacao.mockResolvedValue({ error: null, data: {
      estadoComparacao: 'disponivel', aumentos: [{ codigo_produto: '001', descricao: '<script>', data_referencia: '2026-06-14', variacao_percentual: 10 }], reducoes: []
    } });
    await charts.renderTopVariationsPanel({});
    expect(dom.topIncreasesList.innerHTML).toContain('14/06/2026');
    expect(dom.topIncreasesList.innerHTML).toContain('001');
    expect(dom.topIncreasesList.innerHTML).toContain('&lt;script&gt;');
    expect(dom.topIncreasesList.innerHTML).not.toContain('<script>');
    expect(dom.topVariationsPanel.classList.remove).toHaveBeenCalledWith('hidden');
  });

  it('TOP indisponível não mostra lista anterior nem inventa estabilidade', async () => {
    api.getTopVariacoesImportacao.mockResolvedValue({ error: null, data: {
      estadoComparacao: 'insuficiente', motivo: 'sem_pares_comparaveis', aumentos: [], reducoes: []
    } });
    await charts.renderTopVariationsPanel({});
    expect(dom.topVariationsPanel.classList.add).toHaveBeenCalledWith('hidden');
    expect(dom.topIncreasesList.innerHTML).not.toMatch(/estável|0%/i);
  });

  it('série temporal insuficiente informa falta de base, sem badge verde de estabilidade', async () => {
    expect(await charts.renderTemporalAnalysis([], {})).toBe(false);
    expect(dom.trendFallback.textContent).toContain('insuficiente');
    expect(dom.trendBadge.textContent).toBe('Base temporal insuficiente');
    expect(dom.trendBadge.className).not.toContain('stable');
    expect(globalThis.Chart).not.toHaveBeenCalled();
  });
});
