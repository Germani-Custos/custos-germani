import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { analyzeOpCustoHistorico } from '../core/op-custo-historico-engine.js';

function op(id, date, patch = {}) {
  return { id, cod_produto: '001', descricao: 'Descrição OP', data_referencia: date, criado_em: '2030-01-01T00:00:00Z',
    op: 700, origem: 1, estagio: 'MASSA', unidade: 'KG', lote: 'L1', qtd_prevista: 100, qtd_produzida: 80,
    tempo_previsto: 10, tempo_real: 20, tempo_parada: 12, kg_hora_previsto: 10, kg_hora_real: 5, ...patch };
}
function custo(id, date, patch = {}) {
  return { id, codigo_produto: '001', descricao: 'Descrição Custo', data_referencia: date, criado_em: '2026-06-10T10:00:00Z',
    custo_variavel: 0, custo_direto_fixo: null, custo_total: 10, ...patch };
}
function contexto({ competencias = ['2026-06'], ops = [], custos = [], opEstado, custoEstado, estado = 'completo', qualidade = true } = {}) {
  const meta = (rows, explicit) => explicit || { estado: rows.length ? 'completa' : 'completa_vazia', contagem: rows.length };
  const fontes = { op: meta(ops, opEstado), custos: meta(custos, custoEstado) };
  return {
    versao: 'OP_CUSTO_HISTORICO_LEITURA_V1', estado, qualidade: { completa: qualidade }, produto: { codigoNormalizado: '001' },
    periodo: { inicioCompetencia: competencias[0], fimCompetencia: competencias.at(-1), competencias },
    fontes, competencias: competencias.map(competencia => ({
      competencia,
      op: fontes.op.estado === 'erro' ? { estado: 'erro', contagem: null } : { estado: ops.some(row => row.data_referencia?.startsWith(competencia)) ? 'completa' : 'completa_vazia', contagem: ops.filter(row => row.data_referencia?.startsWith(competencia)).length },
      custos: fontes.custos.estado === 'erro' ? { estado: 'erro', contagem: null } : { estado: custos.some(row => row.data_referencia?.startsWith(competencia)) ? 'completa' : 'completa_vazia', contagem: custos.filter(row => row.data_referencia?.startsWith(competencia)).length }
    })), opEventos: ops, custoSnapshots: custos,
    diagnosticos: { opNaoVinculavel: [], custoNaoVinculavel: [], foraIntervalo: [] }
  };
}
function congelar(value) {
  if (value && typeof value === 'object') { Object.freeze(value); Object.values(value).forEach(congelar); }
  return value;
}

describe('OP × CUSTO histórico — motor puro de composição 4C-2', () => {
  it('carrega sem DOM, configuração, API ou Supabase e só importa núcleos puros', () => {
    const url = new URL('../core/op-custo-historico-engine.js', import.meta.url);
    const source = readFileSync(url, 'utf8');
    expect(source.match(/^import .*$/gm)).toEqual([
      "import { normalizeCodigoProduto } from './spreadsheet-engine.js';",
      "import { analyzeOpInvestigation } from './op-investigation-engine.js';"
    ]);
    expect(() => execFileSync(process.execPath, ['--input-type=module', '-e', `await import(${JSON.stringify(url.href)})`], { env: {} })).not.toThrow();
  });

  it('normaliza somente o código, preserva IDs e não associa produtos por descrição', () => {
    const input = contexto({ ops: [op(1, '2026-06-01', { cod_produto: ' 001 ', descricao: 'Mesmo rótulo' })],
      custos: [custo('c1', '2026-06-02', { codigo_produto: '001', descricao: 'Mesmo rótulo' })] });
    const result = analyzeOpCustoHistorico(input);
    expect(result.produto).toEqual({ codigoNormalizado: '001' });
    expect(result.competencias[0].op.eventos[0].idFonte).toBe(1);
    expect(result.competencias[0].custos.snapshots[0].id).toBe('c1');
    expect(result.competencias[0].cobertura).toBe('A');
    const divergente = analyzeOpCustoHistorico(contexto({ ops: [op(2, '2026-06-01', { cod_produto: '002', descricao: 'Mesmo rótulo' })] }));
    expect(divergente.competencias[0].op.eventos).toEqual([]);
    expect(divergente.diagnosticos.composicao.codigoDivergente[0]).toMatchObject({ fonte: 'op', idFonte: 2 });
  });

  it('organiza competências cronológicas, preserva datas completas e usa data_referencia, não criado_em', () => {
    const input = contexto({ competencias: ['2026-12', '2027-01'],
      ops: [op(1, '2026-12-31', { criado_em: '2027-02-01T00:00:00Z' }), op(2, '2027-01-01', { criado_em: '2000-01-01T00:00:00Z' })],
      custos: [custo('c1', '2026-12-01', { criado_em: '2027-12-01T00:00:00Z' }), custo('c2', '2027-01-31', { criado_em: '2001-01-01T00:00:00Z' })] });
    const result = analyzeOpCustoHistorico(input);
    expect(result.competencias.map(item => item.competencia)).toEqual(['2026-12', '2027-01']);
    expect(result.competencias[0].op.eventos[0].fatoOriginal.data_referencia).toBe('2026-12-31');
    expect(result.competencias[1].custos.snapshots[0].data_referencia).toBe('2027-01-31');
    expect(result.competencias.map(item => item.cobertura)).toEqual(['A', 'A']);
  });

  it('calcula A/B/C/D apenas com ambas as fontes completas, inclusive competência vazia explicitamente consultada', () => {
    const result = analyzeOpCustoHistorico(contexto({ competencias: ['2026-06', '2026-07', '2026-08', '2026-09'],
      ops: [op(1, '2026-06-01'), op(2, '2026-07-01')], custos: [custo('a', '2026-06-01'), custo('b', '2026-08-01')] }));
    expect(result.competencias.map(item => item.cobertura)).toEqual(['A', 'B', 'C', 'D']);
    expect(result.cobertura).toEqual({ A: 1, B: 1, C: 1, D: 1 });
    expect(result.evidencias.filter(item => item.tipo === 'cobertura_sem_fatos')).toHaveLength(1);
    expect(result.competencias[3].fontes).toEqual({ op: { estado: 'completa_vazia', contagem: 0 }, custos: { estado: 'completa_vazia', contagem: 0 } });
  });

  it('preserva o estado por competência da leitura factual e bloqueia cobertura se uma competência estiver em erro', () => {
    const input = contexto({ competencias: ['2026-06', '2026-07'], ops: [op(1, '2026-06-01')], custos: [custo('c1', '2026-06-01')] });
    input.competencias[1].custos = { estado: 'erro', contagem: null };
    const result = analyzeOpCustoHistorico(input);
    expect(result.estado).toBe('incompleto');
    expect(result.cobertura).toBeNull();
    expect(result.competencias[1].fontes.custos).toEqual({ estado: 'erro', contagem: null });
    expect(result.competencias.every(item => item.cobertura === null)).toBe(true);
  });

  it.each([
    ['op', { estado: 'erro', contagem: null }, undefined],
    ['custos', undefined, { estado: 'erro', contagem: null }],
    ['ambas', { estado: 'erro', contagem: null }, { estado: 'erro', contagem: null }]
  ])('bloqueia cobertura após fonte %s incompleta, sem esconder fatos já lidos', (_nome, opEstado, custoEstado) => {
    const result = analyzeOpCustoHistorico(contexto({ ops: [op(1, '2026-06-01')], custos: [custo('c1', '2026-06-01')],
      opEstado, custoEstado, estado: 'incompleto', qualidade: false }));
    expect(result).toMatchObject({ estado: 'incompleto', qualidade: { completa: false, coberturaPronta: false }, cobertura: null });
    expect(result.competencias[0].cobertura).toBeNull();
    expect(result.competencias[0].op.eventos).toHaveLength(1);
    expect(result.competencias[0].custos.snapshots).toHaveLength(1);
  });

  it('preserva eventos individuais, classificações OP, estágios/unidades heterogêneos e contagem de eventos sem agregação', () => {
    const first = op(1, '2026-06-01');
    const second = op(2, '2026-06-05', { op: 700, estagio: 'FORNO', unidade: 'CX', origem: 2, qtd_produzida: 100,
      tempo_real: 8, tempo_parada: 0, kg_hora_real: 12 });
    const result = analyzeOpCustoHistorico(contexto({ ops: [first, second] }));
    const composed = result.competencias[0].op;
    expect(composed.eventos.map(item => item.fatoOriginal)).toEqual([first, second]);
    expect(composed.eventos.map(item => item.resultadoOriginal.classificacaoInvestigativa)).toHaveLength(2);
    expect(composed.contagens).toEqual({ eventos: 2 });
    expect(composed.consolidacao).toEqual({ estado: 'nao_disponivel', valores: null });
    expect(composed).not.toHaveProperty('qtdProduzidaTotal');
    expect(composed).not.toHaveProperty('produtividadeMedia');
  });

  it('mantém sinais OP favoráveis e desfavoráveis coexistentes como evidência descritiva', () => {
    const ruim = op(1, '2026-06-01');
    const favoravel = op(2, '2026-06-02', { qtd_produzida: 100, tempo_real: 8, tempo_parada: 0, kg_hora_real: 12 });
    const result = analyzeOpCustoHistorico(contexto({ ops: [ruim, favoravel] }));
    expect(result.competencias[0].op.sinais).toMatchObject({ favoraveis: true, desfavoraveis: true });
    expect(result.evidencias).toContainEqual(expect.objectContaining({ tipo: 'sinais_op_favoraveis_e_desfavoraveis', competencia: '2026-06' }));
    expect(result.contagensDescritivas.competenciasComSinaisOpDesfavoraveis).toBe(1);
  });

  it('preserva a série de Custos com zero, nulo e campo ausente e seleciona somente o maior criado_em válido', () => {
    const first = custo('c1', '2026-06-01', { criado_em: '2026-06-10T10:00:00.000001Z', custo_total: 0, custo_variavel: null });
    const last = custo('c2', '2026-06-20', { criado_em: '2026-06-10T10:00:00.000002Z', custo_total: null });
    delete last.custo_direto_fixo;
    const result = analyzeOpCustoHistorico(contexto({ custos: [first, last] }));
    const custos = result.competencias[0].custos;
    expect(custos.snapshots).toEqual([first, last]);
    expect(custos.candidatoRepresentativo).toMatchObject({ estado: 'selecionado', idsCandidatos: ['c2'], snapshotsCandidatos: [last] });
    expect(custos.snapshots[0]).toMatchObject({ custo_total: 0, custo_variavel: null });
    expect(Object.hasOwn(custos.snapshots[1], 'custo_direto_fixo')).toBe(false);
  });

  it('deixa candidato indisponível sem timestamp e explicita empate equivalente ou ambíguo sem escolher vencedor', () => {
    const semData = analyzeOpCustoHistorico(contexto({ custos: [custo('x', '2026-06-01', { criado_em: null })] }));
    expect(semData.competencias[0].custos.candidatoRepresentativo).toMatchObject({ estado: 'indisponivel', idsCandidatos: [] });
    const iguais = analyzeOpCustoHistorico(contexto({ custos: [
      custo('a', '2026-06-01', { criado_em: '2026-06-10T00:00:00Z', custo_total: 10 }),
      custo('b', '2026-06-02', { criado_em: '2026-06-10T00:00:00Z', custo_total: 10 })
    ] }));
    expect(iguais.competencias[0].custos.candidatoRepresentativo).toMatchObject({ estado: 'empate_equivalente', idsCandidatos: ['a', 'b'] });
    const ambiguo = analyzeOpCustoHistorico(contexto({ custos: [
      custo('a', '2026-06-01', { criado_em: '2026-06-10T00:00:00Z', custo_total: 10 }),
      custo('b', '2026-06-02', { criado_em: '2026-06-10T00:00:00Z', custo_total: 11 })
    ] }));
    expect(ambiguo.competencias[0].custos.candidatoRepresentativo).toMatchObject({ estado: 'ambiguo', idsCandidatos: ['a', 'b'] });
    expect(ambiguo.evidencias).toContainEqual(expect.objectContaining({ tipo: 'candidato_custo_ambiguo', idsFontes: ['a', 'b'] }));
  });

  it('preserva diagnósticos factuais e registra data inválida sem associá-la a competência inventada', () => {
    const invalid = op(1, 'data inválida', { criado_em: '2026-06-01T00:00:00Z' });
    const input = contexto({ ops: [invalid] });
    input.diagnosticos.opNaoVinculavel = [{ fonte: 'op', idFonte: 1, motivo: 'data_invalida' }];
    const result = analyzeOpCustoHistorico(input);
    expect(result.diagnosticos.leitura.opNaoVinculavel).toEqual(input.diagnosticos.opNaoVinculavel);
    expect(result.diagnosticos.composicao.opNaoVinculavel).toContainEqual(expect.objectContaining({ idFonte: 1, motivo: 'data_invalida' }));
    expect(result.competencias[0].op.eventos).toEqual([]);
  });

  it('é determinístico, não altera entrada congelada e não produz comparação, impacto, causalidade, recorrência ou score', () => {
    const input = contexto({ competencias: ['2026-06', '2026-07'], ops: [op(1, '2026-06-01')], custos: [custo('c1', '2026-07-01')] });
    const before = globalThis.structuredClone(input);
    const first = analyzeOpCustoHistorico(congelar(input));
    expect(analyzeOpCustoHistorico(input)).toEqual(first);
    expect(input).toEqual(before);
    expect(first).not.toHaveProperty('recorrencia');
    expect(first).not.toHaveProperty('causalidade');
    expect(first).not.toHaveProperty('impactoFinanceiro');
    expect(first).not.toHaveProperty('score');
    expect(first).not.toHaveProperty('prioridadeHistorica');
    expect(first.competencias.every(item => !Object.hasOwn(item, 'deltaMonetario') && !Object.hasOwn(item, 'deltaPercentual'))).toBe(true);
    expect(first.competencias.every(item => item.comparacaoHistorica.estado === 'nao_disponivel')).toBe(true);
  });
});
