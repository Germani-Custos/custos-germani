import { describe, expect, it, afterEach } from 'vitest';
import { normalizeCodigoProduto, parseBrazilianNumber, formatBrazilianFinancial, scanHeaders, countValidMappedColumns, readWorkbook } from '../core/spreadsheet-engine.js';

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

describe('scanHeaders / countValidMappedColumns — mapeamento de importação', () => {
  it('mapeia os 5 campos obrigatórios (exato + fuzzy) e ignora coluna extra', () => {
    const { mapping, rejectedHeaders } = scanHeaders([
      { 'Código Produto': '1', 'Descrição': 'x', 'Custo Variável': '1', 'Direto Fixo': '1', 'Valor Total': '1', 'Coluna Extra': 'y' }
    ]);

    expect(mapping.codigo_produto).toBe('Código Produto');
    expect(mapping.descricao).toBe('Descrição');
    expect(mapping.custo_variavel).toBe('Custo Variável');
    expect(mapping.custo_direto_fixo).toBe('Direto Fixo');   // fuzzy (alias "direto fixo")
    expect(mapping.custo_total).toBe('Valor Total');          // fuzzy (alias "valor total")
    expect(countValidMappedColumns(mapping)).toBe(5);
    expect(rejectedHeaders).toContain('Coluna Extra');
  });

  it('conta apenas os campos reconhecidos quando faltam colunas', () => {
    const { mapping } = scanHeaders([{ 'Produto': '1', 'Desc': 'x', 'Nada': 'y' }]);

    expect(mapping.codigo_produto).toBe('Produto');
    expect(mapping.descricao).toBe('Desc');
    expect(mapping.custo_total).toBeNull();
    expect(countValidMappedColumns(mapping)).toBe(2);
  });
});

describe('readWorkbook — detecção de header e linhas', () => {
  // Stub mínimo do global XLSX (mesmo padrão do teste de fillSelect com document).
  const setWorkbookMatrix = (matrix) => {
    global.XLSX = {
      read: () => ({ SheetNames: ['S'], Sheets: { S: {} } }),
      utils: { sheet_to_json: () => matrix }
    };
  };

  afterEach(() => { delete global.XLSX; });

  it('ignora linhas antes do header e linhas em branco, mapeando por cabeçalho', () => {
    setWorkbookMatrix([
      ['relatório de custos', '', '', '', ''],
      ['codigo_produto', 'descricao', 'custo_variavel', 'custo_direto_fixo', 'custo_total'],
      ['001', 'Item A', '1', '2', '3'],
      ['', '', '', '', ''],
      ['002', 'Item B', '4', '5', '6']
    ]);

    const rows = readWorkbook(new ArrayBuffer(0));

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ codigo_produto: '001', descricao: 'Item A', custo_total: '3' });
    expect(rows[1].codigo_produto).toBe('002');
  });
});
