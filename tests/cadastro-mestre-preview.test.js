import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';
import { lerArquivoCadastroMestre, lerContextoCadastroMestrePreview, mapearPlanilhaCadastroMestre, previewArquivoCadastroMestre } from '../src/services/cadastro-mestre-preview.js';

// CommonJS carrega suporte a codepages de XLS legado, igual ao bundle full do browser.
const SheetJS = createRequire(import.meta.url)('xlsx');
const headers = ['Produto', 'Descrição', 'Tipo', 'Descr(Origem)', 'Origem', 'Família', 'Agrupamento', 'Coluna extra'];
const data = ['000123', 'Produto teste', 'P', 'Produzido', '01', 'F1', '00Ab  ERP', 'ignorada'];
const contexto = { produtos: [], origens: [{ id: 'o', codigo: '01' }], familias: [{ id: 'f', codigo: 'F1' }] };

function arquivoExcel(bookType = 'xlsx', extension = bookType, matriz = [headers, data], configure = () => {}) {
  const workbook = SheetJS.utils.book_new();
  SheetJS.utils.book_append_sheet(workbook, SheetJS.utils.aoa_to_sheet(matriz), 'Cadastro');
  configure(workbook);
  const bytes = SheetJS.write(workbook, { type: 'array', bookType });
  return { name: `cadastro.${extension}`, arrayBuffer: async () => bytes };
}

describe('Adaptador de arquivo do Preview', () => {
  it.each([['xlsx', 'XLSX'], ['xlsm', 'xLsM'], ['xls', 'XlS']])('lê bytes reais de %s com extensão %s e produz Preview', async (bookType, extension) => {
    const result = await previewArquivoCadastroMestre(arquivoExcel(bookType, extension), contexto, SheetJS);
    expect(result.tipo_arquivo).toBe(extension.toUpperCase());
    expect(result.produtos[0]).toMatchObject({ codigo_produto: '000123', tipo: 'NOVO_PRODUTO', calculado: { descricao: 'Produto teste', origem_cod: '01', familia_cod: 'F1', agrupamento_erp_valor: '00Ab  ERP' } });
  });
  it('XLSM com blob VBA não depende de macro e não o carrega', async () => {
    const read = vi.fn(SheetJS.read);
    const file = arquivoExcel('xlsm', 'xlsm', [headers, data], wb => { wb.vbaraw = new Uint8Array([1, 2, 3]); });
    const result = await lerArquivoCadastroMestre(file, { ...SheetJS, read });
    expect(result.linhas).toHaveLength(1);
    expect(read.mock.calls[0][1]).toMatchObject({ bookVBA: false, cellFormula: false });
    expect(read.mock.results[0].value.vbaraw).toBeUndefined();
  });
  it('detecta cabeçalho após título/linha vazia e preserva número físico da linha', async () => {
    const result = await lerArquivoCadastroMestre(arquivoExcel('xlsx', 'xlsx', [['Relatório ERP'], [], headers.map(h => h.toUpperCase()), data, []]), SheetJS);
    expect(result.linha_cabecalho).toBe(3);
    expect(result.linhas[0].linha).toBe(4);
    expect(result.linhas).toHaveLength(1);
  });
  it('aceita nomes físicos canônicos com capitalização variável', () => {
    const mapped = mapearPlanilhaCadastroMestre([['CODIGO_PRODUTO', 'descricao', 'TIPO', 'descr_origem', 'origem_cod', 'familia_cod', 'agrupamento_erp_valor'], data]);
    expect(mapped.linhas[0]).toMatchObject({ codigo_produto: '000123', agrupamento_erp_valor: '00Ab  ERP' });
  });
  it('não confunde Origem com Descr(Origem)', () => {
    expect(mapearPlanilhaCadastroMestre([headers, data]).linhas[0]).toMatchObject({ origem_cod: '01', descr_origem: 'Produzido' });
  });
  it('colunas opcionais ausentes permanecem não fornecidas', () => {
    expect(mapearPlanilhaCadastroMestre([headers.slice(0, 4), data.slice(0, 4)]).linhas[0]).not.toHaveProperty('familia_cod');
  });
  it('bloqueia cabeçalho faltante ou ambíguo em vez de adivinhar colunas', () => {
    expect(() => mapearPlanilhaCadastroMestre([['Produto', 'Descrição'], ['1', 'A']])).toThrow('obrigatório');
    expect(() => mapearPlanilhaCadastroMestre([[...headers, 'Código Produto'], [...data, '999']])).toThrow('ambíguo');
  });
  it('não avalia fórmulas; usa somente valor cacheado fornecido pelo arquivo', async () => {
    const file = arquivoExcel('xlsx', 'xlsx', [headers, data], wb => { wb.Sheets.Cadastro.G2 = { t: 's', f: 'EXTERNAL_FUNCTION()', v: 'ERP cache' }; });
    expect((await lerArquivoCadastroMestre(file, SheetJS)).linhas[0].agrupamento_erp_valor).toBe('ERP cache');
  });
  it('preserva zeros de máscara numérica explícita, inclusive códigos de categoria', async () => {
    const file = arquivoExcel('xlsx', 'xlsx', [headers, data], wb => {
      wb.Sheets.Cadastro.A2 = { t: 'n', v: 123, z: '000000' };
      wb.Sheets.Cadastro.E2 = { t: 'n', v: 1, z: '00' };
    });
    expect((await lerArquivoCadastroMestre(file, SheetJS)).linhas[0]).toMatchObject({ codigo_produto: '000123', origem_cod: '01' });
  });
  it('não converte número impreciso formatado para código supostamente válido', async () => {
    const file = arquivoExcel('xlsx', 'xlsx', [headers, data], wb => { wb.Sheets.Cadastro.A2 = { t: 'n', v: 9007199254740992, z: '0000000000000000' }; });
    expect((await previewArquivoCadastroMestre(file, contexto, SheetJS)).erros).toHaveLength(1);
  });
  it('mantém endereço físico de células com cabeçalho deslocado da coluna A', async () => {
    const file = arquivoExcel('xlsx', 'xlsx', [[], [null, ...headers], [null, ...data]], wb => { wb.Sheets.Cadastro.B3 = { t: 'n', v: 123, z: '000000' }; });
    const result = await lerArquivoCadastroMestre(file, SheetJS);
    expect(result.linhas[0]).toMatchObject({ codigo_produto: '000123', linha: 3 });
    expect(result.colunas.codigo_produto).toBe(1);
  });
  it('repetir leitura do mesmo arquivo e contexto produz exatamente o mesmo Preview', async () => {
    const file = arquivoExcel();
    expect(await previewArquivoCadastroMestre(file, contexto, SheetJS)).toEqual(await previewArquivoCadastroMestre(file, contexto, SheetJS));
  });
  it('não concatena abas silenciosamente e aceita aba explícita', async () => {
    const file = arquivoExcel('xlsx', 'xlsx', [headers, data], wb => SheetJS.utils.book_append_sheet(wb, SheetJS.utils.aoa_to_sheet([headers, ['2', ...data.slice(1)]]), 'Outra'));
    expect((await lerArquivoCadastroMestre(file, SheetJS)).aba).toBe('Cadastro');
    expect((await lerArquivoCadastroMestre(file, SheetJS, 'Outra')).linhas[0].codigo_produto).toBe('2');
    await expect(lerArquivoCadastroMestre(file, SheetJS, 'Inexistente')).rejects.toThrow('não encontrada');
  });
  it('extensão inválida e leitor indisponível são erros explícitos', async () => {
    await expect(lerArquivoCadastroMestre({ name: 'cadastro.csv' }, SheetJS)).rejects.toThrow('Formato');
    await expect(lerArquivoCadastroMestre(arquivoExcel(), null)).rejects.toThrow('indisponível');
  });
});

function clienteSomenteLeitura(tabelas, transform = result => result) {
  const calls = [];
  return {
    calls,
    from: table => ({ select: (fields, options) => {
      calls.push({ table, fields, options });
      return { order: () => ({ range: async (start, end) => transform({ data: tabelas[table].slice(start, end + 1), count: tabelas[table].length, error: null }, table, start) }) };
    } })
  };
}
describe('Leitura integral, exclusivamente SELECT', () => {
  const tables = {
    dicionario_master_produtos: Array.from({ length: 5603 }, (_, i) => ({ codigo_produto: String(i + 1) })),
    categorias_origem: contexto.origens,
    categorias_familia: contexto.familias
  };
  it('lê 5.603 produtos paginados, sem dimensão operacional, mapas ou fatos', async () => {
    const client = clienteSomenteLeitura(tables);
    const result = await lerContextoCadastroMestrePreview(client);
    expect(result.produtos).toHaveLength(5603);
    expect(new Set(client.calls.map(call => call.table))).toEqual(new Set(Object.keys(tables)));
    expect(client.calls.filter(call => call.table === 'dicionario_master_produtos')).toHaveLength(12);
    expect(client.calls.every(call => call.options.count === 'exact')).toBe(true);
  });
  it('falha de leitura nunca vira mestre vazio', async () => {
    const client = clienteSomenteLeitura(tables, () => ({ data: null, error: { message: 'Sem acesso' }, count: null }));
    await expect(lerContextoCadastroMestrePreview(client)).rejects.toThrow('Sem acesso');
  });
  it('detecta truncamento do servidor abaixo do tamanho de página', async () => {
    const client = clienteSomenteLeitura(tables, result => ({ ...result, data: result.data.slice(0, 100) }));
    await expect(lerContextoCadastroMestrePreview(client)).rejects.toThrow('truncada');
  });
  it('detecta mudança de contagem entre páginas', async () => {
    const client = clienteSomenteLeitura(tables, (result, table, start) => ({ ...result, count: table === 'dicionario_master_produtos' && start > 0 ? result.count + 1 : result.count }));
    await expect(lerContextoCadastroMestrePreview(client)).rejects.toThrow('mudou');
  });
});
