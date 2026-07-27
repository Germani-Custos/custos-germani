import { describe, expect, it, vi } from 'vitest';
import { createTableController, getOperationalPriority, buildInvestigativeSummary } from '../view/ui-table.js';

function makeTableBody() {
  const listeners = [];
  return {
    innerHTML: '',
    rows: [],
    querySelectorAll(selector) {
      if (selector === 'tr[data-row-type="main"]') {
        return [{
          dataset: { codigo: '1001' },
          addEventListener: (_event, handler) => listeners.push({ type: 'row', handler })
        }];
      }
      if (selector === '.row-details-toggle') {
        return [{
          dataset: { codigo: '1001' },
          textContent: 'Detalhes',
          addEventListener: (_event, handler) => listeners.push({ type: 'details', handler })
        }];
      }
      return [];
    },
    querySelector(selector) {
      if (selector !== 'tr[data-details-for="1001"]') return null;
      return {
        classList: {
          hidden: true,
          toggle(className) { if (className === 'hidden') this.hidden = !this.hidden; },
          contains(className) { return className === 'hidden' ? this.hidden : false; }
        }
      };
    },
    listeners
  };
}

const baseRow = {
  codigo: '1001',
  descricao: 'Produto A',
  diferenca: 12.34,
  variacaoTemporal: 5,
  variacao: 8,
  mudouRegime: false,
  classificacaoInstabilidade: 'OSCILANDO',
  ultimoCusto: 120,
  penultimoCusto: 107.66,
  inicial: 100,
  final: 108,
  ultimaAtualizacao: '2026-07-20T12:00:00Z',
  dataCompetencia: '2026-07-01',
  scoreInstabilidade: 4
};

describe('ui-table — presenter investigativo', () => {
  it('classifica prioridade reutilizável pela tabela e exportação', () => {
    expect(getOperationalPriority({ ...baseRow, mudouRegime: true }).label).toBe('🔴 Crítico');
    expect(getOperationalPriority({ ...baseRow, variacaoTemporal: 5, variacao: 4, classificacaoInstabilidade: 'ESTÁVEL' }).label).toBe('🟠 Atenção');
    expect(getOperationalPriority({ ...baseRow, variacaoTemporal: 0, variacao: 3, classificacaoInstabilidade: 'ESTÁVEL' }).label).toBe('🟡 Monitorar');
    expect(getOperationalPriority({ ...baseRow, variacaoTemporal: 0, variacao: 1, classificacaoInstabilidade: 'ESTÁVEL' }).label).toBe('🟢 Estável');
  });

  it('mantém o resumo operacional sem depender do controller principal', () => {
    expect(buildInvestigativeSummary({ ...baseRow, variacao: 10, variacaoTemporal: 6 })).toContain('2ª alta consecutiva');
    expect(buildInvestigativeSummary({ ...baseRow, variacao: -10, variacaoTemporal: -6 })).toContain('2ª queda consecutiva');
  });
});

describe('createTableController — renderTable', () => {
  it('renderiza competência/importação e preserva eventos de drill-through', async () => {
    const tableBody = makeTableBody();
    const executeOperationalBoundary = vi.fn(async (_operation, action) => action());
    const renderDrillThrough = vi.fn();
    const rerunReportForProduct = vi.fn();

    const table = createTableController({
      dom: { tableBody },
      executeOperationalBoundary,
      renderDrillThrough,
      rerunReportForProduct
    });

    table.renderTable([baseRow]);

    expect(tableBody.innerHTML).toContain('Produto A');
    expect(tableBody.innerHTML).toContain('Importado em (criado_em):');
    expect(tableBody.innerHTML).toContain('Competência (data_referencia):');
    expect(tableBody.innerHTML).toContain('row-alert');

    const rowListener = tableBody.listeners.find(listener => listener.type === 'row');
    await rowListener.handler({ target: { closest: () => null } });

    expect(executeOperationalBoundary).toHaveBeenCalledWith(
      'drill-through do produto',
      expect.any(Function),
      { message: 'Falha ao carregar o histórico completo do produto.' }
    );
    expect(renderDrillThrough).toHaveBeenCalledWith('1001');
    expect(rerunReportForProduct).toHaveBeenCalledWith('1001');
  });
});
