import { SheetJS } from './cadastro-mestre-arquivo.js';

export const campoComercial = 'agrupamento_comercial_erp_cod';
export const descricaoComercial = 'agrupamento_comercial_erp_descricao';
export const linhasComerciais = [
  ['001', 'Produto A', 'P', 'Produzido', '01', 'F1', 'P005', 'C006', 'BISCOITO ESPECIAL'],
  ['002', 'Produto B', 'P', 'Produzido', '01', 'F1', 'P302', '', ''],
  ['2000', 'Produto novo sem comercial', 'C', 'Revenda', '01', 'F1', '', '', '']
];
export function arquivoComercial(formato = 'xls', linhas = linhasComerciais) {
  const wb = SheetJS.utils.book_new();
  const ws = SheetJS.utils.aoa_to_sheet([
    ['Produto', 'Descrição', 'Tipo', 'Descr. (Origem)', 'Origem', 'Família', 'Agrup. Prod.', 'Agrup. Com.', 'Descrição (Agrup. Com.)', 'Agrup. Est.', 'Agrup. Custos', 'Agrup. Fiscal'],
    ...linhas.map(r => [...r, 'E999', 'K999', 'F999'])
  ]);
  SheetJS.utils.book_append_sheet(wb, ws, 'Cadastro');
  const bytes = SheetJS.write(wb, { type: 'array', bookType: formato });
  return { name: `comercial.${formato}`, arrayBuffer: async () => bytes };
}
