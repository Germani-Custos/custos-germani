import { describe, expect, it } from 'vitest';
import { normalizeCodigoProduto, parseBrazilianNumber, mapRowsToPayload } from '../core/spreadsheet-engine.js';

describe('normalizeCodigoProduto (VAL-01)', () => {
  it('preserva zeros à esquerda quando a origem textual já é código de negócio', () => {
    expect(normalizeCodigoProduto('  000123  ')).toBe('000123');
  });

  it('converte notação científica inteira gerada por planilhas', () => {
    expect(normalizeCodigoProduto('1.23E+5')).toBe('123000');
    expect(normalizeCodigoProduto(123000)).toBe('123000');
  });

  it('bloqueia códigos ambíguos ou inválidos', () => {
    expect(normalizeCodigoProduto('-123')).toBe('');
    expect(normalizeCodigoProduto('123,45')).toBe('');
    expect(normalizeCodigoProduto('1.5e2')).toBe('150');
    expect(normalizeCodigoProduto('1.23e2')).toBe('123');
    expect(normalizeCodigoProduto('1.2e-1')).toBe('');
  });
});

describe('mapRowsToPayload', () => {
  it('gera payload canônico com data_referencia normalizada sem depender de colunas extras', () => {
    const rows = [{ Produto: '001', Descricao: ' Item A ', Variavel: '1,2345', Fixo: '2,0000', Total: '3,2345', Extra: 'ignorar' }];
    const payload = mapRowsToPayload(rows, {
      codigo_produto: 'Produto',
      descricao: 'Descricao',
      custo_variavel: 'Variavel',
      custo_direto_fixo: 'Fixo',
      custo_total: 'Total'
    }, '2026-05-01');

    expect(payload).toEqual([{
      codigo_produto: '001',
      descricao: 'Item A',
      custo_variavel: 1.2345,
      custo_direto_fixo: 2,
      custo_total: 3.2345,
      data_referencia: '2026-05-01'
    }]);
  });
});

describe('parseBrazilianNumber', () => {
  it('normaliza formato brasileiro com arredondamento a 4 casas', () => {
    expect(parseBrazilianNumber('R$ 1.234,56789')).toBe(1234.5679);
  });
});
