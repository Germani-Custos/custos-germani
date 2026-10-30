import { describe, expect, it, beforeEach, vi } from 'vitest';

// Harness de mocks (opção b): não exporta internos nem toca no runtime.
// O cliente Supabase real (CDN) nunca é carregado — o módulo api é mockado.
vi.mock('../src/services/api.js', () => ({
  api: { getProductHistory: vi.fn() }
}));

import { createDrillThroughController } from '../view/ui-drill-through.js';
import { api } from '../src/services/api.js';

function fakeClassList() {
  return { added: [], removed: [], add(c) { this.added.push(c); }, remove(c) { this.removed.push(c); } };
}

function fakeDom() {
  return {
    drillTitle: { textContent: '' },
    drillSubtitle: { textContent: '' },
    drillBody: { innerHTML: '' },
    drillPanel: { classList: fakeClassList(), scrollIntoView: vi.fn() }
  };
}

describe('createDrillThroughController — renderDrillThrough', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.Swal = { fire: vi.fn() };
  });

  it('renderiza competência e data de referência e marca alerta ≥5%', async () => {
    api.getProductHistory.mockResolvedValue({
      data: [
        { data_referencia: '2026-01-01', criado_em: '2026-05-10T10:00:00Z', custo_variavel: 1, custo_direto_fixo: 2, custo_total: 3, delta: null, deltaPerc: null, descricao: 'Item A' },
        { data_referencia: '2026-02-01', criado_em: '2026-05-11T10:00:00Z', custo_variavel: 1.1, custo_direto_fixo: 2, custo_total: 3.3, delta: 0.3, deltaPerc: 10, descricao: 'Item A' }
      ],
      error: null
    });

    const dom = fakeDom();
    const { renderDrillThrough } = createDrillThroughController({ dom });
    const temporalFilters = { mode: 'comparison', start: '2026-01-01', end: '2026-02-01', competencias: ['2026-01-01', '2026-02-01'] };
    await renderDrillThrough('001', temporalFilters);

    expect(dom.drillTitle.textContent).toContain('001');
    expect(dom.drillTitle.textContent).toContain('Item A');
    expect(dom.drillSubtitle.textContent).toContain('2 registro');
    expect(api.getProductHistory).toHaveBeenCalledWith('001', temporalFilters);
    // A linha de +10% é alerta crítico (isAlertaCritico via deltaPerc); a de delta null não.
    expect(dom.drillBody.innerHTML).toContain('row-alert');
    expect(dom.drillBody.innerHTML).toContain('+10.00%');
    expect(dom.drillBody.innerHTML).toContain('—'); // Δ da 1ª linha (sem anterior)
    // Painel exibido e rolado até a área.
    expect(dom.drillPanel.classList.removed).toContain('hidden');
    expect(dom.drillPanel.scrollIntoView).toHaveBeenCalled();
  });

  it('exibe os cinco exemplos pela data_referencia, sem data/hora de importação', async () => {
    const dates = ['2026-04-05', '2026-05-05', '2026-06-05', '2026-07-05', '2026-10-05'];
    const history = dates.map(data_referencia => Object.freeze({
      data_referencia, criado_em: '2026-08-07T15:15:17-03:00',
      custo_variavel: 1, custo_direto_fixo: 2, custo_total: 3,
      delta: null, deltaPerc: null, descricao: 'Item A'
    }));
    api.getProductHistory.mockResolvedValue({ data: history, error: null });
    const dom = fakeDom();
    await createDrillThroughController({ dom }).renderDrillThrough('001');

    const html = dom.drillBody.innerHTML;
    expect(html).toContain('<th title="Data de referência da competência">Data</th>');
    expect(html).not.toContain('Importado em');
    expect(html).not.toContain('07/08/2026');
    expect(html).not.toContain('15:15:17');
    const pairs = [...html.matchAll(/<td><strong>(.*?)<\/strong><\/td>\s*<td>(.*?)<\/td>/g)]
      .map(([, competencia, data]) => [competencia, data]);
    expect(pairs).toEqual([
      ['abr. de 2026', '05/04/2026'], ['mai. de 2026', '05/05/2026'],
      ['jun. de 2026', '05/06/2026'], ['jul. de 2026', '05/07/2026'],
      ['out. de 2026', '05/10/2026']
    ]);
    expect(history.map(row => row.data_referencia)).toEqual(dates);
    expect(history.every(row => row.criado_em === '2026-08-07T15:15:17-03:00')).toBe(true);
  });

  it.each([
    ['2026-04-01', '01/04/2026'], ['2026-05-01', '01/05/2026'],
    ['2026-06-01', '01/06/2026'], ['2026-07-15', '15/07/2026'],
    ['2026-10-05', '05/10/2026'], ['2026-10-14', '14/10/2026'],
    ['2024-02-29', '29/02/2024'], [null, '-'], ['', '-'], ['inválida', '-']
  ])('preserva o dia de origem %s como %s, sem fallback para criado_em', async (data_referencia, expected) => {
    api.getProductHistory.mockResolvedValue({
      data: [{ data_referencia, criado_em: '2026-08-07T15:15:17-03:00',
        custo_variavel: 1, custo_direto_fixo: 2, custo_total: 3, delta: null, deltaPerc: null }],
      error: null
    });
    const dom = fakeDom();
    await createDrillThroughController({ dom }).renderDrillThrough('001');
    expect(dom.drillBody.innerHTML).toContain(`<td>${expected}</td>`);
    expect(dom.drillBody.innerHTML).not.toContain('15:15:17');
  });

  it('mantém duas linhas de outubro para 05/10 e 14/10, sem agrupar pelo rótulo mensal', async () => {
    api.getProductHistory.mockResolvedValue({
      data: ['2026-10-05', '2026-10-14'].map(data_referencia => ({
        data_referencia, criado_em: '2026-10-20T15:15:17-03:00',
        custo_variavel: 1, custo_direto_fixo: 2, custo_total: 3, delta: null, deltaPerc: null
      })), error: null
    });
    const dom = fakeDom();
    await createDrillThroughController({ dom }).renderDrillThrough('001');
    const html = dom.drillBody.innerHTML;
    expect(html.match(/<strong>out\. de 2026<\/strong>/g)).toHaveLength(2);
    expect(html).toMatch(/out\. de 2026<\/strong><\/td>\s*<td>05\/10\/2026<\/td>/);
    expect(html).toMatch(/out\. de 2026<\/strong><\/td>\s*<td>14\/10\/2026<\/td>/);
    expect(dom.drillSubtitle.textContent).toContain('2 registro(s)');
  });

  it('não renderiza tabela nem abre o painel quando não há histórico', async () => {
    api.getProductHistory.mockResolvedValue({ data: [], error: null });

    const dom = fakeDom();
    const { renderDrillThrough } = createDrillThroughController({ dom });
    await renderDrillThrough('001');

    expect(dom.drillBody.innerHTML).toBe('');
    expect(dom.drillPanel.classList.removed).not.toContain('hidden');
    expect(global.Swal.fire).toHaveBeenCalled(); // showToast('info', ...)
  });

  it('recarrega o produto aberto ao mudar as competências do recorte', async () => {
    api.getProductHistory.mockResolvedValue({
      data: [{ data_referencia: '2026-06-01', criado_em: '2026-06-10T10:00:00Z', custo_variavel: 1, custo_direto_fixo: 2, custo_total: 3, delta: null, deltaPerc: null, descricao: 'Item A' }],
      error: null
    });

    const dom = fakeDom();
    const { renderDrillThrough, refreshActive } = createDrillThroughController({ dom });
    await renderDrillThrough('001', { mode: 'comparison', start: '2026-06-01', end: '2026-08-01', competencias: ['2026-06-01', '2026-08-01'] });
    const nextTemporalFilters = { mode: 'comparison', start: '2026-07-01', end: '2026-08-01', competencias: ['2026-07-01', '2026-08-01'] };
    await refreshActive(nextTemporalFilters);

    expect(api.getProductHistory).toHaveBeenLastCalledWith('001', nextTemporalFilters);
  });

  it('avisa e não abre o painel quando a API falha', async () => {
    api.getProductHistory.mockResolvedValue({ data: null, error: { message: 'boom' } });

    const dom = fakeDom();
    const { renderDrillThrough } = createDrillThroughController({ dom });
    await renderDrillThrough('001');

    expect(dom.drillBody.innerHTML).toBe('');
    expect(dom.drillPanel.classList.removed).not.toContain('hidden');
    expect(global.Swal.fire).toHaveBeenCalled(); // showToast('error', ...)
  });

  it.each([[[]], [['002']]])('fecha produto excluído pelo recorte %j sem consultar novamente', async eligibleCodes => {
    api.getProductHistory.mockResolvedValue({ data: [{ data_referencia: '2026-06-01', custo_total: 3, delta: null, deltaPerc: null }], error: null });
    const dom = fakeDom();
    const controller = createDrillThroughController({ dom });
    await controller.renderDrillThrough('001');
    await controller.refreshActive({ start: '2026-06-01' }, eligibleCodes);
    expect(dom.drillPanel.classList.added).toContain('hidden');
    expect(api.getProductHistory).toHaveBeenCalledOnce();
    await controller.refreshActive({}, ['001']);
    expect(api.getProductHistory).toHaveBeenCalledOnce();
  });

  it('produto que permanece no agrupamento conserva o histórico temporal', async () => {
    api.getProductHistory.mockResolvedValue({ data: [{ data_referencia: '2026-06-01', custo_total: 3, delta: null, deltaPerc: null }], error: null });
    const controller = createDrillThroughController({ dom: fakeDom() });
    await controller.renderDrillThrough('001');
    await controller.refreshActive({ competencias: ['2026-06-01'] }, ['001']);
    expect(api.getProductHistory).toHaveBeenLastCalledWith('001', { competencias: ['2026-06-01'] });
  });
});
