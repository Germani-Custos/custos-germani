// @ts-check
/* Entrada compacta do adapter; nunca aceita patches, universo ou SQL do cliente. */
export const VERSAO_DADOS_EXECUCAO_CADASTRO_MESTRE = 'CADASTRO_MESTRE_DADOS_V1';
export const CAMPOS_DADOS_EXECUCAO_CADASTRO_MESTRE = Object.freeze([
  'codigo_produto', 'descricao', 'tipo', 'descr_origem', 'origem_cod', 'familia_cod', 'agrupamento_erp_valor'
]);
const obrigatorios = CAMPOS_DADOS_EXECUCAO_CADASTRO_MESTRE.slice(0, 4);
const shaValido = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const objeto = value => value && typeof value === 'object' && !Array.isArray(value);
const chavesExatas = (value, keys) => objeto(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const falhar = () => { throw new Error('Dados compactos do Preview inválidos. Gere novo Preview e aprovação.'); };

/** Apenas campos mapeados pelo adapter, com números/zeros preservados. */
export function criarDadosExecucaoCadastroMestre(leitura, hashArquivo) {
  const dados = {
    versao_transporte: VERSAO_DADOS_EXECUCAO_CADASTRO_MESTRE,
    fonte: { arquivo: leitura.arquivo, tipo_arquivo: leitura.tipo_arquivo, aba: leitura.aba,
      colunas: { ...leitura.colunas }, linha_cabecalho: leitura.linha_cabecalho, hash_arquivo_sha256: hashArquivo },
    linhas: leitura.linhas.map(row => [row.linha, ...CAMPOS_DADOS_EXECUCAO_CADASTRO_MESTRE.map(campo =>
      Object.hasOwn(leitura.colunas, campo) ? row[campo] ?? null : null)])
  };
  validarDadosExecucaoCadastroMestre(dados);
  return dados;
}

/** Validação fechada do transporte, sem alterar filtros/normalização de negócio. */
export function validarDadosExecucaoCadastroMestre(dados) {
  if (!chavesExatas(dados, ['versao_transporte', 'fonte', 'linhas']) || dados.versao_transporte !== VERSAO_DADOS_EXECUCAO_CADASTRO_MESTRE ||
      !chavesExatas(dados.fonte, ['arquivo', 'tipo_arquivo', 'aba', 'colunas', 'linha_cabecalho', 'hash_arquivo_sha256'])) falhar();
  const fonte = dados.fonte;
  if (typeof fonte.arquivo !== 'string' || fonte.arquivo.length > 200 || /[\\/]/.test(fonte.arquivo) ||
      [...fonte.arquivo].some(c => c.charCodeAt(0) < 32) || !/\.(xlsm|xlsx|xls)$/i.test(fonte.arquivo) ||
      fonte.tipo_arquivo !== fonte.arquivo.split('.').pop().toUpperCase() ||
      typeof fonte.aba !== 'string' || !fonte.aba.length || fonte.aba.length > 200 || !shaValido(fonte.hash_arquivo_sha256) ||
      !Number.isSafeInteger(fonte.linha_cabecalho) || fonte.linha_cabecalho < 1 || fonte.linha_cabecalho > 1048576 || !objeto(fonte.colunas)) falhar();
  const campos = Object.keys(fonte.colunas);
  if (!obrigatorios.every(c => campos.includes(c)) || campos.some(c => !CAMPOS_DADOS_EXECUCAO_CADASTRO_MESTRE.includes(c)) ||
      Object.values(fonte.colunas).some(c => !Number.isInteger(c) || c < 0 || c > 16383) ||
      new Set(Object.values(fonte.colunas)).size !== campos.length || !Array.isArray(dados.linhas) || dados.linhas.length > 100000) falhar();
  let anterior = fonte.linha_cabecalho;
  for (const row of dados.linhas) {
    if (!Array.isArray(row) || row.length !== 8 || !Number.isSafeInteger(row[0]) || row[0] <= anterior || row[0] > 1048576) falhar();
    anterior = row[0];
    for (let index = 1; index < row.length; index++) {
      const value = row[index];
      if (value !== null && !['string', 'number', 'boolean'].includes(typeof value)) falhar();
      if (typeof value === 'number' && !Number.isFinite(value)) falhar();
      if (!Object.hasOwn(fonte.colunas, CAMPOS_DADOS_EXECUCAO_CADASTRO_MESTRE[index - 1]) && value !== null) falhar();
    }
  }
}

export function linhasDadosExecucaoCadastroMestre(dados) {
  validarDadosExecucaoCadastroMestre(dados);
  return dados.linhas.map(row => ({ linha: row[0], ...Object.fromEntries(CAMPOS_DADOS_EXECUCAO_CADASTRO_MESTRE
    .flatMap((campo, index) => Object.hasOwn(dados.fonte.colunas, campo) ? [[campo, row[index + 1]]] : [])) }));
}

export function criarFonteManifestoDadosCadastroMestre(dados, hashDados, hashContexto) {
  validarDadosExecucaoCadastroMestre(dados);
  if (!shaValido(hashDados) || !shaValido(hashContexto)) falhar();
  return { modo: 'RECONSTRUCAO_UNIVERSO', ...dados.fonte, hash_dados_sha256: hashDados, hash_contexto_sha256: hashContexto };
}
