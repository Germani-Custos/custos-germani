import { describe, expect, it, vi } from 'vitest';
import { MAX_VISIBLE_INVESTIGATION_ROWS, createTableController, getOperationalPriority, buildInvestigativeSummary } from '../view/ui-table.js';

function makeTableBody() {
  const listeners = [];
  return {
    innerHTML: '',
    rows: [],
    addEventListener: (type, handler) => listeners.push({ type, handler }),
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
  it('renderiza competência/importação e preserva ações por delegação', async () => {
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
    expect(tableBody.listeners).toHaveLength(1);
    expect(tableBody.listeners[0].type).toBe('click');

    const tableListener = tableBody.listeners[0];
    await tableListener.handler({
      target: {
        closest: selector => selector === 'tr[data-row-type="main"]' ? { dataset: { codigo: '1001' } } : null
      }
    });

    expect(executeOperationalBoundary).toHaveBeenCalledWith(
      'drill-through do produto',
      expect.any(Function),
      { message: 'Falha ao carregar o histórico completo do produto.' }
    );
    expect(renderDrillThrough).toHaveBeenCalledWith('1001');
    expect(rerunReportForProduct).toHaveBeenCalledWith('1001');
  });

  it('renderiza somente a janela priorizada e não registra listeners por linha', () => {
    const tableBody = makeTableBody();
    const rows = Array.from({ length: 5000 }, (_, index) => ({
      ...baseRow,
      codigo: String(index + 1),
      descricao: `Produto ${index + 1}`
    }));
    const table = createTableController({
      dom: { tableBody },
      executeOperationalBoundary: vi.fn(),
      renderDrillThrough: vi.fn(),
      rerunReportForProduct: vi.fn()
    });

    table.renderTable(rows);

    expect(tableBody.innerHTML).toContain(`Mostrando os ${MAX_VISIBLE_INVESTIGATION_ROWS} itens mais prioritários de 5000`);
    expect(tableBody.innerHTML.match(/data-row-type="main"/g)).toHaveLength(MAX_VISIBLE_INVESTIGATION_ROWS);
    expect(tableBody.innerHTML).toContain('Produto 1');
    expect(tableBody.innerHTML).toContain(`Produto ${MAX_VISIBLE_INVESTIGATION_ROWS}`);
    expect(tableBody.innerHTML).not.toContain(`Produto ${MAX_VISIBLE_INVESTIGATION_ROWS + 1}`);
    expect(tableBody.listeners).toHaveLength(1);
  });

  it('mantém detalhes na janela usando o mesmo listener delegado', async () => {
    const tableBody = makeTableBody();
    const table = createTableController({
      dom: { tableBody },
      executeOperationalBoundary: vi.fn(),
      renderDrillThrough: vi.fn(),
      rerunReportForProduct: vi.fn()
    });
    table.renderTable([baseRow]);
    const detailsButton = { dataset: { codigo: '1001' }, textContent: 'Detalhes' };

    await tableBody.listeners[0].handler({
      target: { closest: selector => selector === '.row-details-toggle' ? detailsButton : null }
    });

    expect(detailsButton.textContent).toBe('Ocultar');
  });
});
