import { describe, expect, it } from 'vitest';
import { listarProdutosSemCadastro } from '../core/product-master-engine.js';

describe('Produtos sem cadastro — identidade por código, sem escrita ou inferência', () => {
  it('lista vazia sem linhas ou com todos os códigos cadastrados, mesmo sem classificação', () => {
    expect(listarProdutosSemCadastro([], [])).toEqual([]);
    expect(listarProdutosSemCadastro([{ codigo_produto: '001', descricao: 'Arquivo' }], [{ codigo_produto: '001' }])).toEqual([]);
  });
  it('um ausente conserva código e rótulo original, não a descrição de outro código', () => {
    expect(listarProdutosSemCadastro([{ codigo_produto: '002', descricao: '  Original  ' }], [{ codigo_produto: '001', descricao: '  Original  ' }]))
      .toEqual([{ codigo_produto: '002', descricao: '  Original  ' }]);
  });
  it('normaliza e deduplica todas as ocorrências; usa primeira descrição disponível sem inventar', () => {
    expect(listarProdutosSemCadastro([
      { codigo_produto: '1e3', descricao: null }, { codigo_produto: '1000', descricao: 'Do arquivo' },
      { codigo_produto: ' 1000 ', descricao: 'Outro rótulo' }, { codigo_produto: '2000', descricao: '   ' },
      { codigo_produto: '', descricao: 'Sem código' }
    ], [])).toEqual([{ codigo_produto: '1000', descricao: 'Do arquivo' }, { codigo_produto: '2000', descricao: null }]);
  });
  it('não corta a lista em 20/500/1.000 e não modifica arquivo nem cadastro', () => {
    const rows = Array.from({ length: 1205 }, (_, i) => ({ codigo_produto: String(10000 + i), descricao: `Produto ${i}` }));
    const produtos = [{ ...rows[0], origem_id: null }];
    const before = JSON.stringify({ rows, produtos });
    const result = listarProdutosSemCadastro(rows, produtos);
    expect(result).toHaveLength(1204);
    expect(result.at(-1)).toEqual(rows.at(-1));
    expect(new Set(result.map(row => row.codigo_produto)).size).toBe(result.length);
    expect(JSON.stringify({ rows, produtos })).toBe(before);
  });
});
