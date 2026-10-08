import { describe, expect, it } from 'vitest';
import { criarPreviewCadastroMestre, resolverCodigoExato } from '../core/cadastro-mestre-preview-engine.js';

const atual = { codigo_produto: '001', descricao: 'Produto A', origem_cod: '01', familia_cod: 'F1', agrupamento_erp_valor: 'ERP A' };
const contexto = { produtos: [atual], origens: [{ id: 'uuid-origem', codigo: '01', descricao: 'Origem' }], familias: [{ id: 'uuid-familia', codigo: 'F1', descricao: 'Família' }] };
const linha = changes => ({ ...atual, tipo: 'P', descr_origem: 'Produzido', ...changes });
const preview = (changes = {}, ctx = contexto) => criarPreviewCadastroMestre([linha(changes)], ctx);

describe('Cadastro Mestre — Preview puro', () => {
  it('novo produto pertence somente ao mestre no cálculo', () => {
    const result = preview({ codigo_produto: '002' });
    expect(result.produtos[0].tipo).toBe('NOVO_PRODUTO');
    expect(result.produtos[0].decisao_proposta).toContain('SOMENTE_NO_MASTER');
    expect(result.resumo.novos_produtos).toBe(1);
    expect(result.produtos[0].calculado).not.toHaveProperty('agrupamento_cod');
  });
  it('existente sem alteração', () => {
    expect(preview().produtos[0].tipo).toBe('SEM_ALTERACAO');
    expect(preview().resumo.alteracoes_potenciais).toBe(0);
  });
  it.each([
    ['descricao', 'Descrição nova'], ['origem_cod', '02'], ['familia_cod', 'F2'], ['agrupamento_erp_valor', 'ERP B']
  ])('%s alterado é diferença potencial', (campo, valor) => {
    const result = preview({ [campo]: valor });
    expect(result.produtos[0].tipo).toBe('ALTERACAO_POTENCIAL');
    expect(result.produtos[0].diferencas.find(item => item.campo === campo)).toMatchObject({ recebido: valor, proposto: valor, tipo: 'ALTERACAO_POTENCIAL' });
    expect(result.resumo.alteracoes_potenciais).toBe(1);
  });
  it('agrupamento ERP antes nulo é mudança, não categoria', () => {
    const result = preview({}, { ...contexto, produtos: [{ ...atual, agrupamento_erp_valor: null }] });
    expect(result.resumo.alteracoes_potenciais).toBe(1);
    expect(result.produtos[0].agrupamento.status).toBe('SEM_PONTE_ERP_KUSTOS');
  });
  it.each([null, '', '   ', undefined])('campo vazio %s preserva valor existente', value => {
    const result = preview({ descricao: value });
    expect(result.produtos[0].calculado.descricao).toBe('Produto A');
    expect(result.produtos[0].diferencas[0].tipo).toBe('CAMPO_VAZIO_PRESERVA_EXISTENTE');
    expect(result.resumo.campos_vazios).toBe(1);
  });
  it('campo não fornecido não se confunde com célula vazia', () => {
    const row = linha({});
    delete row.familia_cod;
    const result = criarPreviewCadastroMestre([row], contexto);
    expect(result.produtos[0].calculado.familia_cod).toBe('F1');
    expect(result.produtos[0].diferencas.find(item => item.campo === 'familia_cod').tipo).toBe('CAMPO_NAO_FORNECIDO');
    expect(result.resumo.campos_vazios).toBe(0);
  });
  it.each(['descricao', 'origem_cod', 'familia_cod', 'agrupamento_erp_valor'])('vazio em %s nunca apaga o Mestre calculado', campo => {
    const result = preview({ [campo]: null });
    expect(result.produtos[0].calculado[campo]).toBe(atual[campo]);
    expect(result.produtos[0].diferencas.find(item => item.campo === campo).tipo).toBe('CAMPO_VAZIO_PRESERVA_EXISTENTE');
    expect(result.resumo.alteracoes_potenciais).toBe(0);
    if (campo === 'agrupamento_erp_valor') expect(result.resumo.agrupamentos_erp_recebidos).toBe(0);
  });
  it('produto ausente é preservado', () => {
    const result = criarPreviewCadastroMestre([], contexto);
    expect(result.ausentes).toEqual([{ codigo_produto: '001', atual, recebido: null, tipo: 'AUSENTE_NO_ARQUIVO', decisao_proposta: 'PRESERVAR_MASTER' }]);
  });
  it.each(['D', 'X', '', null])('tipo %s excluído', tipo => {
    expect(preview({ tipo }).excluidos[0].motivo).toBe('TIPO_NAO_AUTORIZADO');
  });
  it.each(['P', 'C', ' p ', 'c'])('tipo %s mantido', tipo => {
    expect(preview({ tipo }).resumo.linhas_apos_filtros).toBe(1);
  });
  it.each(['Produzido', 'Revenda', 'Material PRODUZIDO ERP', ' Revenda local '])('origem %s mantida', descr_origem => {
    expect(preview({ descr_origem }).produtos).toHaveLength(1);
  });
  it('origem fora do filtro excluída', () => {
    expect(preview({ descr_origem: 'Despesa' }).excluidos[0].motivo).toBe('ORIGEM_NAO_AUTORIZADA');
  });
  it.each(['Produto inativo', 'INATIVO produto', 'Produto EXLUIR', 'Produto exluir'])('descrição %s excluída', descricao => {
    expect(preview({ descricao }).excluidos[0].motivo).toBe('DESCRICAO_EXCLUIDA');
  });
  it('filtros têm ordem tipo, origem, descrição', () => {
    expect(preview({ tipo: 'D', descr_origem: 'Despesa', descricao: 'inativo' }).excluidos[0].motivo).toBe('TIPO_NAO_AUTORIZADO');
    expect(preview({ descr_origem: 'Despesa', descricao: 'inativo' }).excluidos[0].motivo).toBe('ORIGEM_NAO_AUTORIZADA');
  });
  it('filtrado existente não é ausente nem removido', () => {
    const result = preview({ tipo: 'D' });
    expect(result.ausentes).toHaveLength(0);
    expect(result.excluidos[0].preserva_master).toBe(true);
  });
  it('família conhecida resolvida por código exato', () => {
    expect(preview().produtos[0].familia.recebido.status).toBe('RESOLVIDO');
  });
  it('família desconhecida permanece pendente no ERP', () => {
    const result = preview({ familia_cod: 'F999' });
    expect(result.produtos[0].familia.efetivo.status).toBe('PENDENTE');
    expect(result.produtos[0].calculado.familia_cod).toBe('F999');
    expect(result.resumo.familias_pendentes).toBe(1);
  });
  it('origem conhecida resolvida por código exato', () => {
    expect(preview().produtos[0].origem.efetivo.status).toBe('RESOLVIDO');
  });
  it('origem desconhecida permanece pendente', () => {
    expect(preview({ origem_cod: '99' }).resumo.origens_pendentes).toBe(1);
  });
  it.each(['uuid-familia', 'Família', 'f1', 'F01'])('não resolve por id, descrição, caixa ou proximidade: %s', code => {
    expect(resolverCodigoExato(code, contexto.familias).status).toBe('PENDENTE');
  });
  it('código duplicado de categoria é ambíguo', () => {
    const ctx = { ...contexto, familias: [...contexto.familias, { id: 'outra', codigo: 'F1' }] };
    expect(preview({}, ctx).produtos[0].familia.efetivo.status).toBe('AMBIGUO');
    expect(preview({}, ctx).resumo.familias_pendentes).toBe(1);
  });
  it('vazio preservado separa resolução recebida e efetiva', () => {
    const result = preview({ familia_cod: null });
    expect(result.produtos[0].familia.recebido.status).toBe('NAO_INFORMADO');
    expect(result.produtos[0].familia.efetivo.status).toBe('RESOLVIDO');
  });
  it('agrupamento recebido é bruto, sem ponte mesmo quando parece código Kustos', () => {
    const result = preview({ agrupamento_erp_valor: '  M001  Subgrupo  ' });
    expect(result.produtos[0].agrupamento.recebido).toBe('M001  Subgrupo');
    expect(result.resumo.agrupamentos_erp_recebidos).toBe(1);
    expect(result.resumo.agrupamentos_erp_sem_resolucao).toBe(1);
  });
  it('normalização técnica não muda caixa/zeros de origem ou família', () => {
    expect(preview({ origem_cod: ' 01 ', familia_cod: ' F1 ', descricao: ' Produto A ' }).resumo.alteracoes_potenciais).toBe(0);
  });
  it('normalizador canônico preserva identidade textual e expande notação científica', () => {
    expect(preview({ codigo_produto: ' 0 01 ' }).produtos[0].codigo_produto).toBe('001');
    expect(preview({ codigo_produto: '1.23E+5' }).produtos[0].codigo_produto).toBe('123000');
  });
  it.each(['', '1,25', -2, Number.MAX_SAFE_INTEGER + 1])('código inválido/impreciso %s dá erro sem interromper outra linha', codigo_produto => {
    const result = criarPreviewCadastroMestre([linha({ codigo_produto }), linha({ codigo_produto: '002' })], contexto);
    expect(result.erros).toHaveLength(1);
    expect(result.produtos).toHaveLength(1);
    expect(result.status).toBe('COM_ERROS');
  });
  it('duplicados não usam last-wins, inclusive se uma linha é filtrada', () => {
    const result = criarPreviewCadastroMestre([linha({}), linha({ tipo: 'D', descricao: 'Outro' })], contexto);
    expect(result.produtos).toHaveLength(0);
    expect(result.erros[0].motivo).toContain('duplicado');
    expect(result.ausentes).toHaveLength(0);
  });
  it('contexto ausente ou identidades colidentes no mestre são falhas explícitas', () => {
    expect(() => criarPreviewCadastroMestre([], undefined)).toThrow('contexto');
    expect(() => preview({}, { ...contexto, produtos: [atual, { ...atual, codigo_produto: ' 001 ' }] })).toThrow('duplicada');
  });
  it('determinístico e não modifica entradas congeladas', () => {
    const rows = [Object.freeze(linha({ descricao: 'Novo' })), Object.freeze(linha({ codigo_produto: '002' }))];
    const ctx = { produtos: [Object.freeze({ ...atual })], origens: contexto.origens.map(Object.freeze), familias: contexto.familias.map(Object.freeze) };
    Object.values(ctx).forEach(Object.freeze);
    Object.freeze(ctx);
    Object.freeze(rows);
    const before = JSON.stringify({ rows, ctx });
    expect(criarPreviewCadastroMestre(rows, ctx)).toEqual(criarPreviewCadastroMestre(rows, ctx));
    expect(JSON.stringify({ rows, ctx })).toBe(before);
  });
  it('resumo conta produtos, campos alterados/vazios e categorias separadamente', () => {
    const result = criarPreviewCadastroMestre([linha({ descricao: 'Mudou', origem_cod: '99', familia_cod: '' }), linha({ codigo_produto: '002', familia_cod: 'F999' })], contexto);
    expect(result.resumo).toMatchObject({ linhas_lidas: 2, linhas_apos_filtros: 2, novos_produtos: 1, produtos_existentes: 1, produtos_ausentes: 0, produtos_com_alteracoes: 1, alteracoes_potenciais: 2, campos_vazios: 1, familias_resolvidas: 1, familias_pendentes: 1, origens_resolvidas: 1, origens_pendentes: 1, agrupamentos_erp_recebidos: 2 });
  });
});
