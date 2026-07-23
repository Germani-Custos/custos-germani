// @ts-check
/* Responsabilidade: parsing e normalização de planilhas XLSX (Smart Scraper). */

export const REQUIRED_FIELDS = ['codigo_produto', 'descricao', 'custo_variavel', 'custo_direto_fixo', 'custo_total'];
const FIELD_ALIASES = {
  codigo_produto: ['produto', 'codigo', 'cod', 'item', 'cod produto', 'codigo produto'],
  descricao: ['descricao', 'descrição', 'desc'],
  custo_variavel: ['custo variavel', 'custo var', 'variavel'],
  custo_direto_fixo: ['fixo', 'direto fixo', 'custo fixo'],
  custo_total: ['total', 'custo total', 'vl total', 'valor total']
};

/**
 * Fuzzy matching: limiares e pesos para detecção de colunas.
 * Cada limiar governa como o score de compatibilidade entre cabeçalho e alias é calculado.
 */
const FUZZY_MATCH_CONFIG = Object.freeze({
  EXACT_MATCH: 1,           // Coluna normalizada é idêntica ao alias: score máximo
  SUBSTRING_MATCH: 0.92,    // Alias está contido no cabeçalho: alta confiança
  TOKEN_BASELINE: 0.65,     // Score base de overlap de tokens (palavras em comum)
  TOKEN_BONUS_RATE: 0.2,    // Incremento por cada token em comum (até 0.85 total)
  DICE_THRESHOLD: 0.72,     // Mínimo de similitude bigrâmica para considerar match fuzzy
  DICE_WEIGHT: 0.85         // Fator atenuador aplicado ao score Dice
});

export function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeHeaderKey(value) {
  return normalizeText(value).replace(/\s+/g, '_');
}

function hasMeaningfulValue(value) {
  return normalizeText(value).length > 0;
}

function findHeaderRowIndex(matrixRows) {
  return matrixRows.findIndex(row => {
    const normalizedRow = row.map(cell => normalizeHeaderKey(cell));
    return REQUIRED_FIELDS.every(field => normalizedRow.includes(field));
  });
}

function tokenize(value) {
  return normalizeText(value)
    .split(/[^a-z0-9]+/g)
    .map(token => token.trim())
    .filter(Boolean);
}

function bigrams(value) {
  const text = normalizeText(value).replace(/\s+/g, '');
  if (!text) return new Set();
  if (text.length === 1) return new Set([text]);
  const result = new Set();
  for (let i = 0; i < text.length - 1; i += 1) {
    result.add(text.slice(i, i + 2));
  }
  return result;
}

function calculateDiceSimilarity(a, b) {
  const setA = bigrams(a);
  const setB = bigrams(b);
  if (!setA.size || !setB.size) return 0;
  let intersection = 0;
  setA.forEach(chunk => {
    if (setB.has(chunk)) intersection += 1;
  });
  return (2 * intersection) / (setA.size + setB.size);
}

function scoreHeaderMatch(header, aliases = []) {
  const normalizedHeader = normalizeText(header);
  const headerTokens = tokenize(header);
  let bestScore = 0;

  aliases.forEach(alias => {
    const normalizedAlias = normalizeText(alias);
    if (!normalizedAlias) return;

    if (normalizedHeader === normalizedAlias) {
      bestScore = Math.max(bestScore, FUZZY_MATCH_CONFIG.EXACT_MATCH);
      return;
    }
    if (normalizedHeader.includes(normalizedAlias)) {
      bestScore = Math.max(bestScore, FUZZY_MATCH_CONFIG.SUBSTRING_MATCH);
      return;
    }

    const aliasTokens = tokenize(alias);
    const tokenOverlap = aliasTokens.length > 0
      ? aliasTokens.filter(token => headerTokens.includes(token)).length / aliasTokens.length
      : 0;
    if (tokenOverlap > 0) {
      bestScore = Math.max(bestScore, FUZZY_MATCH_CONFIG.TOKEN_BASELINE + (tokenOverlap * FUZZY_MATCH_CONFIG.TOKEN_BONUS_RATE));
    }

    const fuzzyScore = calculateDiceSimilarity(normalizedHeader, normalizedAlias);
    if (fuzzyScore >= FUZZY_MATCH_CONFIG.DICE_THRESHOLD) {
      bestScore = Math.max(bestScore, fuzzyScore * FUZZY_MATCH_CONFIG.DICE_WEIGHT);
    }
  });

  return bestScore;
}

function detectColumnMapping(headers = []) {
  const normalizedHeaders = headers.map((header, index) => ({
    index,
    header,
    normalized: normalizeHeaderKey(header)
  }));
  const mapping = Object.fromEntries(REQUIRED_FIELDS.map(field => [field, null]));
  const usedHeaders = new Set();

  REQUIRED_FIELDS.forEach(field => {
    const exact = normalizedHeaders.find(item => item.normalized === field && !usedHeaders.has(item.header));
    if (exact) {
      mapping[field] = exact.header;
      usedHeaders.add(exact.header);
    }
  });

  REQUIRED_FIELDS.forEach(field => {
    if (mapping[field]) return;
    const aliases = FIELD_ALIASES[field] || [];
    let best = { header: null, score: 0 };

    headers.forEach(header => {
      if (usedHeaders.has(header)) return;
      const score = scoreHeaderMatch(header, aliases);
      if (score > best.score) best = { header, score };
    });

    if (best.header && best.score >= FUZZY_MATCH_CONFIG.DICE_THRESHOLD) {
      mapping[field] = best.header;
      usedHeaders.add(best.header);
    }
  });

  return mapping;
}

/**
 * Normaliza o código de produto preservando a chave de negócio textual sempre que possível.
 * Bloqueia valores ambíguos (decimais, negativos, notação científica não inteira).
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeCodigoProduto(value) {
  if (value === null || value === undefined) return '';

  const raw = String(value)
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim();

  if (!raw) return '';

  const withoutSpaces = raw.replace(/[\s\u00A0]+/g, '');
  if (!withoutSpaces) return '';

  if (/^-/.test(withoutSpaces)) return '';

  if (/^\d{1,3}([.,]\d{3})+$/.test(withoutSpaces)) {
    return withoutSpaces.replace(/[.,]/g, '');
  }

  const scientificCandidate = withoutSpaces.replace(',', '.');
  if (/^[+-]?\d+(\.\d+)?e[+-]?\d+$/i.test(scientificCandidate)) {
    const num = Number(scientificCandidate);
    if (!Number.isFinite(num) || !Number.isInteger(num)) return '';
    return num.toLocaleString('fullwide', { useGrouping: false });
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value) || !Number.isInteger(value)) return '';
    return value.toLocaleString('fullwide', { useGrouping: false });
  }

  if (/^[+-]?\d+[,.]0+$/.test(withoutSpaces)) {
    return withoutSpaces.replace(/[,.]0+$/, '').replace(/^\+/, '');
  }

  if (/^[+-]?\d+[,.]\d+$/.test(withoutSpaces)) return '';

  return withoutSpaces.replace(/^\+/, '');
}

function roundTo4(value) {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

/**
 * Converte número em formato brasileiro/ERP para número arredondado a 4 casas.
 * @param {unknown} value
 * @returns {number}
 */
export function parseBrazilianNumber(value) {
  if (value === null || value === undefined) return 0;

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return 0;
    return roundTo4(value);
  }

  let str = String(value).trim();
  if (!str) return 0;

  str = str.replace(/\s+/g, '').replace(/[R$]/g, '');

  if (str.includes(',')) {
    str = str.replace(/\./g, '');
    str = str.replace(',', '.');
  }

  if (!/^-?\d+(\.\d+)?$/.test(str)) return 0;

  const num = Number(str);
  if (!Number.isFinite(num)) return 0;

  return roundTo4(num);
}

export function formatBrazilianFinancial(value, decimals = 3) {
  if (!Number.isFinite(Number(value))) return '0,000';
  return Number(value).toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

export function readWorkbook(arrayBuffer) {
  const wb = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const matrixRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true, blankrows: false });

  const headerRowIndex = findHeaderRowIndex(matrixRows);
  const safeHeaderIndex = headerRowIndex >= 0 ? headerRowIndex : 0;
  const headers = (matrixRows[safeHeaderIndex] || []).map(value => String(value || '').trim());

  return matrixRows
    .slice(safeHeaderIndex + 1)
    .filter(row => row.some(hasMeaningfulValue))
    .map(row => {
      const item = {};
      headers.forEach((header, index) => {
        if (!header) return;
        item[header] = row[index] ?? '';
      });
      return item;
    });
}

export function scanHeaders(rows) {
  const headers = [...new Set((rows || []).flatMap(row => Object.keys(row || {})))];
  const mapping = detectColumnMapping(headers);

  return {
    headers,
    mapping,
    rejectedHeaders: headers.filter(header => !REQUIRED_FIELDS.includes(normalizeHeaderKey(header)))
  };
}

export function countValidMappedColumns(mapping) {
  return REQUIRED_FIELDS.filter(key => Boolean(mapping[key])).length;
}

/* ---------------------------------------------------------------------------
 * Auditoria de OP — parser do relatório MCAP105 ("Acompanhamento de Tempo por OP")
 *
 * Ordem das 16 colunas de uma linha de dados, corrigida contra os dados reais:
 * nas colunas de tempo e produtividade o relatório traz PREVISTO antes de REAL.
 * A tabela posicional da spec original invertia esses pares; a ordem abaixo foi
 * validada pelo % Tempo, que só reconcilia como
 * (kg_hora_real - kg_hora_previsto) / kg_hora_previsto (ver PR da Fase 1).
 * ------------------------------------------------------------------------- */
const MCAP105_COLUMNS = Object.freeze([
  'origem',            // 0
  'op',                // 1
  'cod_produto',       // 2
  'descricao',         // 3
  'cod_estagio',       // 4
  'estagio',           // 5
  'qtd_prevista',      // 6
  'qtd_produzida',     // 7
  'unidade',           // 8
  'tempo_previsto',    // 9  — previsto, não real
  'tempo_real',        // 10 — real, não previsto
  'kg_hora_previsto',  // 11 — previsto, não real
  'kg_hora_real',      // 12 — real, não previsto
  'perc_tempo',        // 13
  'tempo_parada',      // 14
  'qtd_apontamentos'   // 15
]);

const MCAP105_TEXT_FIELDS = new Set(['cod_produto', 'descricao', 'estagio', 'unidade']);
const MCAP105_INT_FIELDS = new Set(['origem', 'op', 'cod_estagio', 'qtd_apontamentos']);

/**
 * Divide uma linha CSV respeitando aspas duplas (campos entre aspas podem
 * conter a vírgula decimal do formato brasileiro). Aspas duplas escapadas
 * ("") viram uma aspa literal.
 * @param {string} line
 * @returns {string[]}
 */
function splitCsvLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') { current += '"'; i += 1; }
        else inQuotes = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

/**
 * Converte um número no formato fixo do MCAP105: ponto sempre é separador de
 * milhar e vírgula sempre é separador decimal. Diferente de
 * `parseBrazilianNumber` (que só remove pontos quando há vírgula), aqui
 * "2.800" (sem vírgula) é 2800, não 2,8. Valor inválido/vazio → 0.
 * @param {unknown} value
 * @returns {number}
 */
function parseMcap105Number(value) {
  const str = String(value ?? '').trim();
  if (!str) return 0;
  const normalized = str.replace(/\./g, '').replace(',', '.');
  const num = Number(normalized);
  return Number.isFinite(num) ? num : 0;
}

/**
 * Parseia um inteiro estrito (apenas dígitos, com sinal opcional), ignorando
 * espaços de preenchimento do relatório. Retorna null se não for inteiro.
 * @param {unknown} value
 * @returns {number|null}
 */
function parseMcap105Int(value) {
  const str = String(value ?? '').trim();
  if (!/^-?\d+$/.test(str)) return null;
  return parseInt(str, 10);
}

/**
 * Normaliza uma linha do relatório antes do parse de campos.
 *
 * Alguns exports do ERP entregam o arquivo como CSV delimitado por `;` em que
 * cada registro é um único campo — e, quando o registro contém vírgulas, o
 * campo inteiro vem entre aspas com as aspas internas escapadas como `""`
 * (ex.: `"425,738,...,""1.197,01"",...";`). Outros exports entregam a linha
 * "crua", começando direto no dígito. Esta função reduz os dois formatos ao
 * mesmo: remove o `;` terminador e, se a linha for um único campo entre aspas,
 * desembrulha (tira as aspas externas e converte `""` → `"`), devolvendo o
 * conteúdo separável por vírgula que o restante do parser já entende.
 * @param {string} line
 * @returns {string}
 */
function unwrapMcap105Record(line) {
  let normalized = String(line ?? '').replace(/;+\s*$/, '');
  if (normalized.length >= 2 && normalized[0] === '"' && normalized[normalized.length - 1] === '"') {
    normalized = normalized.slice(1, -1).replace(/""/g, '"');
  }
  return normalized;
}

/**
 * Uma linha é dado real quando, após remover o `\r`, não está vazia e começa
 * com dígito. Cabeçalhos repetidos, título e linhas em branco começam com
 * letra ou espaço e são descartados.
 * @param {string} line
 * @returns {boolean}
 */
function isMcap105DataLine(line) {
  if (!line.trim()) return false;
  const first = line[0];
  return first >= '0' && first <= '9';
}

/**
 * @typedef {Object} Mcap105Row
 * @property {number|null} origem
 * @property {number|null} op
 * @property {string} cod_produto
 * @property {string} descricao
 * @property {number|null} cod_estagio
 * @property {string} estagio
 * @property {string} unidade
 * @property {number} qtd_prevista
 * @property {number} qtd_produzida
 * @property {number|null} qtd_apontamentos
 * @property {number} tempo_previsto
 * @property {number} tempo_real
 * @property {number} tempo_parada
 * @property {number} kg_hora_previsto
 * @property {number} kg_hora_real
 * @property {number} perc_tempo
 */

/**
 * Parseia o conteúdo bruto do relatório MCAP105 (CSV latin-1 já lido como
 * string). Função pura: não toca no DOM nem na API e nunca lança exceção —
 * linhas inválidas vão para `errors[]`.
 * @param {string} text - Conteúdo do arquivo lido com FileReader (ISO-8859-1)
 * @returns {{ rows: Mcap105Row[], errors: { linha: number, mensagem: string }[] }}
 */
export function parseMCAP105(text) {
  /** @type {Mcap105Row[]} */
  const rows = [];
  /** @type {{ linha: number, mensagem: string }[]} */
  const errors = [];

  const lines = String(text ?? '').replace(/\r/g, '').split('\n');

  lines.forEach((rawLine, index) => {
    const line = unwrapMcap105Record(rawLine);
    if (!isMcap105DataLine(line)) return;

    const linha = index + 1;
    const fields = splitCsvLine(line);

    const origem = parseMcap105Int(fields[0]);
    if (origem === null) {
      errors.push({ linha, mensagem: 'origem inválida (esperado inteiro)' });
      return;
    }

    const codProduto = String(fields[2] ?? '').trim();
    if (!codProduto) {
      errors.push({ linha, mensagem: 'cod_produto vazio' });
      return;
    }

    /** @type {Record<string, unknown>} */
    const row = {};
    MCAP105_COLUMNS.forEach((field, pos) => {
      const raw = fields[pos];
      if (MCAP105_TEXT_FIELDS.has(field)) {
        row[field] = String(raw ?? '').trim();
      } else if (MCAP105_INT_FIELDS.has(field)) {
        row[field] = parseMcap105Int(raw);
      } else {
        row[field] = parseMcap105Number(raw);
      }
    });

    rows.push(/** @type {Mcap105Row} */ (row));
  });

  return { rows, errors };
}
