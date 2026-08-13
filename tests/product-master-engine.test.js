import { describe, expect, it } from 'vitest';
import { buildProductMasterPayload, createProductMasterIndex, getProductClassificationStatus, reconcileProductMasterImport, resolveProductClassification } from '../core/product-master-engine.js';

const masters = {
  produtos: [{ codigo_produto: '001', descricao: 'Anterior', origem_id: 'o1', familia_id: 'f1', agrupamento_cod: 'AG-1' }],
  origens: [{ id: 'o1', codigo: 'ORI1', descricao: 'Origem 1' }, { id: 'o2', codigo: 'ORI2', descricao: 'Origem 2' }],
  familias: [{ id: 'f1', codigo: 'FAM1', descricao: 'Família 1' }, { id: 'f2', codigo: 'FAM2', descricao: 'Família 2' }]
};

describe('cadastro mestre de produtos', () => {
  const index = createProductMasterIndex(masters.produtos);

  it('resolve a mesma classificação para Custos e OP pelo código normalizado', () => {
    expect(resolveProductClassification({ codigo_produto: '001' }, index).produto).toMatchObject({ origem_id: 'o1', familia_id: 'f1' });
    expect(resolveProductClassification({ cod_produto: ' 001 ' }, index).produto).toMatchObject({ origem_id: 'o1', familia_id: 'f1' });
  });

  it('não inventa classificação para produto ausente', () => {
    expect(resolveProductClassification({ cod_produto: '999' }, index)).toMatchObject({ status: 'ausente', produto: null });
  });

  it('identifica produto existente com classificação incompleta', () => {
    expect(getProductClassificationStatus({ codigo_produto: '002', origem_id: 'o1', familia_id: null })).toBe('sem_classificacao');
  });

  it('inclui produto novo do XLSM sem criar fonte paralela', () => {
    const result = reconcileProductMasterImport([{ Produto: '002', Descrição: 'Novo', Origem: 'Origem 2', Família: 'Família 2' }], masters);
    expect(result.rows).toEqual([expect.objectContaining({ codigo_produto: '002', descricao: 'Novo', origem_id: 'o2', familia_id: 'f2' })]);
  });

  it('sobrescreve somente campos ERP com valor no XLSM e preserva agrupamento Kustos', () => {
    const result = reconcileProductMasterImport([{ Produto: '001', Descrição: 'Oficial', Origem: 'ORI2', Família: 'FAM2' }], masters);
    expect(result.rows[0]).toMatchObject({ descricao: 'Oficial', origem_id: 'o2', familia_id: 'f2', agrupamento_cod: 'AG-1' });
  });

  it('não apaga valor existente quando o XLSM traz campos vazios', () => {
    const result = reconcileProductMasterImport([{ Produto: '001', Descrição: '', Origem: '', Família: '' }], masters);
    expect(result.rows[0]).toMatchObject(masters.produtos[0]);
  });

  it('não remove produto que não aparece no XLSM', () => {
    const result = reconcileProductMasterImport([{ Produto: '002', Descrição: 'Novo' }], masters);
    expect(result.rows).toHaveLength(1);
    expect(masters.produtos[0]).toMatchObject({ codigo_produto: '001' });
  });

  it('registra categoria do XLSM desconhecida sem substituir a classificação atual', () => {
    const result = reconcileProductMasterImport([{ Produto: '001', Origem: 'Não cadastrada' }], masters);
    expect(result.unresolvedCategories).toHaveLength(1);
    expect(result.rows[0].origem_id).toBe('o1');
  });

  it('prepara o cadastro manual com agrupamento investigativo opcional', () => {
    expect(buildProductMasterPayload({ codigo_produto: ' 003 ', descricao: 'Manual', agrupamento_cod: 'AG-1' }))
      .toEqual({ codigo_produto: '003', descricao: 'Manual', agrupamento_cod: 'AG-1' });
  });
});
