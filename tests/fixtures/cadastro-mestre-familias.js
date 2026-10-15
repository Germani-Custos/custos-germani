import { arquivoCadastro, SheetJS } from './cadastro-mestre-arquivo.js';

// BIFF/XLSX/XLSM sintéticos; F é identidade, J é o rótulo da família.
export async function arquivoFamilias(formato = 'xls') {
  const wb = SheetJS.read(await arquivoCadastro(formato).arrayBuffer(), { type: 'array', cellNF: true });
  const s = wb.Sheets.Cadastro;
  s.J3 = { t: 's', v: 'Descr. (Família)' };
  s.J4 = { t: 's', v: 'Família atualizada' };
  s.F6 = { t: 's', v: 'FORA' };
  s.J6 = { t: 's', v: 'Somente excluída' };
  s.F10 = { t: 'n', v: 2, z: '0000' };
  s.J10 = { t: 's', v: 'Mesmo rótulo' };
  s.F11 = { t: 's', v: 'F3' };
  s.J11 = { t: 's', v: 'Mesmo rótulo' };
  s['!ref'] = 'A1:J11';
  const bytes = SheetJS.write(wb, { type: 'array', bookType: formato });
  return { name: `familias.${formato}`, arrayBuffer: async () => bytes };
}
