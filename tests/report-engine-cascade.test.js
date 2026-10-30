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

  it.each(['hierarquia', 'dicionario'])('invalida vínculo alterado com a mesma cardinalidade em %s', source => {
    const masters = buildMasters();
    if (source === 'dicionario') {
      masters.dicionario = masters.hierarquia;
      masters.hierarquia = [];
    }
    const state = { origem: '10', familia: '20', agrupamento: 'TODOS' };
    const before = calculateCascadeOptions(state, masters);
    masters[source][0].agrupamento_cod = '31';
    const after = calculateCascadeOptions(state, masters);
    expect(after).not.toBe(before);
    expect(after.groupOptions).toEqual([{ value: '31', label: 'Agrup Y' }]);
  });

  it.each(['familias', 'agrupamentos', 'produtos'])('invalida rótulo alterado sem mudar o tamanho de %s', source => {
    const masters = buildMasters();
    const state = { origem: 'TODAS', familia: 'TODAS', agrupamento: 'TODOS' };
    const before = calculateCascadeOptions(state, masters);
    masters[source][0].descricao = 'Rótulo atualizado';
    const after = calculateCascadeOptions(state, masters);
    expect(after).not.toBe(before);
    const options = { familias: 'familyOptions', agrupamentos: 'groupOptions', produtos: 'productOptions' };
    expect(after[options[source]].some(o => o.label.includes('Rótulo atualizado'))).toBe(true);
  });

  it('reload com mesmo tamanho não reaproveita outra classificação; conteúdo idêntico reutiliza', () => {
    const masters = buildMasters();
    const state = { origem: '10', familia: '20', agrupamento: 'TODOS' };
    const before = calculateCascadeOptions(state, masters);
    expect(calculateCascadeOptions(state, globalThis.structuredClone(masters))).toBe(before);
    const reloaded = buildMasters();
    reloaded.hierarquia[0].familia_id = '21';
    expect(calculateCascadeOptions(state, reloaded).groupOptions).toEqual([]);
  });

  it('mesma descrição não mistura códigos; catálogo sem vínculo e código sem catálogo não viram opções', () => {
    const masters = buildMasters();
    masters.agrupamentos[1].descricao = masters.agrupamentos[0].descricao;
    masters.agrupamentos.push({ id: 'SEM_CUSTO', descricao: 'Sem fatos' });
    masters.hierarquia[2].agrupamento_cod = 'SEM_CATALOGO';
    const state = { origem: 'TODAS', familia: 'TODAS', agrupamento: 'TODOS' };
    expect(calculateCascadeOptions(state, masters).groupOptions).toEqual([
      { value: '30', label: 'Agrup X' }, { value: '31', label: 'Agrup X' }
    ]);
    expect(calculateCascadeOptions({ ...state, agrupamento: '31' }, masters).productOptions.map(o => o.value)).toEqual(['002']);
    expect(calculateCascadeOptions({ ...state, agrupamento: 'Agrup X' }, masters).productOptions).toEqual([]);
  });
});
