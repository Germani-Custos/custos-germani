import { describe, expect, it } from 'vitest';
import { analyzeOpInvestigation } from '../core/op-investigation-engine.js';
import { toInvestigationResult, buildInvestigationResults } from '../core/investigation-contract.js';

const OP_738 = Object.freeze({
  op: 738,
  cod_produto: '1001051',
  descricao: 'Produto teste 738',
  data_referencia: '2026-06',
  criado_em: '2026-07-01',
  qtd_prevista: 2800,
  qtd_produzida: 2992,
  tempo_previsto: 1197.01,
  tempo_real: 749,
  kg_hora_previsto: 899.84,
  kg_hora_real: 1438.08,
  perc_tempo: 59.81,
  tempo_parada: 105
});

const OP_752 = Object.freeze({
  op: 752,
  cod_produto: '1001058',
  data_referencia: '2026-06',
  qtd_prevista: 1000,
  qtd_produzida: 1229,
  tempo_previsto: 368.7,
  tempo_real: 912,
  kg_hora_previsto: 1600,
  kg_hora_real: 646.84,
  perc_tempo: -59.57,
  tempo_parada: 14
});

describe('contrato InvestigationResult (camada de adaptação)', () => {
  it('não recalcula nada: espelha exatamente os indicadores já produzidos pelo motor', () => {
    const analyzed = analyzeOpInvestigation(OP_738);
    const result = toInvestigationResult(analyzed);

    expect(result.indicadores).toEqual(analyzed.indicadoresKustos);
    expect(result.conferenciaErp).toEqual(analyzed.conferenciaErp);
    expect(result.resumo).toBe(analyzed.classificacaoInvestigativa.resumo);
    expect(result.causaProvavel).toBe(analyzed.classificacaoInvestigativa.causaProvavel);
    expect(result.magnitude).toBe(analyzed.classificacaoInvestigativa.magnitude);
    expect(result.evidencias).toEqual(analyzed.classificacaoInvestigativa.evidencias);
  });

  it('normaliza fatos do ERP para nomes estáveis em camelCase, sem alterar valores', () => {
    const result = toInvestigationResult(analyzeOpInvestigation(OP_738));

    expect(result.fatos).toMatchObject({
      op: 738,
      codProduto: '1001051',
      descricao: 'Produto teste 738',
      dataReferencia: '2026-06',
      criadoEm: '2026-07-01',
      qtdPrevista: 2800,
      qtdProduzida: 2992,
      tempoParada: 105
    });
  });

  it('expõe classificação e decisão como sub-objetos estáveis, não como texto acoplado', () => {
    const result = toInvestigationResult(analyzeOpInvestigation(OP_738));

    expect(result.classificacao.chave).toBe('alta_eficiencia');
    expect(result.decisao).toMatchObject({
      chave: 'nenhuma',
      requerInvestigacao: false
    });
  });

  it('gera uma chave estável combinando op, produto e competência', () => {
    const result = toInvestigationResult(analyzeOpInvestigation(OP_738));
    expect(result.chave).toBe('738::1001051::2026-06');
  });

  it('buildInvestigationResults preserva a ordenação de buildOpInvestigationQueue', () => {
    const results = buildInvestigationResults([OP_738, OP_752]);
    expect(results).toHaveLength(2);
    expect(results.every(r => typeof r.chave === 'string')).toBe(true);
    expect(results.every(r => Array.isArray(r.evidencias))).toBe(true);
  });

  it('nunca lança quando faltam fatos previstos (linha sem base comparativa)', () => {
    const analyzed = analyzeOpInvestigation({ op: 900, cod_produto: 'X' });
    const result = toInvestigationResult(analyzed);
    expect(result.classificacao.chave).toBe('sem_base_comparativa');
    expect(result.indicadores.desvioTempoPct).toBeNull();
  });
});
