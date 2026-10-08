// @ts-check
/* Adaptador de arquivo + leitura do contexto. Nenhum método de escrita. */
import { criarPreviewCadastroMestre } from '../../core/cadastro-mestre-preview-engine.js';
import { criarManifestoCadastroMestre, criarRevisaoCadastroMestre, serializarDeterministico } from '../../core/cadastro-mestre-approval-engine.js';

const ALIASES = {
  codigo_produto: ['produto', 'codigo produto', 'cod produto', 'codigo', 'cod'],
  descricao: ['descricao', 'descr', 'desc', 'descricao produto', 'descr produto'],
  tipo: ['tipo', 'tipo produto'],
  descr_origem: ['descr origem', 'descricao origem'],
  origem_cod: ['origem', 'origem cod', 'codigo origem', 'cod origem'],
  familia_cod: ['familia', 'familia cod', 'codigo familia', 'cod familia'],
  // Decisão de negócio Fase 3.3: alias explícito, nunca equivalência Pxxx → Mxxx.
  agrupamento_erp_valor: ['agrupamento', 'agrupamento erp', 'agrupamento erp valor', 'agrup prod']
};
const OBRIGATORIOS = ['codigo_produto', 'descricao', 'tipo', 'descr_origem'];
const normalizarCabecalho = value => String(value ?? '').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Cabeçalho por aliases explícitos, sem fuzzy; títulos anteriores são ignorados. */
export function mapearPlanilhaCadastroMestre(matriz) {
  let columns = null;
  let headerIndex = -1;
  for (let index = 0; index < matriz.length; index++) {
    const headers = matriz[index].map(normalizarCabecalho);
    const matches = Object.fromEntries(Object.entries(ALIASES).map(([field, aliases]) => [
      field, headers.flatMap((header, col) => aliases.includes(header) ? [col] : [])
    ]));
    if (!OBRIGATORIOS.every(field => matches[field].length)) continue;
    if (Object.values(matches).some(values => values.length > 1)) throw new Error('Cabeçalho ambíguo no Cadastro Mestre.');
    columns = Object.fromEntries(Object.entries(matches).filter(([, values]) => values.length).map(([field, values]) => [field, values[0]]));
    headerIndex = index;
    break;
  }
  if (!columns) throw new Error('Cabeçalho obrigatório ausente: Produto, Descrição, Tipo e Descr(Origem).');
  const rows = matriz.slice(headerIndex + 1).flatMap((cells, index) => {
    if (cells.every(value => value === null || value === undefined || String(value).trim() === '')) return [];
    return [{ linha: headerIndex + index + 2, ...Object.fromEntries(Object.entries(columns).map(([field, col]) => [field, cells[col] ?? null])) }];
  });
  return { linhas: rows, colunas: columns, linha_cabecalho: headerIndex + 1 };
}

/**
 * Usa o SheetJS já fornecido pelo runtime; aceita injeção para testes.
 * Nunca avalia fórmula, macro ou link externo. Primeira aba por padrão; pode ser explícita.
 * @param {{name: string, arrayBuffer: () => Promise<ArrayBuffer>}} arquivo
 * @param {{read: Function, utils: {sheet_to_json: Function, encode_cell: Function, decode_range: Function}}} leitor
 * @param {string} [nomeAba]
 */
export async function lerArquivoCadastroMestre(arquivo, leitor, nomeAba) {
  if (!/\.(xlsm|xlsx|xls)$/i.test(arquivo?.name || '')) throw new Error('Formato permitido: XLSM, XLSX ou XLS.');
  if (!leitor?.read || !leitor?.utils) throw new Error('Leitor SheetJS indisponível.');
  const workbook = leitor.read(await arquivo.arrayBuffer(), { type: 'array', bookVBA: false, cellFormula: false, cellText: true, cellNF: true, cellDates: false });
  const aba = nomeAba ?? workbook.SheetNames[0];
  const sheet = workbook.Sheets[aba];
  if (!sheet) throw new Error('Aba do Cadastro Mestre não encontrada.');
  const range = { s: { r: 0, c: 0 }, e: leitor.utils.decode_range(sheet['!ref'] || 'A1').e };
  const matriz = leitor.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null, blankrows: true, range });
  // O formato Excel 000000 contém zeros de identidade. Não aplicar formatação
  // genérica (milhar/decimais) nem arredondar números imprecisos para inventar códigos.
  const mapped = mapearPlanilhaCadastroMestre(matriz);
  for (const row of mapped.linhas) {
    for (const campo of ['codigo_produto', 'origem_cod', 'familia_cod', 'agrupamento_erp_valor']) {
      const col = mapped.colunas[campo];
      if (col === undefined) continue;
      const cell = sheet[leitor.utils.encode_cell({ r: row.linha - 1, c: col })];
      if (cell?.t === 'n' && Number.isSafeInteger(cell.v) && /^0+$/.test(cell.z || '') && cell.w) row[campo] = cell.w;
    }
  }
  return { ...mapped, arquivo: arquivo.name, tipo_arquivo: arquivo.name.split('.').pop().toUpperCase(), aba };
}

/** Arquivo + contexto explícito → Preview, sem gravar log ou proveniência. */
export async function previewArquivoCadastroMestre(arquivo, contexto, leitor, nomeAba) {
  const leitura = await lerArquivoCadastroMestre(arquivo, leitor, nomeAba);
  return { ...criarPreviewCadastroMestre(leitura.linhas, contexto), arquivo: leitura.arquivo,
    tipo_arquivo: leitura.tipo_arquivo, aba: leitura.aba, colunas: leitura.colunas, linha_cabecalho: leitura.linha_cabecalho };
}

/** Arquivo e contexto → manifesto/revisão PENDENTE. Não aprova nem executa. */
export async function prepararAprovacaoArquivoCadastroMestre(arquivo, contexto, leitor, nomeAba) {
  const bytes = await arquivo.arrayBuffer();
  const leitura = await lerArquivoCadastroMestre({ name: arquivo.name, arrayBuffer: async () => bytes }, leitor, nomeAba);
  const hash = async buffer => [...new Uint8Array(await crypto.subtle.digest('SHA-256', buffer))]
    .map(value => value.toString(16).padStart(2, '0')).join('');
  const manifesto = criarManifestoCadastroMestre(leitura.linhas, contexto, {
    arquivo: leitura.arquivo, tipo_arquivo: leitura.tipo_arquivo, aba: leitura.aba,
    colunas: leitura.colunas, linha_cabecalho: leitura.linha_cabecalho,
    hash_arquivo_sha256: await hash(bytes),
    hash_contexto_sha256: await hash(new globalThis.TextEncoder().encode(serializarDeterministico(contexto)))
  });
  return { manifesto, revisao: criarRevisaoCadastroMestre(manifesto) };
}

/**
 * Leitura integral paginada; falhas/count truncado não viram contexto vazio.
 * Chamada somente pela fachada API, usando o cliente autenticado existente.
 * @param {{from: Function}} client
 */
export async function lerContextoCadastroMestrePreview(client) {
  const lerTabela = async (table, fields, key) => {
    const rows = [];
    let expected = null;
    // Página <= limite padrão PostgREST; count detecta inclusive um limite menor.
    for (let start = 0; ; start += 500) {
      const { data, error, count } = await client.from(table).select(fields, { count: 'exact' })
        .order(key, { ascending: true }).range(start, start + 499);
      if (error || !Array.isArray(data) || !Number.isInteger(count)) throw new Error(`Falha na leitura integral de ${table}: ${error?.message || 'resposta incompleta'}`);
      if (expected !== null && expected !== count) throw new Error(`Contagem de ${table} mudou durante a leitura; repetir Preview.`);
      expected = count;
      rows.push(...data);
      if (rows.length === count) return rows;
      if (data.length !== 500 || rows.length > count) throw new Error(`Leitura truncada de ${table}.`);
    }
  };
  const [produtos, origens, familias] = await Promise.all([
    lerTabela('dicionario_master_produtos', 'codigo_produto,descricao,origem_cod,familia_cod,agrupamento_erp_valor', 'codigo_produto'),
    lerTabela('categorias_origem', 'id,codigo,descricao', 'id'),
    lerTabela('categorias_familia', 'id,codigo,descricao', 'id')
  ]);
  return { produtos, origens, familias };
}
