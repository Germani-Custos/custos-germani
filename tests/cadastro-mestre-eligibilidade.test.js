import { describe, expect, it, vi } from 'vitest';
import { avaliarElegibilidadeCadastroMestre, criarPreviewCadastroMestre } from '../core/cadastro-mestre-preview-engine.js';

const linha = changes => ({ codigo_produto: '001', descricao: 'Produto ERP', tipo: 'P', descr_origem: 'PRODUZIDO', ...changes });
const avaliar = changes => avaliarElegibilidadeCadastroMestre(linha(changes));
const elegivel = { elegivel: true, motivo: 'ELEGIVEL' };
const rejeitado = motivo => ({ elegivel: false, motivo });
const contextoVazio = () => ({ produtos: [], origens: [], familias: [] });

describe('DEC-02 — elegibilidade pura, independente de admissão e classificação', () => {
  it.each([
    ['P', true], ['C', true], ['D', false], ['X', false], ['', false],
    [null, false], [undefined, false], [' p ', true], ['\tC\n', true],
    ['p', true], ['c', true], [0, false], [1, false]
  ])('valida o tipo recebido %s', (tipo, permitido) => {
    expect(avaliar({ tipo })).toEqual(permitido ? elegivel : rejeitado('TIPO_NAO_AUTORIZADO'));
  });

  it.each([
    'PRODUZIDO', 'PRODUZIDA', 'MASSA PRODUZIDA', 'REVENDA',
    'MASSA PRODUZIDA FARDO/CX', 'CHOCOLATE PRODUZIDO CX', 'BISCOITO PRODUZIDO CX',
    'CHOCOLATE PRODUZIDO PCT', 'CHOCOLATE PRODUZIDO UN', 'CEREAIS PRODUZIDO FARDO',
    'MASSA REVENDA PCT', 'BISCOITO REVENDA CX', 'DERIVADOS DE MILHO REVENDA PCT',
    ' produto produzido local ', '  MASSA\tPRODUZIDA\nFARDO/CX  ',
    'MASSA\u00a0PRODUZIDA PCT', 'mássa próduzída fárdo/cx', 'REVE\u0301NDA PCT',
    '(PRODUZIDO)', 'ERP/REVENDA/CX', 'PRODUZIDA-PCT'
  ])('reconhece a expressão completa em %s', descr_origem => {
    expect(avaliar({ descr_origem })).toEqual(elegivel);
  });

  it.each([
    'COMPRADO', 'MISTURAS', 'COPA CATTERINO FARDO', 'REVENDADEIRA', 'REPRODUZIDO',
    'PRODUZIDOS', 'PRODUZIDAS', 'PRODUZIDO2', '2REVENDA', '_PRODUZIDO', 'PRODUZIDA_',
    'çREVENDA', 'REVENDAç', '漢REVENDA', 'REVENDA漢', 'PRODU ZIDO', 'REV ENDA', 12, 632
  ])('não amplia o vocabulário por substring ou código: %s', descr_origem => {
    expect(avaliar({ descr_origem })).toEqual(rejeitado('ORIGEM_NAO_AUTORIZADA'));
  });

  it.each([null, undefined, '', '   ', '\t\n\u00a0'])('distingue origem não informada: %s', descr_origem => {
    expect(avaliar({ descr_origem })).toEqual(rejeitado('ORIGEM_NAO_INFORMADA'));
  });

  it.each([
    ['Produto INATIVO', 'PRODUTO_INATIVO'],
    ['inativo produto', 'PRODUTO_INATIVO'],
    ['Produto INÁTIVO', 'PRODUTO_INATIVO'],
    ['Produto EXCLUIR', 'PRODUTO_EXCLUIR'],
    ['excluir produto', 'PRODUTO_EXCLUIR'],
    ['Produto EXCLUÍR', 'PRODUTO_EXCLUIR'],
    ['EXCLUIR / INATIVO', 'PRODUTO_INATIVO'],
    ['INATIVO EXLUIR', 'PRODUTO_INATIVO'],
    ['Produto EXLUIR', 'ELEGIVEL'],
    ['Produto exluir', 'ELEGIVEL'],
    ['Produto normal', 'ELEGIVEL'],
    ['', 'ELEGIVEL'], [null, 'ELEGIVEL'], [undefined, 'ELEGIVEL'], [0, 'ELEGIVEL']
  ])('avalia os marcadores da descrição %s', (descricao, motivo) => {
    expect(avaliar({ descricao })).toEqual(motivo === 'ELEGIVEL' ? elegivel : rejeitado(motivo));
  });

  it.each([
    [{ tipo: 'P', descr_origem: 'PRODUZIDO' }, 'ELEGIVEL'],
    [{ tipo: 'C', descr_origem: 'REVENDA' }, 'ELEGIVEL'],
    [{ tipo: 'D', descr_origem: 'REVENDA' }, 'TIPO_NAO_AUTORIZADO'],
    [{ tipo: 'P', descr_origem: 'MISTURAS' }, 'ORIGEM_NAO_AUTORIZADA'],
    [{ tipo: 'C', descr_origem: null }, 'ORIGEM_NAO_INFORMADA'],
    [{ tipo: 'P', descr_origem: 'PRODUZIDO', descricao: 'INATIVO' }, 'PRODUTO_INATIVO'],
    [{ tipo: 'C', descr_origem: 'REVENDA', descricao: 'EXCLUIR' }, 'PRODUTO_EXCLUIR'],
    [{ tipo: 'D', descr_origem: '', descricao: 'INATIVO EXCLUIR' }, 'TIPO_NAO_AUTORIZADO'],
    [{ descr_origem: 'MISTURAS', descricao: 'INATIVO EXCLUIR' }, 'ORIGEM_NAO_AUTORIZADA']
  ])('mantém a precedência dos critérios: %j', (changes, motivo) => {
    expect(avaliar(changes)).toEqual(motivo === 'ELEGIVEL' ? elegivel : rejeitado(motivo));
  });

  it.each([
    { familia_cod: null }, { familia_cod: 'SEM_CORRESPONDENCIA' },
    { agrupamento_erp_valor: null }, { agrupamento_cod: null },
    { origem_cod: '632', familia_cod: '63201' }, { origem_cod: null }
  ])('não exige classificação para elegibilidade: %j', changes => {
    expect(avaliar({ descr_origem: 'DERIVADOS DE MILHO REVENDA PCT', ...changes })).toEqual(elegivel);
  });

  it.each(['', 'MISTURAS'])('não usa código, família ou descrição comercial como fallback para %s', descr_origem => {
    expect(avaliar({ descr_origem, origem_cod: '410', familia_cod: 'PRODUZIDO', descricao: 'Produto REVENDA' }))
      .toEqual(rejeitado(descr_origem ? 'ORIGEM_NAO_AUTORIZADA' : 'ORIGEM_NAO_INFORMADA'));
  });

  it.each(['tipo', 'descr_origem', 'descricao'])('mantém validação de escalares no campo %s', campo => {
    for (const valor of [false, {}, [], NaN, Infinity]) {
      expect(() => avaliar({ [campo]: valor })).toThrow();
    }
  });

  it('não altera código, descrição ou demais valores recebidos para normalizar a comparação', () => {
    const row = Object.freeze(linha({ codigo_produto: ' 0 01 ', descricao: ' Produto Áçucar ', tipo: ' p ', descr_origem: '  mássa\tpróduzída PCT ' }));
    const before = JSON.stringify(row);
    expect(avaliarElegibilidadeCadastroMestre(row)).toEqual(elegivel);
    expect(avaliarElegibilidadeCadastroMestre(row)).toEqual(elegivel);
    expect(JSON.stringify(row)).toBe(before);
    expect(row.codigo_produto).toBe(' 0 01 ');
    expect(row.descricao).toBe(' Produto Áçucar ');
  });
});

describe('DEC-02 — integração do cálculo com o Preview existente', () => {
  it('origem 632 sem categoria é elegível e permanece pendente, não vazia', () => {
    const row = linha({ tipo: 'C', descr_origem: 'DERIVADOS DE MILHO REVENDA PCT', origem_cod: '632', familia_cod: '63201' });
    const result = criarPreviewCadastroMestre([row], contextoVazio());
    expect(result.produtos).toHaveLength(1);
    expect(result.produtos[0].origem.recebido).toMatchObject({ codigo: '632', status: 'PENDENTE' });
    expect(result.produtos[0].familia.recebido.status).toBe('PENDENTE');
    expect(result.produtos[0].agrupamento.status).toBe('NAO_INFORMADO');
  });

  it('descrição de origem vazia não ganha elegibilidade por possuir código ERP', () => {
    const result = criarPreviewCadastroMestre([linha({ descr_origem: null, origem_cod: '632' })], contextoVazio());
    expect(result.produtos).toHaveLength(0);
    expect(result.excluidos[0].motivo).toBe('ORIGEM_NAO_AUTORIZADA');
  });

  it.each(['INATIVO', 'EXCLUIR'])('preserva o motivo geral do Preview para %s', descricao => {
    const result = criarPreviewCadastroMestre([linha({ descricao })], contextoVazio());
    expect(result.produtos).toHaveLength(0);
    expect(result.excluidos[0].motivo).toBe('DESCRICAO_EXCLUIDA');
  });

  it('EXLUIR sozinho não exclui uma linha que atende aos demais critérios', () => {
    expect(criarPreviewCadastroMestre([linha({ descricao: 'Produto EXLUIR' })], contextoVazio()).produtos).toHaveLength(1);
  });

  it('filtrado existente continua fisicamente presente, sem exclusão nem mutação do contexto', () => {
    const atual = Object.freeze({ codigo_produto: '001', descricao: 'Descrição armazenada', agrupamento_cod: 'M001' });
    const ctx = Object.freeze({ produtos: Object.freeze([atual]), origens: Object.freeze([]), familias: Object.freeze([]) });
    const before = JSON.stringify(ctx);
    const result = criarPreviewCadastroMestre([Object.freeze(linha({ descricao: 'INATIVO' }))], ctx);
    expect(result.ausentes).toHaveLength(0);
    expect(result.excluidos[0]).toMatchObject({ codigo_produto: '001', preserva_master: true });
    expect(JSON.stringify(ctx)).toBe(before);
  });

  it('ausente no arquivo permanece proposta de preservação, sem reavaliar por ausência', () => {
    const atual = Object.freeze({ codigo_produto: '001', descricao: 'Descrição armazenada' });
    const result = criarPreviewCadastroMestre([], { ...contextoVazio(), produtos: [atual] });
    expect(result.ausentes).toEqual([{ codigo_produto: '001', atual, recebido: null, tipo: 'AUSENTE_NO_ARQUIVO', decisao_proposta: 'PRESERVAR_MASTER' }]);
  });

  it('avalia elegíveis e rejeitados sem I/O, payload de escrita ou admissão', () => {
    const network = vi.spyOn(globalThis, 'fetch').mockImplementation(() => { throw new Error('Rede proibida no cálculo puro'); });
    try {
      expect(avaliar({})).toEqual(elegivel);
      expect(avaliar({ descricao: 'EXCLUIR' })).toEqual(rejeitado('PRODUTO_EXCLUIR'));
      const result = criarPreviewCadastroMestre([linha({}), linha({ codigo_produto: '002', descricao: 'INATIVO' })], contextoVazio());
      expect(result.somente_preview).toBe(true);
      expect(result.produtos).toHaveLength(1);
      expect(result.excluidos).toHaveLength(1);
      expect(result.produtos[0].decisao_proposta).toBe('NOVO_SOMENTE_NO_MASTER_SE_ETAPA_FUTURA_AUTORIZADA');
      expect(result.produtos[0].calculado).not.toHaveProperty('agrupamento_cod');
      expect(network).not.toHaveBeenCalled();
    } finally {
      network.mockRestore();
    }
  });
});
