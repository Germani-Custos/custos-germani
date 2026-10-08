import { describe, expect, it, vi } from 'vitest';
import { criarManifestoCadastroMestre, criarRevisaoCadastroMestre, decidirOperacoesCadastroMestre, obterOperacoesAprovadasCadastroMestre } from '../core/cadastro-mestre-approval-engine.js';
import { prepararAprovacaoArquivoCadastroMestre, mapearPlanilhaCadastroMestre } from '../src/services/cadastro-mestre-preview.js';
import { createRequire } from 'node:module';

const XLSX = createRequire(import.meta.url)('xlsx');
const produto = { codigo_produto: '001', descricao: 'Produto A', origem_cod: '01', familia_cod: 'F1', agrupamento_erp_valor: null };
const contexto = { produtos: [produto], origens: [{ codigo: '01', id: 'o' }], familias: [{ codigo: 'F1', id: 'f' }] };
const linha = changes => ({ ...produto, tipo: 'P', descr_origem: 'Produzido', ...changes });
const gerar = (changes = {}, ctx = contexto) => criarManifestoCadastroMestre([linha(changes)], ctx, { arquivo: 'cadastro.xlsm' });
const congelar = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(congelar); Object.freeze(value); }
  return value;
};

describe('Manifesto puro do Cadastro Mestre', () => {
  it('produto novo: INSERT só no Master, dados ERP sem FK operacional', () => {
    const m = gerar({ codigo_produto: '002', agrupamento_erp_valor: 'P005' });
    expect(m.resumo.inserts_propostos).toBe(1);
    expect(m.operacoes[0]).toMatchObject({ categoria: 'NOVO_PRODUTO', acao: 'INSERT', tabela: 'dicionario_master_produtos', dados: { codigo_produto: '002', familia_cod: 'F1', agrupamento_erp_valor: 'P005' } });
    expect(m.operacoes[0].dados).not.toHaveProperty('familia_id');
    expect(m.operacoes[0].dados).not.toHaveProperty('agrupamento_cod');
    expect(m.operacoes[0].campos_lote_na_execucao).toEqual(['ultima_importacao_cadastro_mestre_id', 'agrupamento_erp_importacao_id']);
  });
  it('descrição alterada mostra atual, ERP e diferença, sem mudar outros campos', () => {
    const m = gerar({ descricao: 'Descrição nova' });
    expect(m.operacoes[0]).toMatchObject({ categoria: 'ATUALIZAR_DESCRICAO', dados: { descricao: 'Descrição nova' }, atual: { descricao: 'Produto A' }, recebido: { origem_cod: '01', familia_cod: 'F1' }, diferencas: [{ campo: 'descricao', atual: 'Produto A', recebido: 'Descrição nova' }] });
    expect(Object.keys(m.operacoes[0].dados)).toEqual(['descricao']);
  });
  it('agrupamento preenchido e Master NULL é preenchimento normal, não conflito', () => {
    const m = gerar({ agrupamento_erp_valor: ' P005 ' });
    expect(m.operacoes[0]).toMatchObject({ categoria: 'ATUALIZAR_AGRUPAMENTO_ERP', aprovavel: true, dados: { agrupamento_erp_valor: 'P005' }, bloqueios: [] });
    expect(m.resumo.agrupamentos_erp_preenchidos).toBe(1);
    expect(m.distribuicao_agrupamento).toEqual([{ valor: 'P005', total: 1, novos: 0, existentes: 1 }]);
  });
  it('agrupamento vazio preserva atual sem UPDATE nem proposta NULL', () => {
    const m = gerar({ agrupamento_erp_valor: '' }, { ...contexto, produtos: [{ ...produto, agrupamento_erp_valor: 'P801' }] });
    expect(m.operacoes).toEqual([]);
    expect(m.preservacoes).toContainEqual({ codigo_produto: '001', campo: 'agrupamento_erp_valor', atual: 'P801', tipo: 'CAMPO_VAZIO_PRESERVA_EXISTENTE', operacao: null });
    expect(m.sem_alteracao).toEqual(['001']);
  });
  it('agrupamento igual ao atual não gera escrita nem renova proveniência', () => {
    expect(gerar({ agrupamento_erp_valor: 'P005' }, { ...contexto, produtos: [{ ...produto, agrupamento_erp_valor: 'P005' }] }).operacoes).toEqual([]);
  });
  it('família resolvida somente por código exato', () => {
    expect(gerar().resumo.familias_resolvidas).toBe(1);
    expect(gerar().produtos[0].familia.efetivo.status).toBe('RESOLVIDO');
  });
  it('família pendente conserva código ERP no INSERT sem inventar classificação', () => {
    const m = gerar({ codigo_produto: '002', familia_cod: 'F999' });
    expect(m.resumo.familias_pendentes).toBe(1);
    expect(m.operacoes[0].dados.familia_cod).toBe('F999');
    expect(m.operacoes[0].aprovavel).toBe(true);
    expect(m.pendencias[0]).toMatchObject({ campo: 'familia_cod', status: 'PENDENTE', impede_dado_erp_bruto: false });
  });
  it('origem resolvida por categorias_origem.codigo', () => {
    expect(gerar().resumo.origens_resolvidas).toBe(1);
    expect(gerar().produtos[0].origem.efetivo.status).toBe('RESOLVIDO');
  });
  it.each(['descricao', 'origem_cod', 'familia_cod'])('campo %s vazio preserva sem operação NULL', campo => {
    const m = gerar({ [campo]: null });
    expect(m.operacoes).toEqual([]);
    expect(m.preservacoes).toContainEqual({ codigo_produto: '001', campo, atual: produto[campo], tipo: 'CAMPO_VAZIO_PRESERVA_EXISTENTE', operacao: null });
  });
  it('novo com ERP vazio omite campo, sem propor NULL', () => {
    const m = gerar({ codigo_produto: '002', familia_cod: '', agrupamento_erp_valor: '' });
    expect(m.operacoes[0].dados).not.toHaveProperty('familia_cod');
    expect(m.operacoes[0].dados).not.toHaveProperty('agrupamento_erp_valor');
    expect(m.preservacoes.every(p => p.tipo === 'CAMPO_VAZIO_OMITIDO_NO_INSERT')).toBe(true);
  });
  it('produto ausente e produto filtrado são preservados, sem DELETE nem UPDATE', () => {
    const ctx = { ...contexto, produtos: [produto, { ...produto, codigo_produto: '002' }] };
    const m = criarManifestoCadastroMestre([linha({ tipo: 'D' })], ctx);
    expect(m.operacoes).toEqual([]);
    expect(m.preservados).toEqual([{ codigo_produto: '001', motivo: 'FORA_DO_CONJUNTO_FILTRADO', operacao: null }, { codigo_produto: '002', motivo: 'AUSENTE_NO_ARQUIVO', operacao: null }]);
  });
  it('preservação reutiliza a identidade canônica, inclusive notação científica', () => {
    const m = criarManifestoCadastroMestre([linha({ codigo_produto: '1E3', tipo: 'D' })], { ...contexto, produtos: [{ ...produto, codigo_produto: '1000' }] });
    expect(m.preservados[0].motivo).toBe('FORA_DO_CONJUNTO_FILTRADO');
  });
  it('739 da base não se confundem com SEM_ALTERACAO após capturar agrupamento', () => {
    const m = gerar({ agrupamento_erp_valor: 'P005' });
    expect(m.resumo_base.existentes_sem_alteracao).toBe(1);
    expect(m.resumo.existentes_sem_operacao).toBe(0);
  });
  it('mesmo produto com descrição e agrupamento tem duas decisões independentes', () => {
    const m = gerar({ descricao: 'Nova', agrupamento_erp_valor: 'P005' });
    expect(m.resumo).toMatchObject({ updates_propostos: 2, produtos_existentes_com_update: 1 });
    const descricao = m.operacoes.find(o => o.categoria === 'ATUALIZAR_DESCRICAO');
    const r = decidirOperacoesCadastroMestre(m, criarRevisaoCadastroMestre(m), [descricao.id], 'APROVADO');
    expect(obterOperacoesAprovadasCadastroMestre(m, r).operacoes.map(o => o.dados)).toEqual([{ descricao: 'Nova' }]);
  });
  it('agrupamentos nunca são convertidos para Mxxx ou categorias Kustos', () => {
    const m = gerar({ agrupamento_erp_valor: 'P801' });
    expect(m.operacoes[0].agrupamento.status).toBe('SEM_PONTE_ERP_KUSTOS');
    expect(m.operacoes[0].dados).toEqual({ agrupamento_erp_valor: 'P801' });
  });
  it('alteração inesperada de origem/família não é silenciosamente aprovada', () => {
    const m = gerar({ origem_cod: '02', descricao: 'Nova' });
    expect(m.operacoes[0].aprovavel).toBe(false);
    expect(() => decidirOperacoesCadastroMestre(m, criarRevisaoCadastroMestre(m), [m.operacoes[0].id], 'APROVADO')).toThrow('bloqueada');
  });
  it('erro de identidade não gera operação para linha inválida/duplicada', () => {
    const m = criarManifestoCadastroMestre([linha({}), linha({ descricao: 'Duplicada' })], contexto);
    expect(m.status).toBe('COM_ERROS');
    expect(m.operacoes).toEqual([]);
    expect(m.preservados.map(p => p.codigo_produto)).toEqual(['001']);
  });
  it('manifesto determinístico, sem mutar entradas congeladas', () => {
    const rows = congelar([linha({ agrupamento_erp_valor: 'P005' })]);
    const ctx = congelar(JSON.parse(JSON.stringify(contexto)));
    const antes = JSON.stringify({ rows, ctx });
    expect(criarManifestoCadastroMestre(rows, ctx)).toEqual(criarManifestoCadastroMestre(rows, ctx));
    expect(JSON.stringify({ rows, ctx })).toBe(antes);
  });
});

describe('Revisão local, sem executor', () => {
  const m = gerar({ descricao: 'Nova', agrupamento_erp_valor: 'P005' });
  it('inicializa todas PENDENTES, zero aprovadas e execução proibida', () => {
    const r = criarRevisaoCadastroMestre(m);
    expect(r.decisoes.every(d => d.status === 'PENDENTE')).toBe(true);
    expect(obterOperacoesAprovadasCadastroMestre(m, r)).toMatchObject({ operacoes: [], execucao_permitida: false });
  });
  it.each(['APROVADO', 'REJEITADO'])('decisão individual %s só afeta a operação escolhida', decisao => {
    const r = congelar(criarRevisaoCadastroMestre(m));
    const result = decidirOperacoesCadastroMestre(m, r, [m.operacoes[0].id], decisao);
    expect(result.decisoes.map(d => d.status)).toEqual([decisao, 'PENDENTE']);
    expect(r.decisoes.every(d => d.status === 'PENDENTE')).toBe(true);
  });
  it.each(['APROVADO', 'REJEITADO'])('decisão em lote %s inclui todas e nada mais', decisao => {
    const result = decidirOperacoesCadastroMestre(m, criarRevisaoCadastroMestre(m), m.operacoes.map(o => o.id), decisao);
    expect(result.decisoes.every(d => d.status === decisao)).toBe(true);
    expect(obterOperacoesAprovadasCadastroMestre(m, result).operacoes).toHaveLength(decisao === 'APROVADO' ? 2 : 0);
  });
  it('mudança no manifesto invalida revisão anterior mesmo mantendo IDs', () => {
    const outro = gerar({ descricao: 'Outro valor', agrupamento_erp_valor: 'P005' });
    expect(() => obterOperacoesAprovadasCadastroMestre(outro, criarRevisaoCadastroMestre(m))).toThrow('não pertence');
  });
  it('seleção desconhecida, duplicada ou status inválido falha sem decisão parcial', () => {
    const r = criarRevisaoCadastroMestre(m);
    expect(() => decidirOperacoesCadastroMestre(m, r, [m.operacoes[0].id, 'inexistente'], 'APROVADO')).toThrow('inexistente');
    expect(() => decidirOperacoesCadastroMestre(m, r, [m.operacoes[0].id, m.operacoes[0].id], 'APROVADO')).toThrow('inválida');
    expect(() => decidirOperacoesCadastroMestre(m, r, [], 'EXECUTAR')).toThrow('inválida');
    expect(r.decisoes.every(d => d.status === 'PENDENTE')).toBe(true);
  });
  it('decisões incompletas ou status adulterado são recusados', () => {
    const r = criarRevisaoCadastroMestre(m);
    expect(() => obterOperacoesAprovadasCadastroMestre(m, { ...r, decisoes: r.decisoes.slice(1) })).toThrow('incompletas');
    expect(() => obterOperacoesAprovadasCadastroMestre(m, { ...r, decisoes: [{ id: r.decisoes[0].id, status: 'EXECUTAR' }, r.decisoes[1]] })).toThrow('inválidas');
  });
  it('saída aprovada é cópia independente, IDs de lote continuam indefinidos', () => {
    const r = decidirOperacoesCadastroMestre(m, criarRevisaoCadastroMestre(m), m.operacoes.map(o => o.id), 'APROVADO');
    const output = obterOperacoesAprovadasCadastroMestre(m, r);
    output.operacoes[0].dados.agrupamento_erp_valor = 'alterado localmente';
    expect(m.operacoes[0].dados.agrupamento_erp_valor).toBe('P005');
    expect(m.operacoes.every(o => !Object.hasOwn(o.dados, 'agrupamento_erp_importacao_id'))).toBe(true);
  });
  it('zero escrita: não usa rede, Supabase, storage ou métodos de persistência', () => {
    const network = vi.spyOn(globalThis, 'fetch').mockImplementation(() => { throw new Error('Rede proibida'); });
    const output = obterOperacoesAprovadasCadastroMestre(m, decidirOperacoesCadastroMestre(m, criarRevisaoCadastroMestre(m), m.operacoes.map(o => o.id), 'APROVADO'));
    expect(output.execucao_permitida).toBe(false);
    expect(network).not.toHaveBeenCalled();
    network.mockRestore();
  });
});

describe('Agrup. Prod. e preparação do arquivo', () => {
  const headers = ['Produto', 'Descrição', 'Tipo', 'Descr. (Origem)', 'Origem', 'Família', 'Agrup. Est.', 'Agrup. Prod.', 'Agrup. Custos'];
  const data = ['001', 'Produto A', 'P', 'Produzido', '01', 'F1', 'E204', 'P005', 'U001'];
  it('somente alias oficial Agrup. Prod. é reconhecido entre campos concorrentes', () => {
    const leitura = mapearPlanilhaCadastroMestre([headers, data]);
    expect(leitura.colunas.agrupamento_erp_valor).toBe(7);
    expect(leitura.linhas[0].agrupamento_erp_valor).toBe('P005');
    expect(mapearPlanilhaCadastroMestre([headers.filter(h => h !== 'Agrup. Prod.'), data.filter((_, i) => i !== 7)]).colunas).not.toHaveProperty('agrupamento_erp_valor');
  });
  it('dois aliases para agrupamento continuam erro, sem preferência silenciosa', () => {
    expect(() => mapearPlanilhaCadastroMestre([[...headers, 'Agrupamento ERP'], [...data, 'P801']])).toThrow('ambíguo');
  });
  it('processa XLSM real em memória, calcula hashes e entrega revisão pendente determinística', async () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([headers, data]), 'Cadastro');
    const bytes = XLSX.write(wb, { type: 'array', bookType: 'xlsm' });
    const file = { name: 'cadastro.xlsm', arrayBuffer: async () => bytes };
    const result = await prepararAprovacaoArquivoCadastroMestre(file, contexto, XLSX);
    expect(result.manifesto.fonte.hash_arquivo_sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(result.manifesto.fonte.hash_contexto_sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(result.manifesto.operacoes[0].dados).toEqual({ agrupamento_erp_valor: 'P005' });
    expect(result.revisao.decisoes.every(d => d.status === 'PENDENTE')).toBe(true);
    expect(result).toEqual(await prepararAprovacaoArquivoCadastroMestre(file, contexto, XLSX));
  });
});
