import { describe, expect, it, afterEach } from 'vitest';
import { normalizeCodigoProduto, parseBrazilianNumber, formatBrazilianFinancial, scanHeaders, countValidMappedColumns, readWorkbook, parseMCAP105 } from '../core/spreadsheet-engine.js';

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

describe('parseMCAP105 — parser do relatório de OP (MCAP105)', () => {
  // Linhas reais do relatório MCAP105 (CRLF preservado nos joins com \r\n).
  const LINHA_OP738 = '425,        738,1001051,GERMANI BISCOITO BROA MILHO 20 X 300 G,  12,BISCOITO,  2.800,  2.992,CX,"1.197,01","    749,00","   899,84","  1.438,08","      59,81","    105,00",    94';
  const LINHA_OP752 = '425,        752,1001058,GERMANI BISCOITO SORTIDO 10 X 800 G,  12,BISCOITO,  1.000,  1.229,CX,"  368,70","    912,00"," 1.600,00","    646,84","     -59,57","     14,00",    39';
  const LINHA_OP757_ZEROS = '425,        757,1001056,GERMANI BISCOITO ROSCA COM GLACE 20 X 300 G,  12,BISCOITO,  1.194,  1.194,CX,"    0,00","      0,00","     0,00","      0,00","       0,00","      0,00",    40';
  const LINHA_OP732 = '425,        732,1001055,GERMANI BISCOITO ROSQUINHA DE LEITE 20 X 300 G,  12,BISCOITO,    500,    544,CX,"  178,21","    162,00"," 1.098,90","  1.208,89","      10,01","      0,00",    17';
  const LINHA_OP736 = '425,        736,1001055,GERMANI BISCOITO ROSQUINHA DE LEITE 20 X 300 G,  12,BISCOITO,  2.000,  1.467,CX,"  480,15","    422,00"," 1.099,91","  1.251,47","      13,78","      0,00",    46';
  const HEADER_1 = 'Qtdade,Qtdade,Tempo,Tempo ,  KG/Hora,KG/Hora,    % ,  Tempo,  Qtd';
  const HEADER_2 = 'Ori.,O.P.,Cód. Prod.,Descrição do Produto,Cód,Estágio,  Prev.,  Prod,  Prev.,  Real,  Previsto,    Real,Tempo,  Parada,Apont.,U.M';
  const TITULO = 'Acompanhamento de Tempo por OP';

  it('parseia todos os 16 campos de uma linha de dado real na ordem correta', () => {
    const { rows, errors } = parseMCAP105(LINHA_OP738);
    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      origem: 425,
      op: 738,
      cod_produto: '1001051',
      descricao: 'GERMANI BISCOITO BROA MILHO 20 X 300 G',
      cod_estagio: 12,
      estagio: 'BISCOITO',
      qtd_prevista: 2800,
      qtd_produzida: 2992,
      unidade: 'CX',
      tempo_previsto: 1197.01,
      tempo_real: 749,
      kg_hora_previsto: 899.84,
      kg_hora_real: 1438.08,
      perc_tempo: 59.81,
      tempo_parada: 105,
      qtd_apontamentos: 94
    });
  });

  it('mapeia pos9→tempo_previsto e pos10→tempo_real (corrige o erro histórico da spec)', () => {
    const { rows } = parseMCAP105(LINHA_OP738);
    // pos9 = "1.197,01" é o PREVISTO; pos10 = "749,00" é o REAL.
    expect(rows[0].tempo_previsto).toBe(1197.01);
    expect(rows[0].tempo_real).toBe(749);
    // idem para kg/hora: pos11 previsto, pos12 real.
    expect(rows[0].kg_hora_previsto).toBe(899.84);
    expect(rows[0].kg_hora_real).toBe(1438.08);
    // % Tempo confere com (real - previsto) / previsto * 100 (com o kg/hora).
    const derivado = ((rows[0].kg_hora_real - rows[0].kg_hora_previsto) / rows[0].kg_hora_previsto) * 100;
    expect(derivado).toBeCloseTo(rows[0].perc_tempo, 1);
  });

  it('descarta título, linhas de cabeçalho e linhas em branco', () => {
    const conteudo = [TITULO, HEADER_1, HEADER_2, '', '   '].join('\r\n');
    const { rows, errors } = parseMCAP105(conteudo);
    expect(rows).toHaveLength(0);
    expect(errors).toHaveLength(0);
  });

  it('converte numérico entre aspas com vírgula decimal ("1.197,01" → 1197.01)', () => {
    const { rows } = parseMCAP105(LINHA_OP738);
    expect(rows[0].tempo_previsto).toBe(1197.01);
    expect(rows[0].kg_hora_real).toBe(1438.08);
  });

  it('converte numérico negativo ("-59,57" → -59.57)', () => {
    const { rows } = parseMCAP105(LINHA_OP752);
    expect(rows[0].perc_tempo).toBe(-59.57);
  });

  it('aceita linha com campos zerados ("0,00" → 0)', () => {
    const { rows, errors } = parseMCAP105(LINHA_OP757_ZEROS);
    expect(errors).toHaveLength(0);
    expect(rows[0].tempo_previsto).toBe(0);
    expect(rows[0].tempo_real).toBe(0);
    expect(rows[0].kg_hora_previsto).toBe(0);
    expect(rows[0].kg_hora_real).toBe(0);
    expect(rows[0].perc_tempo).toBe(0);
    expect(rows[0].tempo_parada).toBe(0);
    // quantidades permanecem válidas (formato de milhar sem decimal)
    expect(rows[0].qtd_prevista).toBe(1194);
  });

  it('envia linha com origem inválida para errors[], não para rows[]', () => {
    const linhaInvalida = '12A,5,1001,X,1,MASSA,0,0,UN,"0,00","0,00","0,00","0,00","0,00","0,00",0';
    const { rows, errors } = parseMCAP105(linhaInvalida);
    expect(rows).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0].linha).toBe(1);
    expect(errors[0].mensagem).toMatch(/origem/i);
  });

  it('linha inválida não derruba o parse do restante do arquivo', () => {
    const conteudo = ['12A,5,1001,X,1,MASSA,0,0,UN,"0,00","0,00","0,00","0,00","0,00","0,00",0', LINHA_OP738].join('\r\n');
    const { rows, errors } = parseMCAP105(conteudo);
    expect(rows).toHaveLength(1);
    expect(rows[0].op).toBe(738);
    expect(errors).toHaveLength(1);
  });

  it('parseia um arquivo com cabeçalhos intercalados (5 linhas reais, sem erros)', () => {
    const conteudo = [
      TITULO,
      HEADER_1,
      HEADER_2,
      LINHA_OP738,
      LINHA_OP752,
      HEADER_1,
      HEADER_2,
      LINHA_OP757_ZEROS,
      LINHA_OP732,
      LINHA_OP736,
      ''
    ].join('\r\n');
    const { rows, errors } = parseMCAP105(conteudo);
    expect(rows).toHaveLength(5);
    expect(errors).toHaveLength(0);
    expect(rows.map(row => row.op)).toEqual([738, 752, 757, 732, 736]);
  });

  it('nunca lança — entrada vazia ou não-string retorna estrutura vazia', () => {
    expect(parseMCAP105('')).toEqual({ rows: [], errors: [] });
    expect(parseMCAP105(undefined)).toEqual({ rows: [], errors: [] });
  });

  // Dialeto real do export do ERP: arquivo delimitado por `;`, cada registro é
  // um único campo entre aspas com aspas internas escapadas (`""`).
  const quoteRecord = (linha) => `"${linha.replace(/"/g, '""')}";`;

  it('desembrulha registro entre aspas terminado em ";" e parseia igual à linha crua', () => {
    const { rows, errors } = parseMCAP105(quoteRecord(LINHA_OP738));
    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(1);
    // Resultado idêntico ao da mesma linha no formato "cru".
    expect(rows[0]).toEqual(parseMCAP105(LINHA_OP738).rows[0]);
  });

  it('parseia um arquivo inteiro no dialeto ";" com cabeçalhos terminados em ";"', () => {
    const conteudo = [
      `${TITULO};`,
      `${HEADER_1};`,
      `${HEADER_2};`,
      quoteRecord(LINHA_OP738),
      quoteRecord(LINHA_OP752),
      `${HEADER_1};`,
      `${HEADER_2};`,
      quoteRecord(LINHA_OP757_ZEROS),
      quoteRecord(LINHA_OP732),
      quoteRecord(LINHA_OP736),
      ''
    ].join('\r\n');
    const { rows, errors } = parseMCAP105(conteudo);
    expect(rows).toHaveLength(5);
    expect(errors).toHaveLength(0);
    expect(rows.map(row => row.op)).toEqual([738, 752, 757, 732, 736]);
  });
});
