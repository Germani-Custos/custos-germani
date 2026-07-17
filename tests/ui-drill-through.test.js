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

  it('renderiza o histórico rotulando competência × importação e marca alerta ≥5%', async () => {
    api.getProductHistory.mockResolvedValue({
      data: [
        { data_referencia: '2026-01-01', criado_em: '2026-05-10T10:00:00Z', custo_variavel: 1, custo_direto_fixo: 2, custo_total: 3, delta: null, deltaPerc: null, descricao: 'Item A' },
        { data_referencia: '2026-02-01', criado_em: '2026-05-11T10:00:00Z', custo_variavel: 1.1, custo_direto_fixo: 2, custo_total: 3.3, delta: 0.3, deltaPerc: 10, descricao: 'Item A' }
      ],
      error: null
    });

    const dom = fakeDom();
    const { renderDrillThrough } = createDrillThroughController({ dom });
    await renderDrillThrough('001');

    expect(dom.drillTitle.textContent).toContain('001');
    expect(dom.drillTitle.textContent).toContain('Item A');
    expect(dom.drillSubtitle.textContent).toContain('2 registro');
    // A linha de +10% é alerta crítico (isAlertaCritico via deltaPerc); a de delta null não.
    expect(dom.drillBody.innerHTML).toContain('row-alert');
    expect(dom.drillBody.innerHTML).toContain('+10.00%');
    expect(dom.drillBody.innerHTML).toContain('—'); // Δ da 1ª linha (sem anterior)
    // Painel exibido e rolado até a área.
    expect(dom.drillPanel.classList.removed).toContain('hidden');
    expect(dom.drillPanel.scrollIntoView).toHaveBeenCalled();
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

  it('avisa e não abre o painel quando a API falha', async () => {
    api.getProductHistory.mockResolvedValue({ data: null, error: { message: 'boom' } });

    const dom = fakeDom();
    const { renderDrillThrough } = createDrillThroughController({ dom });
    await renderDrillThrough('001');

    expect(dom.drillBody.innerHTML).toBe('');
    expect(dom.drillPanel.classList.removed).not.toContain('hidden');
    expect(global.Swal.fire).toHaveBeenCalled(); // showToast('error', ...)
  });
});
