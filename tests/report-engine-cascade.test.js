import { describe, expect, it } from 'vitest';
import { calculateCascadeOptions } from '../core/report-engine.js';

/**
 * Contrato da cascata Origem → Família → Agrupamento → Produto.
 * Fixture mínimo com 3 produtos em 2 origens / 3 famílias / 3 agrupamentos.
 */
function buildMasters() {
  return {
    hierarquia: [
      { codigo_produto: '001', origem_id: '10', familia_id: '20', agrupamento_cod: '30' },
      { codigo_produto: '002', origem_id: '10', familia_id: '21', agrupamento_cod: '31' },
      { codigo_produto: '003', origem_id: '11', familia_id: '22', agrupamento_cod: '32' }
    ],
    familias: [
      { id: '20', descricao: 'Família A' },
      { id: '21', descricao: 'Família B' },
      { id: '22', descricao: 'Família C' }
    ],
    agrupamentos: [
      { id: '30', descricao: 'Agrup X' },
      { id: '31', descricao: 'Agrup Y' },
      { id: '32', descricao: 'Agrup Z' }
    ],
    produtos: [
      { codigo_produto: '001', descricao: 'Prod 1' },
      { codigo_produto: '002', descricao: 'Prod 2' },
      { codigo_produto: '003', descricao: 'Prod 3' }
    ]
  };
}

describe('calculateCascadeOptions — cascata de filtros', () => {
  it('sem filtro, lista todas as famílias/agrupamentos/produtos existentes', () => {
    const { familyOptions, groupOptions, productOptions } = calculateCascadeOptions(
      { origem: 'TODAS', familia: 'TODAS', agrupamento: 'TODOS' },
      buildMasters()
    );

    expect(familyOptions.map(o => o.label)).toEqual(['Família A', 'Família B', 'Família C']);
    expect(groupOptions.map(o => o.label)).toEqual(['Agrup X', 'Agrup Y', 'Agrup Z']);
    expect(productOptions.map(o => o.value)).toEqual(['001', '002', '003']);
  });

  it('ao escolher origem, restringe famílias e produtos à origem selecionada', () => {
    const { familyOptions, productOptions } = calculateCascadeOptions(
      { origem: '10', familia: 'TODAS', agrupamento: 'TODOS' },
      buildMasters()
    );

    // Origem 10 tem apenas as famílias 20 e 21 (produtos 001 e 002).
    expect(familyOptions.map(o => o.label)).toEqual(['Família A', 'Família B']);
    expect(productOptions.map(o => o.value)).toEqual(['001', '002']);
  });

  it('ao escolher família, restringe agrupamentos e produtos à família selecionada', () => {
    const { groupOptions, productOptions } = calculateCascadeOptions(
      { origem: '10', familia: '20', agrupamento: 'TODOS' },
      buildMasters()
    );

    expect(groupOptions.map(o => o.label)).toEqual(['Agrup X']);
    expect(productOptions.map(o => o.value)).toEqual(['001']);
  });

  it('memoiza (PERF-03): mesma entrada retorna a mesma referência', () => {
    const masters = buildMasters();
    const state = { origem: 'TODAS', familia: 'TODAS', agrupamento: 'TODOS' };
    expect(calculateCascadeOptions(state, masters)).toBe(calculateCascadeOptions(state, masters));
  });
});
