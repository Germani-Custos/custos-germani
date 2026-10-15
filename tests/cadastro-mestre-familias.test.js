import { describe, expect, it } from 'vitest';
import { arquivoFamilias } from './fixtures/cadastro-mestre-familias.js';
import { contexto, SheetJS } from './fixtures/cadastro-mestre-arquivo.js';
import { criarManifestoCadastroMestre, criarRevisaoCadastroMestre, decidirOperacoesCadastroMestre } from '../core/cadastro-mestre-approval-engine.js';
import { criarPlanoReconstrucaoCadastroMestre } from '../core/cadastro-mestre-reconstruction-engine.js';
import { prepararAprovacaoArquivoCadastroMestre, prepararAprovacaoDadosCadastroMestre } from '../src/services/cadastro-mestre-preview.js';
import { hashReconstrucao } from '../scripts/lib/cadastro-mestre-reconstruction.mjs';

const row = (codigo_produto, familia_cod, familia_descricao_erp, extra = {}) => ({ codigo_produto, familia_cod, familia_descricao_erp,
  tipo: 'P', descr_origem: 'Produzido', descricao: 'Produto', ...extra });
const manifest = (rows, categorias = contexto.familias, produtos = []) => criarManifestoCadastroMestre(rows,
  { ...contexto, familias: categorias, produtos }, { modo: 'RECONSTRUCAO_UNIVERSO' });
const familia = m => m.catalogo_familias.familias[0];
const aprovar = (m, ids = m.operacoes.filter(o => o.aprovavel).map(o => o.id)) => decidirOperacoesCadastroMestre(m, criarRevisaoCadastroMestre(m), ids, 'APROVADO');

describe('Famílias ERP — código exato e propostas puras', () => {
  it('existente com rótulo idêntico não escreve nem exige decisão de família', () => {
    const m = manifest([row('1', 'F1', 'Família teste')]);
    expect(familia(m)).toMatchObject({ codigo: 'F1', status: 'EXISTENTE_SEM_ALTERACAO', quantidade_produtos: 1 });
    expect(m.operacoes.filter(o => o.tabela === 'categorias_familia')).toEqual([]);
  });
  it('nova gera INSERT e existente divergente atualiza somente descrição, preservando identidade', () => {
    const m = manifest([row('1', '0002', 'Novo'), row('2', 'F1', 'Novo rótulo')]);
    const ops = m.operacoes.filter(o => o.tabela === 'categorias_familia');
    expect(ops.map(o => o.dados)).toEqual([{ codigo: '0002', descricao: 'Novo' }, { descricao: 'Novo rótulo' }]);
    expect(ops[1].atual).toEqual(contexto.familias[0]);
  });
  it.each(['F1', 'AUSENTE'])('descrição vazia de %s preserva catálogo e não cria proposta', codigo => {
    const m = manifest([row('1', codigo, '  ')]);
    expect(familia(m).status).toBe('DESCRICAO_VAZIA');
    expect(m.operacoes.some(o => o.tabela === 'categorias_familia')).toBe(false);
  });
  it('mesma família com rótulos conflitantes, inclusive em linha excluída, bloqueia a carga inteira', () => {
    const m = manifest([row('1', 'F1', 'A'), row('2', 'F1', 'B', { tipo: 'D' })]);
    expect(familia(m)).toMatchObject({ status: 'CONFLITO', descricoes_erp: ['A', 'B'] });
    expect(m.reconstrucao_bloqueada).toBe(true);
    expect(m.resumo.erros).toBe(1);
    expect(() => criarPlanoReconstrucaoCadastroMestre(m, criarRevisaoCadastroMestre(m))).toThrow('bloqueada');
  });
  it('duplicidade de código no catálogo não escolhe vencedor', () => {
    const m = manifest([row('1', 'F1', 'Rótulo')], [...contexto.familias, { id: 'f2', codigo: 'F1', descricao: 'Outro' }]);
    expect(familia(m).status).toBe('CATALOGO_AMBIGUO');
    expect(m.reconstrucao_bloqueada).toBe(true);
  });
  it('famílias somente de linhas excluídas não entram no catálogo proposto', () => {
    const m = manifest([row('1', 'F1', 'Família teste'), row('2', 'FORA', 'Ignorar', { tipo: 'D' })]);
    expect(m.catalogo_familias.familias.map(f => f.codigo)).toEqual(['F1']);
  });
  it('repetições idênticas e ordem das linhas não escolhem rótulo ou duplicam a família', () => {
    const rows = [row('1', 'F1', 'Família teste'), row('2', 'F1', 'Família teste'), row('3', 'F1', '')];
    expect(manifest(rows).catalogo_familias).toEqual(manifest([...rows].reverse()).catalogo_familias);
    expect(familia(manifest(rows))).toMatchObject({ quantidade_produtos: 3, descricoes_erp: ['Família teste'] });
  });
  it('códigos diferentes com mesmo rótulo continuam distintos e impactos contam produtos válidos', () => {
    const m = manifest([row('1', '001', 'Igual'), row('2', '001', 'Igual'), row('3', '01', 'Igual'), row('4', '001', 'Igual', { tipo: 'D' })]);
    expect(m.catalogo_familias.familias.map(f => [f.codigo, f.quantidade_produtos])).toEqual([['001', 2], ['01', 1]]);
    expect(m.catalogo_familias.resumo).toMatchObject({ total: 2, novas: 2, produtos_impactados_novas: 3 });
  });
  it('família vazia do ERP preserva código do produto e não inventa rótulo', () => {
    const m = manifest([row('001', '', '')], contexto.familias, [contexto.produtos[0]]);
    expect(familia(m)).toMatchObject({ codigo: 'F1', status: 'DESCRICAO_VAZIA' });
    expect(m.produtos[0].calculado.familia_cod).toBe('F1');
  });
  it('aprovar produtos não aprova famílias; rejeição mantém execução bloqueada', () => {
    const m = manifest([row('1', '001', 'Nova')]);
    const r = aprovar(m, m.operacoes.filter(o => o.tabela === 'dicionario_master_produtos').map(o => o.id));
    expect(r.decisoes.find(d => d.id.startsWith('CADASTRAR_FAMILIA_ERP:')).status).toBe('PENDENTE');
    expect(() => criarPlanoReconstrucaoCadastroMestre(m, r)).toThrow('Todas');
    const rejeitada = decidirOperacoesCadastroMestre(m, r, [m.operacoes.find(o => o.tabela === 'categorias_familia').id], 'REJEITADO');
    expect(() => criarPlanoReconstrucaoCadastroMestre(m, rejeitada)).toThrow('Todas');
    const plano = criarPlanoReconstrucaoCadastroMestre(m, aprovar(m));
    expect(plano.inserts).toHaveLength(1);
    expect(plano.familias.operacoes).toHaveLength(1);
  });

  it.each(['xls', 'xlsx', 'xlsm'])('adapter %s captura rótulo e código formatado, transporte e manifesto equivalentes no servidor', async formato => {
    const p = await prepararAprovacaoArquivoCadastroMestre(await arquivoFamilias(formato), contexto, SheetJS);
    expect(p.dadosExecucao.fonte.colunas.familia_descricao_erp).toBe(9);
    expect(p.dadosExecucao.linhas.find(r => r[1] === '1e3')[6]).toBe('0002');
    expect(p.dadosExecucao.linhas[0][8]).toBe('Família atualizada');
    expect(p.manifesto.catalogo_familias.resumo).toMatchObject({ total: 3, novas: 2, atualizacoes: 1, conflitos: 0 });
    expect((await prepararAprovacaoDadosCadastroMestre(p.dadosExecucao, contexto)).manifesto).toEqual(p.manifesto);
    const adulterado = globalThis.structuredClone(p.dadosExecucao);
    adulterado.linhas[0][8] = 'Adulterada';
    expect(hashReconstrucao((await prepararAprovacaoDadosCadastroMestre(adulterado, contexto)).manifesto)).not.toBe(hashReconstrucao(p.manifesto));
  });
  it('volume sintético reproduz 81/16/65/693 e exclui as outras 134 famílias do arquivo', () => {
    const categorias = Array.from({ length: 16 }, (_, i) => ({ id: `f${i}`, codigo: `F${i}`, descricao: `Família ${i}` }));
    const rows = Array.from({ length: 860 }, (_, i) => {
      const f = i < 167 ? i % 16 : 16 + (i - 167) % 65;
      return row(String(i + 1), `F${f}`, `Família ${f}`);
    });
    rows.push(...Array.from({ length: 5370 }, (_, i) => row(String(9000 + i), `FORA${i % 134}`, `Fora ${i % 134}`, { tipo: 'D' })));
    const m = manifest(rows, categorias);
    expect(m.resumo).toMatchObject({ linhas_lidas: 6230, produtos_com_preview: 860 });
    expect(m.catalogo_familias.resumo).toEqual({ total: 81, existentes_sem_alteracao: 16, novas: 65, atualizacoes: 0, conflitos: 0, ambiguas: 0, sem_descricao: 0, produtos_impactados_novas: 693 });
    expect(m.operacoes.filter(o => o.tabela === 'categorias_familia')).toHaveLength(65);
  });
});
