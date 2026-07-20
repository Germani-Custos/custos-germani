import { describe, expect, it } from 'vitest';
import { buildReportRows, calculateKpis, classifyAlert, isAlertaCritico, getAlertaCriticoConfig, filterAlertRows } from '../core/report-engine.js';

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

  it('isAlertaCritico segue o mesmo limiar abs(>=5) para número e objeto', () => {
    expect(isAlertaCritico(5)).toBe(true);
    expect(isAlertaCritico(-6)).toBe(true);
    expect(isAlertaCritico(4.99)).toBe(false);
    expect(isAlertaCritico({ variacaoTemporal: 8 })).toBe(true);
    expect(isAlertaCritico({ variacaoTemporal: null })).toBe(false);
  });

  it('getAlertaCriticoConfig expõe o contrato canônico (5% no eixo criado_em) e é imutável', () => {
    const config = getAlertaCriticoConfig();
    expect(config.thresholdPercent).toBe(5);
    expect(config.basis).toBe('variacaoTemporal');
    expect(config.temporalAxis).toBe('criado_em');
    expect(Object.isFrozen(config)).toBe(true);
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

  it('não inventa delta monetário quando o produto tem uma só importação', () => {
    const historico = [
      { codigo_produto: '002', descricao: 'Único', custo_total: 100, data_referencia: '2026-01-01', criado_em: '2026-05-10T10:00:00Z' }
    ];

    const [row] = buildReportRows(historico);

    // Sem penúltima importação, "Δ vs anterior" e a variação temporal são nulos
    // (não o custo cheio) — coerentes entre si.
    expect(row.diferenca).toBeNull();
    expect(row.variacaoTemporal).toBeNull();
    expect(row.penultimoCusto).toBeNull();
    expect(row.alert).toBe(false);
  });
});

describe('buildReportRows — mudança de regime e instabilidade', () => {
  // Contrato de regime/instabilidade (calcInstabilityScore/classifyInstability)
  // exercitado pela superfície pública buildReportRows, sem exportar internos.
  const serie = (codigo, custos) => custos.map((custo, i) => {
    const mes = String(i + 1).padStart(2, '0');
    return {
      codigo_produto: codigo,
      descricao: 'Item',
      custo_total: custo,
      data_referencia: `2026-${mes}-01`,
      criado_em: `2026-${mes}-10T10:00:00Z`
    };
  });

  it('sinaliza mudança de regime quando a 2ª metade sai de ESTÁVEL', () => {
    // 1ª metade estável (~1% ao mês), 2ª metade com saltos grandes.
    const [row] = buildReportRows(serie('R1', [100, 101, 102, 103, 130, 100]));
    expect(row.mudouRegime).toBe(true);
    expect(row.classificacaoInstabilidade).toBe('MUITO INSTÁVEL');
  });

  it('não sinaliza mudança de regime para produto estável', () => {
    const [row] = buildReportRows(serie('R2', [100, 101, 102, 103, 104, 105]));
    expect(row.mudouRegime).toBe(false);
    expect(row.classificacaoInstabilidade).toBe('ESTÁVEL');
  });

  it('não sinaliza mudança de regime com menos de 4 pontos, mesmo instável', () => {
    const [row] = buildReportRows(serie('R3', [100, 150]));
    expect(row.mudouRegime).toBe(false);
    expect(row.classificacaoInstabilidade).toBe('MUITO INSTÁVEL');
  });
});
