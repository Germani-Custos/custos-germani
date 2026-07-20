import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

// Harness de mocks (opção b): não exporta internos nem toca no runtime.
// ui-export.js importa de ui-filters.js, que importa o módulo api — mockado aqui.
vi.mock('../src/services/api.js', () => ({ api: {} }));

import {
  sanitizeCsvFormula,
  buildExportFilename,
  compareByInvestigativePriority
} from '../view/ui-export.js';

// ── SEC-04: sanitizeCsvFormula (mitigação de formula injection) ────────────────
describe('sanitizeCsvFormula — bloqueio de fórmula (SEC-04)', () => {
  it("prefixa com aspa simples valores iniciados por =, +, -, @, tab ou CR", () => {
    expect(sanitizeCsvFormula('=CMD')).toBe("'=CMD");
    expect(sanitizeCsvFormula('+CMD')).toBe("'+CMD");
    expect(sanitizeCsvFormula('-CMD')).toBe("'-CMD");
    expect(sanitizeCsvFormula('@CMD')).toBe("'@CMD");
    expect(sanitizeCsvFormula('\tCMD')).toBe("'\tCMD");
    expect(sanitizeCsvFormula('\rCMD')).toBe("'\rCMD");
  });

  it('não altera texto seguro e trata null/undefined como string vazia', () => {
    expect(sanitizeCsvFormula('Produto 001')).toBe('Produto 001');
    expect(sanitizeCsvFormula(null)).toBe('');
    expect(sanitizeCsvFormula(undefined)).toBe('');
  });
});

// ── buildExportFilename (nome do arquivo byte-a-byte) ─────────────────────────
describe('buildExportFilename — formato do nome do arquivo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-20T12:00:00Z'));
  });
  afterEach(() => { vi.useRealTimers(); });

  it('monta auditoria_criticos_<inicio>_a_<fim>_<yyyymmdd>.xlsx', () => {
    const dom = { dtStart: { value: '2026-01-01' }, dtEnd: { value: '2026-03-31' } };
    expect(buildExportFilename(dom)).toBe('auditoria_criticos_2026-01-01_a_2026-03-31_20260720.xlsx');
  });

  it('usa "inicio"/"fim" quando o período está vazio', () => {
    const dom = { dtStart: { value: '' }, dtEnd: { value: '' } };
    expect(buildExportFilename(dom)).toBe('auditoria_criticos_inicio_a_fim_20260720.xlsx');
  });
});

// ── compareByInvestigativePriority (desempate em cascata) ─────────────────────
// getOperationalPriority é injetado; aqui usamos um stub que devolve o label do
// próprio row, isolando a lógica de desempate (criticidade → regime → magnitude
// → reincidência → instabilidade → código).
const priorityByLabel = (row) => ({ label: row.label });

function row(overrides = {}) {
  return {
    label: '🟢 Estável',
    mudouRegime: false,
    variacaoTemporal: 0,
    variacao: 0,
    scoreInstabilidade: 0,
    codigo: 'X',
    ...overrides
  };
}

describe('compareByInvestigativePriority — ordem de prioridade investigativa', () => {
  it('criticidade domina: 🔴 Crítico vem antes de 🟢 Estável', () => {
    const a = row({ label: '🔴 Crítico', codigo: 'Z' });
    const b = row({ label: '🟢 Estável', codigo: 'A' });
    expect(compareByInvestigativePriority(a, b, priorityByLabel)).toBeLessThan(0);
  });

  it('regime desempata acima da magnitude quando criticidade é igual', () => {
    const a = row({ label: '🟠 Atenção', mudouRegime: true, variacaoTemporal: 1 });
    const b = row({ label: '🟠 Atenção', mudouRegime: false, variacaoTemporal: 50 });
    expect(compareByInvestigativePriority(a, b, priorityByLabel)).toBeLessThan(0);
  });

  it('magnitude desempata quando criticidade e regime são iguais', () => {
    const a = row({ label: '🟠 Atenção', variacaoTemporal: 30 });
    const b = row({ label: '🟠 Atenção', variacaoTemporal: 10 });
    expect(compareByInvestigativePriority(a, b, priorityByLabel)).toBeLessThan(0);
  });

  it('reincidência desempata com magnitude igual (uma via variacao, outra via variacaoTemporal)', () => {
    // Ambos magnitude 5: a cai no fallback variacao (variacaoTemporal null → sem alerta);
    // b tem variacaoTemporal 5 (≥5% → reincidência). b deve vir primeiro.
    const a = row({ label: '🟡 Monitorar', variacaoTemporal: null, variacao: 5 });
    const b = row({ label: '🟡 Monitorar', variacaoTemporal: 5, variacao: 0 });
    expect(compareByInvestigativePriority(a, b, priorityByLabel)).toBeGreaterThan(0);
  });

  it('instabilidade desempata quando criticidade, regime, magnitude e reincidência são iguais', () => {
    const a = row({ label: '🟡 Monitorar', variacaoTemporal: 5, scoreInstabilidade: 30 });
    const b = row({ label: '🟡 Monitorar', variacaoTemporal: 5, scoreInstabilidade: 10 });
    expect(compareByInvestigativePriority(a, b, priorityByLabel)).toBeLessThan(0);
  });

  it('código é o desempate final (localeCompare pt-BR) quando todo o resto empata', () => {
    const a = row({ codigo: 'A001' });
    const b = row({ codigo: 'A002' });
    expect(compareByInvestigativePriority(a, b, priorityByLabel)).toBeLessThan(0);
    expect(compareByInvestigativePriority(b, a, priorityByLabel)).toBeGreaterThan(0);
  });
});
