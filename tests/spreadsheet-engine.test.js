import { describe, expect, it } from 'vitest';
import { normalizeCodigoProduto, parseBrazilianNumber, formatBrazilianFinancial } from '../core/spreadsheet-engine.js';

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

describe('parseBrazilianNumber', () => {
  it('normaliza formato brasileiro com arredondamento a 4 casas', () => {
    expect(parseBrazilianNumber('R$ 1.234,56789')).toBe(1234.5679);
  });

  it('trata vazio, nulo e string malformada como 0 (não NaN)', () => {
    expect(parseBrazilianNumber('')).toBe(0);
    expect(parseBrazilianNumber(null)).toBe(0);
    expect(parseBrazilianNumber(undefined)).toBe(0);
    expect(parseBrazilianNumber('abc')).toBe(0);
    expect(parseBrazilianNumber(Infinity)).toBe(0);
  });

  it('aceita negativo com vírgula decimal', () => {
    expect(parseBrazilianNumber('-50,25')).toBe(-50.25);
  });

  it('sem vírgula, o ponto é tratado como decimal (1.000 = 1)', () => {
    // Contrato atual: sem separador decimal por vírgula, "1.000" vira 1,00.
    expect(parseBrazilianNumber('1.000')).toBe(1);
  });
});

describe('formatBrazilianFinancial', () => {
  it('formata em pt-BR com 3 casas por padrão', () => {
    expect(formatBrazilianFinancial(1234.5)).toBe('1.234,500');
  });

  it('respeita o número de casas informado', () => {
    expect(formatBrazilianFinancial(1234.5, 2)).toBe('1.234,50');
  });

  it('retorna 0,000 para valores não numéricos', () => {
    expect(formatBrazilianFinancial('abc')).toBe('0,000');
    expect(formatBrazilianFinancial(NaN)).toBe('0,000');
  });
});
