import { createRequire } from 'node:module';

// Mesmo suporte de codepages do xlsx.full do frontend. Dados exclusivamente sintéticos.
export const SheetJS = createRequire(import.meta.url)('xlsx');
export const contexto = {
  produtos: [
    { codigo_produto: '001', descricao: 'Descrição anterior', origem_cod: '01', familia_cod: 'F1', agrupamento_erp_valor: 'P005' },
    { codigo_produto: '002', descricao: 'Preservar descrição', origem_cod: '01', familia_cod: 'F1', agrupamento_erp_valor: 'P302' },
    ...['003', '004', '005', '006', '009'].map(codigo_produto => ({ codigo_produto, descricao: 'Preservar produto', origem_cod: '01', familia_cod: 'F1', agrupamento_erp_valor: 'P005' })),
    { codigo_produto: '008', descricao: 'Sem alteração', origem_cod: '01', familia_cod: 'F1', agrupamento_erp_valor: 'P005' }
  ],
  origens: [{ id: 'o', codigo: '01', descricao: 'Produzido' }],
  familias: [{ id: 'f', codigo: 'F1', descricao: 'Família teste' }]
};

export function arquivoCadastro(bookType = 'xls', extension = bookType) {
  const workbook = SheetJS.utils.book_new();
  const sheet = SheetJS.utils.aoa_to_sheet([
    ['Relatório ERP sintético'], [],
    ['Produto', 'Descrição', 'Tipo', 'Descr. (Origem)', 'Origem', 'Família', 'Agrup. Prod.', 'Agrup. Est.', 'Extra'],
    [1, 'Descrição atualizada çã', ' P ', 'Produzido', 1, 'F1', 'P801', 'E999', 'ignorar'],
    ['002', '', 'P', 'PRODUZIDO', '', '', '', 'E999'],
    ['003', 'Produto D', 'D', 'Produzido', '01', 'F1', 'P801'],
    ['004', 'Origem excluída', 'C', 'Comprado', '01', 'F1', 'P801'],
    ['005', 'Produto INATIVO', 'P', 'Produzido', '01', 'F1', 'P801'],
    ['006', 'Produto EXLUIR', 'C', 'Revenda', '01', 'F1', 'P801'],
    ['1e3', 'Novo revenda', ' c ', 'Revenda nacional', '01', 'F1', 'P302'],
    ['008', 'Sem alteração', 'P', 'Produzido', '01', 'F1', 'P005']
  ]);
  sheet.A4.z = '000';
  sheet.E4.z = '00';
  SheetJS.utils.book_append_sheet(workbook, sheet, 'Cadastro');
  const bytes = SheetJS.write(workbook, { type: 'array', bookType });
  return { name: `cadastro.${extension}`, arrayBuffer: async () => bytes };
}
