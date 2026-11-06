import { describe, expect, it } from 'vitest';
import { avaliarBootstrapCadastroMestre, criarRelatorioBootstrapCadastroMestre } from '../core/cadastro-mestre-bootstrap-engine.js';

const base = changes => ({ codigo_produto: '001', fontes: { master: true }, erp: { tipo: 'P', descr_origem: 'MASSA PRODUZIDA', descricao: 'Produto' }, ...changes });

describe('Bootstrap histórico do Cadastro Mestre', () => {
  it('separa reconhecimento, observação, elegibilidade e admissão pendente', () => {
    const r = avaliarBootstrapCadastroMestre(base({ observacoes: [{ fonte: 'F08', arquivo: 'f08.xls', linha: 2 }] }));
    expect(r).toMatchObject({ codigo_produto: '001', reconhecimento: 'RECONHECIDA', elegibilidade: { status: 'ELEGIVEL' }, admissao_detalhado: { status: 'PENDENTE_DE_CONTRATO' } });
    expect(r.evidencias).toEqual(expect.arrayContaining(['PRESENCA_HISTORICA_COMPROVADA', 'OBSERVACAO_ERP_COMPROVADA', 'ELEGIBILIDADE_COMPROVADA']));
  });
  it.each([
    ['observado ERP mas não persistido', { fontes: {}, observacoes: [{ fonte: 'F22', linha: 3 }] }, 'NAO_RECONHECIDA'],
    ['persistido sem Master', { fontes: { operacional: true } }, 'RECONHECIDA'],
    ['Custos sem OP', { fontes: { custos: true } }, 'RECONHECIDA'],
    ['OP sem Custos', { fontes: { op: true } }, 'RECONHECIDA'],
    ['ambos os fatos', { fontes: { custos: true, op: true } }, 'RECONHECIDA']
  ])('%s', (_nome, changes, reconhecimento) => expect(avaliarBootstrapCadastroMestre(base(changes)).reconhecimento).toBe(reconhecimento));
  it('não infere aprovação pela presença no Master nem execução por contagem agregada', () => {
    const r = avaliarBootstrapCadastroMestre(base({ execucoes_agregadas: [{ lote: 2, inseridos: 7, atualizados: 10 }] }));
    expect(r.aprovacoes).toEqual([]); expect(r.execucoes).toEqual([]); expect(r.execucoes_agregadas).toHaveLength(1);
  });
  it('registra decisão individual e execução individual somente quando verificáveis', () => {
    const r = avaliarBootstrapCadastroMestre(base({ aprovacoes: [{ id: 'NOVO_PRODUTO:1041716', status: 'APROVADO', lote: 2 }], execucoes: [{ id: 'op-1', codigo_produto: '001', comprovada: true, operacao: 'INSERT', lote: 2 }] }));
    expect(r.evidencias).toEqual(expect.arrayContaining(['APROVACAO_INDIVIDUAL_COMPROVADA', 'EXECUCAO_COMPROVADA']));
  });
  it('mantém aprovação histórica de inelegível e elegibilidade indeterminada sem admissão', () => {
    expect(avaliarBootstrapCadastroMestre(base({ erp: { tipo: 'D', descr_origem: 'Produzido' }, aprovacoes: [{ id: 'x', status: 'APROVADO' }] })).elegibilidade.status).toBe('INELEGIVEL');
    expect(avaliarBootstrapCadastroMestre({ codigo_produto: '1', fontes: { master: true } }).elegibilidade.status).toBe('INDETERMINADA');
  });
  it('representa conflitos, repetição, ausência posterior e código inválido sem mutar entradas', () => {
    const input = base({ observacoes: [{ fonte: 'F08', linha: 2 }, { fonte: 'F08', linha: 2 }], conflitos: ['ORIGEM_DIVERGENTE'] }); const before = JSON.parse(JSON.stringify(input));
    expect(avaliarBootstrapCadastroMestre(input).conflitos).toEqual(['ORIGEM_DIVERGENTE']); expect(input).toEqual(before);
    expect(avaliarBootstrapCadastroMestre({ codigo_produto: '1.5' }).identidade).toBe('INVALIDA');
  });
  it('é determinístico e resume categorias sobrepostas', () => {
    const rows = [base({ fontes: { master: true, custos: true, op: true }, aprovacoes: [{ id: 'a', status: 'APROVADO' }] }), { codigo_produto: '002', observacoes: [{ fonte: 'F22' }] }];
    expect(criarRelatorioBootstrapCadastroMestre(rows)).toEqual(criarRelatorioBootstrapCadastroMestre(rows));
    expect(criarRelatorioBootstrapCadastroMestre(rows).resumo).toMatchObject({ total_identidades: 2, reconhecidas: 1, fatos_custos: 1, eventos_op: 1, aprovacoes_individuais: 1, admissao_pendente: 2 });
  });
  it.each(['1041716', '1041716P', '1747719U', '1755712', '1755713', '1841715', '1841715P'])('preserva a decisão individual histórica do lote 2: %s', codigo => {
    const r = avaliarBootstrapCadastroMestre(base({ codigo_produto: codigo, aprovacoes: [{ id: `NOVO_PRODUTO:${codigo}`, status: 'APROVADO', lote: 2 }] }));
    expect(r.aprovacoes).toEqual([{ id: `NOVO_PRODUTO:${codigo}`, lote: 2, categoria: null, direta: true }]);
    expect(r.admissao_detalhado.status).toBe('PENDENTE_DE_CONTRATO');
  });
  it.each(['1758717', '1758718', 'MCC016'])('mantém OP-only reconhecido sem criar produto: %s', codigo => {
    const r = avaliarBootstrapCadastroMestre({ codigo_produto: codigo, fontes: { op: true }, observacoes: [{ fonte: 'F22' }], erp: { tipo: 'P', descr_origem: 'MISTURAS' } });
    expect(r).toMatchObject({ reconhecimento: 'RECONHECIDA', fatos: { op: true, custos: false }, admissao_detalhado: { status: 'PENDENTE_DE_CONTRATO' } });
  });
  it.each(['1041716', '1041716P', '1747719U', '1841715', '1841715P'])('não trata Master-only como admissão: %s', codigo => {
    expect(avaliarBootstrapCadastroMestre(base({ codigo_produto: codigo, fontes: { master: true } })).admissao_detalhado.status).toBe('PENDENTE_DE_CONTRATO');
  });
});
