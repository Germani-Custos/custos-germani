import { describe, expect, it, beforeEach } from 'vitest';
import { buildReportRows, calculateKpis, classifyAlert, filterAlertRows, fillSelect } from '../core/report-engine.js';

describe('alertas investigativos (LOG-01)', () => {
  it('usa abs(variacaoTemporal) >= 5 sem arredondamento prévio', () => {
    expect(classifyAlert({ variacaoTemporal: 5 }).isAlert).toBe(true);
    expect(classifyAlert({ variacaoTemporal: -5 }).isAlert).toBe(true);
    expect(classifyAlert({ variacaoTemporal: 4.9999 }).isAlert).toBe(false);
  });

  it('mantém KPI e filtro rápido na mesma regra canônica', () => {
    const rows = [
      { codigo: 'A', variacaoTemporal: 5, alert: true },
      { codigo: 'B', variacaoTemporal: -4.99, alert: false },
      { codigo: 'C', variacaoTemporal: -8, alert: true }
    ];

    expect(filterAlertRows(rows).map(row => row.codigo)).toEqual(['A', 'C']);
    expect(calculateKpis(rows).totalAlertas).toBe(2);
  });
});

describe('buildReportRows temporalidade', () => {
  it('usa data_referencia para competência e criado_em para última/penúltima importação', () => {
    const historico = [
      { codigo_produto: '001', descricao: 'Item', custo_total: 100, data_referencia: '2026-01-01', criado_em: '2026-05-10T10:00:00Z' },
      { codigo_produto: '001', descricao: 'Item', custo_total: 108, data_referencia: '2026-02-01', criado_em: '2026-05-11T10:00:00Z' }
    ];

    const [row] = buildReportRows(historico);

    expect(row.dataCompetencia).toBe('2026-02-01');
    expect(row.ultimaAtualizacao).toBe('2026-05-11T10:00:00Z');
    expect(row.variacaoTemporal).toBe(8);
    expect(row.alert).toBe(true);
  });
});

describe('fillSelect', () => {
  beforeEach(() => {
    global.document = {
      createElement: () => ({ value: '', textContent: '' })
    };
  });

  it('preenche opções sem usar innerHTML e preserva texto como conteúdo', () => {
    const select = { children: [], value: '', replaceChildren(...nodes) { this.children = nodes; } };

    fillSelect(select, [{ value: '<x>', label: '<script>alert(1)</script>' }], { value: 'TODOS', label: 'Todos' });

    expect(select.children).toHaveLength(2);
    expect(select.children[1].value).toBe('<x>');
    expect(select.children[1].textContent).toBe('<script>alert(1)</script>');
  });
});
