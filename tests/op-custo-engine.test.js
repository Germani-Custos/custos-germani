import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { analyzeOpCustoContext, getOpCustoPeriod } from '../core/op-custo-engine.js';
import { analyzeOpInvestigation } from '../core/op-investigation-engine.js';
import { toInvestigationResult } from '../core/investigation-contract.js';

function op(patch = {}) {
  return { id: 1, op: 738, cod_produto: '1001', descricao: 'Descrição OP', data_referencia: '2026-10-05',
    criado_em: '2026-11-01T10:00:00Z', cod_estagio: '01', estagio: 'MASSA', unidade: 'CX', origem: 0,
    log_importacao_op_id: 7, qtd_prevista: 100, qtd_produzida: 80, qtd_apontamentos: 2,
    tempo_previsto: 10, tempo_real: 30, tempo_parada: 20, kg_hora_previsto: 100, kg_hora_real: 50, ...patch };
}
function snapshots(codigo = '1001', anterior = 100, atual = 110) {
  return [{ id: 'c1', codigo_produto: codigo, descricao: 'Descrição Custo', data_referencia: '2026-10-05',
    criado_em: '2026-10-10T10:00:00Z', custo_variavel: 70, custo_direto_fixo: 30, custo_total: anterior },
  { id: 'c2', codigo_produto: codigo, descricao: 'Outra descrição', data_referencia: '2026-10-14',
    criado_em: '2026-11-10T10:00:00Z', custo_variavel: 80, custo_direto_fixo: 30, custo_total: atual }];
}
function entrada(ops = [op()], custos = snapshots(), patch = {}) {
  const meta = rows => ({ estado: rows.length ? 'completa' : 'completa_vazia', contagem: rows.length });
  const codigos = [...new Set(custos.map(r => r.codigo_produto))];
  return { contexto: { competencia: '2026-10', opEventos: ops, custoSnapshots: custos,
    fontes: { op: meta(ops), custos: meta(custos) }, leitura: { idLocal: 'teste', consistencia: 'nao_transacional' } },
  analisesOp: ops.map((r, posicaoOriginal) => ({ idFonte: r.id, posicaoOriginal, resultadoOriginal: toInvestigationResult(analyzeOpInvestigation(r)) })),
  analisesCusto: codigos.map(codigo => {
    const rows = custos.filter(r => r.codigo_produto === codigo).slice().sort((a, b) => b.criado_em.localeCompare(a.criado_em));
    const variacaoTemporal = rows[1] && rows[1].custo_total > 0 ? (rows[0].custo_total - rows[1].custo_total) / rows[1].custo_total * 100 : null;
    return { codigoNormalizado: codigo, resultadoOriginal: { codigo, ultimoCusto: rows[0].custo_total,
      penultimoCusto: rows[1]?.custo_total ?? null, variacaoTemporal },
    alerta: { isAlert: variacaoTemporal !== null && Math.abs(variacaoTemporal) >= 5, percentual: variacaoTemporal },
    prioridadeOriginal: { label: 'Prioridade custo recebida' } };
  }), ...patch };
}
function rodar(input) { return analyzeOpCustoContext(input); }
function primeiro(input = entrada()) { return rodar(input).produtos[0]; }
function congelar(value) {
  if (value && typeof value === 'object') { Object.freeze(value); Object.values(value).forEach(congelar); }
  return value;
}

describe('OP × CUSTO — engine puro e identidade', () => {
  it('carrega sem DOM, ambiente, API ou configuração e não altera entradas', () => {
    const url = new URL('../core/op-custo-engine.js', import.meta.url);
    const source = readFileSync(url, 'utf8');
    expect(source.match(/^import .*$/gm)).toEqual(["import { normalizeCodigoProduto } from './spreadsheet-engine.js';"]);
    expect(() => execFileSync(process.execPath, ['--input-type=module', '-e', `await import(${JSON.stringify(url.href)})`], { env: {} })).not.toThrow();
    const input = entrada();
    const before = globalThis.structuredClone(input);
    const first = rodar(congelar(input));
    expect(rodar(input)).toEqual(first);
    expect(input).toEqual(before);
  });
  it('reutiliza normalização, relaciona descrições diferentes e preserva zeros', () => {
    const result = rodar(entrada([op({ cod_produto: ' 001001\u200B ' })], snapshots('001001')));
    expect(result.cobertura).toEqual({ ambos: 1, somenteOp: 0, somenteCusto: 0 });
    expect(result.produtos[0].chave).toEqual({ codigoNormalizado: '001001', competencia: '2026-10' });
    const distintos = rodar(entrada([op({ cod_produto: '001001' })], snapshots('1001')));
    expect(distintos.produtos.map(p => p.cobertura)).toEqual(['B', 'C']);
  });
  it.each(['', null, undefined, '-12', '12.5'])('não vincula código inválido %s', codigo => {
    const result = rodar(entrada([op({ cod_produto: codigo })], []));
    expect(result.produtos).toEqual([]);
    expect(result.diagnosticos.opNaoVinculavel).toHaveLength(1);
  });
  it('sinaliza colisão conflitante sem eliminar snapshots ou escolher vencedor', () => {
    const costs = snapshots('1.001');
    costs[1].codigo_produto = '1001';
    costs[1].data_referencia = costs[0].data_referencia;
    const input = entrada([op()], costs);
    input.analisesCusto = [{ ...input.analisesCusto[0], codigoNormalizado: '1001' }];
    const result = rodar(input);
    expect(result.diagnosticos.inconsistencias).toHaveLength(1);
    expect(result.produtos[0].custo.snapshots).toHaveLength(2);
    expect(result.produtos[0].relacao.tipo).toBe('inconclusivo');
  });
  it('não confunde variação legítima entre datas diferentes com colisão', () => {
    const costs = snapshots('1.001'); costs[1].codigo_produto = '1001';
    const input = entrada([op()], costs);
    input.analisesCusto = [{ ...input.analisesCusto[0], codigoNormalizado: '1001' }];
    expect(rodar(input).diagnosticos.inconsistencias).toEqual([]);
  });
  it('múltiplos estágios/reimports conservam ID, proveniência, resultados e contagens', () => {
    const ops = [op(), op({ id: 2, cod_estagio: '02', estagio: 'FORNO', log_importacao_op_id: 8 }), op({ id: 3 })];
    const input = entrada(ops);
    const result = primeiro(input);
    expect(result.op.eventos.map(e => e.idFonte)).toEqual([1, 2, 3]);
    expect(result.op.eventos.map(e => e.fatoOriginal)).toEqual(ops);
    expect(result.op.eventos.map(e => e.resultadoOriginal)).toEqual(input.analisesOp.map(a => a.resultadoOriginal));
    expect(result.op.contagens).toEqual({ eventos: 3, numerosOpDistintosObservados: 1 });
    expect(result.op.consolidacao).toMatchObject({ estado: 'nao_disponivel', valores: null });
    expect(result.op.distribuicao).toEqual({ paradas_operacionais: 3 });
    expect(result.op.distribuicaoDecisoes).toEqual({ [input.analisesOp[0].resultadoOriginal.decisao.chave]: 3 });
    expect(result.op.possiveisReimports).toHaveLength(1);
    expect(result.op.possiveisReimports[0].ids).toEqual([1, 3]);
    expect(result.op.prioridadeOriginalObservada.rotulo).toBe('Maior prioridade OP observada');
    expect(result.custo.prioridadeOriginal).toEqual(input.analisesCusto[0].prioridadeOriginal);
    expect(result).not.toHaveProperty('scoreGlobal');
    expect(result).not.toHaveProperty('prioridadeGlobal');
  });
  it('associa por ID mesmo com análises invertidas e chave legada igual', () => {
    const input = entrada([op(), op({ id: 2, cod_estagio: '02', qtd_produzida: 200 })]);
    input.analisesOp.reverse();
    const result = primeiro(input);
    expect(result.op.eventos[0].resultadoOriginal.fatos.qtdProduzida).toBe(80);
    expect(result.op.eventos[1].resultadoOriginal.fatos.qtdProduzida).toBe(200);
    input.analisesOp.pop();
    expect(() => rodar(input)).toThrow('sem análise correspondente');
  });
  it('recusa ID repetido e adaptação duplicada/associada a outro produto', () => {
    expect(() => rodar(entrada([op(), op()]))).toThrow('ID técnico repetido');
    const input = entrada(); input.analisesOp.push(input.analisesOp[0]);
    expect(() => rodar(input)).toThrow('repetida na adaptação');
    const errado = entrada(); errado.analisesOp[0].resultadoOriginal.fatos.codProduto = 'outro';
    expect(() => rodar(errado)).toThrow('não corresponde');
  });
});

describe('OP × CUSTO — tempo, cobertura e qualidade', () => {
  it('A/B/C e D somente por consulta explícita; nenhum lado ausente vira zero', () => {
    const input = entrada([op(), op({ id: 2, cod_produto: '2001' })], [...snapshots(), ...snapshots('3001').map(r => ({ ...r, id: `${r.id}-b` }))]);
    const result = rodar(input);
    expect(result.cobertura).toEqual({ ambos: 1, somenteOp: 1, somenteCusto: 1 });
    expect(result.produtos.map(p => p.cobertura)).toEqual(['A', 'B', 'C']);
    expect(result.produtos[1].custo).toBeNull();
    expect(result.produtos[2].op).toBeNull();
    expect(rodar({ ...input, produtoSolicitado: '4001' }).produtos.at(-1)).toMatchObject({ cobertura: 'D', op: null, custo: null });
    expect(result.produtos).toHaveLength(3);
  });
  it('fonte vazia permite cobertura zero; indisponível/incompleta impede A/B/C', () => {
    expect(rodar(entrada([], [])).cobertura).toEqual({ ambos: 0, somenteOp: 0, somenteCusto: 0 });
    const input = entrada(); input.contexto.fontes.custos.estado = 'indisponivel';
    expect(rodar(input)).toMatchObject({ estado: 'indisponivel', cobertura: null, produtos: [], qualidade: { completa: false } });
    input.contexto.fontes.custos.estado = 'completa'; input.contexto.fontes.custos.contagem = 3;
    expect(rodar(input).cobertura).toBeNull();
  });
  it('mês inclui 05/10 e 14/10 mesmo importados em novembro; fora do mês é diagnóstico', () => {
    const input = entrada([op(), op({ id: 2, data_referencia: '2026-10-14' })], snapshots());
    input.contexto.custoSnapshots.push({ ...snapshots()[1], id: 'fora', data_referencia: '2026-11-01', criado_em: '2026-12-01T00:00:00Z' });
    input.contexto.fontes.custos.contagem++;
    const result = rodar(input);
    expect(result.produtos[0].custo.referencia.idsCandidatos).toEqual(['c2']);
    expect(result.produtos[0].op.eventos.map(e => e.fatoOriginal.data_referencia)).toEqual(['2026-10-05', '2026-10-14']);
    expect(result.diagnosticos.foraCompetencia).toHaveLength(1);
  });
  it.each([['2024-02', '2024-02-29'], ['2026-02', '2026-02-28'], ['2026-12', '2026-12-31']])('limites civis %s', (mes, fim) => {
    expect(getOpCustoPeriod(mes)).toEqual({ inicio: `${mes}-01`, fimInclusivo: fim });
  });
  it.each(['2026-13', '2026-00', '2026-1', '0000-01', null, ['2026-09', '2026-10']])('rejeita competência inválida/multi-mês %s', mes => {
    expect(() => getOpCustoPeriod(mes)).toThrow();
  });
  it('mantém métrica ausente em A e não soma quantidades/tempo/taxas/percentuais', () => {
    const input = entrada([op({ tempo_real: null }), op({ id: 2 })]);
    const result = primeiro(input);
    expect(result.cobertura).toBe('A');
    expect(result.op.eventos[0].fatoOriginal.tempo_real).toBeNull();
    expect(result.op.consolidacao.valores).toBeNull();
    expect(result.relacao.tipo).toBe('inconclusivo');
  });
});

describe('OP × CUSTO — snapshots e relações', () => {
  it('conserva snapshots e valores dos três componentes, sem somá-los', () => {
    const produto = primeiro();
    expect(produto.custo.snapshots.map(s => s.idFonte)).toEqual(['c2', 'c1']);
    expect(produto.custo.referencia.valores).toEqual({ variavel: 80, fixoDireto: 30, total: 110 });
    expect(produto.custo.comparacao).toMatchObject({ estado: 'disponivel', deltaMonetario: 10, deltaPercentual: 10 });
  });
  it.each([true, false])('empate de timestamp %s: não escolhe recência pelo ID', conflito => {
    const costs = snapshots(); costs[1].criado_em = costs[0].criado_em;
    if (!conflito) Object.assign(costs[1], { custo_total: 100, custo_variavel: 70 });
    const result = primeiro(entrada([op()], costs));
    expect(result.custo.referencia.estado).toBe(conflito ? 'ambigua' : 'valor_comum_empatado');
    expect(result.custo.referencia.idsCandidatos).toEqual(['c1', 'c2']);
    expect(result.custo.comparacao.estado).toBe('ambigua');
    expect(result.relacao.tipo).toBe('inconclusivo');
  });
  it('não troca base por timestamp distinto anterior quando há empate na base', () => {
    const costs = snapshots(); costs.push({ ...costs[0], id: 'c3', custo_total: 90 });
    const result = primeiro(entrada([op()], costs));
    expect(result.custo.comparacao.estado).toBe('ambigua');
  });
  it('preserva precisão de microssegundos sem fabricar empate', () => {
    const costs = snapshots();
    costs[0].criado_em = '2026-10-10T10:00:00.123001Z';
    costs[1].criado_em = '2026-10-10T10:00:00.123002Z';
    const result = primeiro(entrada([op()], costs));
    expect(result.custo.referencia).toMatchObject({ estado: 'disponivel', idsCandidatos: ['c2'] });
    expect(result.custo.comparacao.estado).toBe('disponivel');
  });
  it('timestamps com fusos distintos do mesmo instante são empate verdadeiro', () => {
    const costs = snapshots();
    costs[0].criado_em = '2026-10-10T10:00:00.123001Z';
    costs[1].criado_em = '2026-10-10T13:00:00.123001+03:00';
    const result = primeiro(entrada([op()], costs));
    expect(result.custo.referencia.estado).toBe('ambigua');
    expect(result.relacao.tipo).toBe('inconclusivo');
  });
  it('snapshot único e timestamp inválido não geram comparação numérica fictícia', () => {
    const unique = primeiro(entrada([op()], snapshots().slice(0, 1)));
    expect(unique.custo.comparacao).toMatchObject({ estado: 'sem_base', deltaMonetario: null, deltaPercentual: null });
    const costs = snapshots(); costs[0].criado_em = 'inválido';
    expect(primeiro(entrada([op()], costs)).custo.referencia.estado).toBe('invalida');
  });
  it('zero real permanece zero; denominador zero não vira percentual zero', () => {
    const atualZero = primeiro(entrada([op()], snapshots('1001', 100, 0)));
    expect(atualZero.custo.referencia.valores.total).toBe(0);
    expect(atualZero.custo.comparacao.deltaPercentual).toBe(-100);
    const baseZero = primeiro(entrada([op()], snapshots('1001', 0, 100)));
    expect(baseZero.custo.comparacao).toMatchObject({ estado: 'denominador_invalido', deltaMonetario: 100, deltaPercentual: null });
    expect(baseZero.relacao.tipo).toBe('inconclusivo');
  });
  it.each([null, '', undefined, NaN])('custo total ausente/inválido %s não vira zero', valor => {
    const costs = snapshots(); costs[1].custo_total = valor;
    const result = primeiro(entrada([op()], costs));
    expect(result.custo.referencia.valores.total).toBeNull();
    expect(result.custo.comparacao.deltaPercentual).toBeNull();
    expect(result.relacao.tipo).toBe('inconclusivo');
  });
  const favoravel = { qtd_produzida: 110, tempo_real: 5, tempo_parada: 0, kg_hora_real: 200 };
  const neutro = { qtd_produzida: 100, tempo_real: 10, tempo_parada: 3, kg_hora_real: 100 };
  it.each([
    [{}, 110, 'temporalmente_compativel'], [{}, 102, 'sem_confirmacao_por_custo'],
    [neutro, 110, 'sinal_de_custo_sem_correspondencia_operacional'],
    [favoravel, 110, 'sinais_divergentes'], [{}, 90, 'sinais_divergentes'],
    [favoravel, 90, 'evidencia_temporalmente_compativel_favoravel'],
    [{ qtd_prevista: 0 }, 110, 'inconclusivo'], [favoravel, 102, 'sem_relacao_definida_v1']
  ])('taxonomia %s / %s → %s', (patch, valor, tipo) => {
    const product = primeiro(entrada([op(patch)], snapshots('1001', 100, valor)));
    expect(product.relacao.tipo).toBe(tipo);
    expect(product.relacao.motivos.length).toBeGreaterThan(0);
    expect(product.relacao.evidencias[0]).toMatchObject({ idsOp: [1], idsReferenciaCusto: ['c2'], idsBaseCusto: ['c1'] });
    expect(JSON.stringify(product.relacao)).not.toMatch(/causou|provocou|OP ocorreu antes|segunda alta/i);
  });
  it('sinais favoráveis e desfavoráveis coexistem sem nova prioridade mensal', () => {
    const result = primeiro(entrada([op(), op({ id: 2, ...favoravel })]));
    expect(result.op.presenca).toMatchObject({ favoraveis: true, desfavoraveis: true });
    expect(result.op.sinalRelacional).toBe('heterogeneo');
    expect(result.relacao.tipo).toBe('inconclusivo');
    expect(result.relacao.motivos.some(m => m.includes('favoráveis e desfavoráveis'))).toBe(true);
  });
  it('preserva sinal misto como heterogêneo, sem rotulá-lo normal ou sem base', () => {
    const result = primeiro(entrada([op({ qtd_produzida: 100, tempo_real: 11, tempo_parada: 0, kg_hora_real: 95 })]));
    expect(result.op.presenca).toMatchObject({ mistos: true, semBase: false });
    expect(result.op.sinalRelacional).toBe('heterogeneo');
    expect(result.relacao.tipo).toBe('inconclusivo');
    expect(result.relacao.motivos.some(m => m.includes('identificou sinal misto'))).toBe(true);
  });
  it('flag/resultados de custo incompatíveis impedem conclusão sem modificar a saída recebida', () => {
    const input = entrada();
    input.analisesCusto[0].alerta.percentual = 30;
    const result = primeiro(input);
    expect(result.custo.comparacao.estado).toBe('invalida');
    expect(result.custo.resultadoOriginal).toEqual(input.analisesCusto[0].resultadoOriginal);
    expect(result.relacao.tipo).toBe('inconclusivo');
  });
});
