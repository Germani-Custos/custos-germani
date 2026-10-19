import { describe, expect, it, vi, afterEach } from 'vitest';
import { arquivoCadastro, contexto, SheetJS } from './fixtures/cadastro-mestre-arquivo.js';
import { criarDadosExecucaoCadastroMestre, validarDadosExecucaoCadastroMestre, linhasDadosExecucaoCadastroMestre,
  criarFonteManifestoDadosCadastroMestre } from '../core/cadastro-mestre-execution-data.js';
import { lerArquivoCadastroMestre, prepararAprovacaoArquivoCadastroMestre, prepararAprovacaoDadosCadastroMestre } from '../src/services/cadastro-mestre-preview.js';
import { serializarDeterministico, decidirOperacoesCadastroMestre } from '../core/cadastro-mestre-approval-engine.js';
import { criarPlanoReconstrucaoCadastroMestre } from '../core/cadastro-mestre-reconstruction-engine.js';
import { hashReconstrucao } from '../scripts/lib/cadastro-mestre-reconstruction.mjs';
import { executarReconstrucaoPelaAplicacao } from '../src/services/cadastro-mestre-execution.js';

const clone = value => globalThis.structuredClone(value);
const sha = 'a'.repeat(64);
const colunas = { codigo_produto: 0, descricao: 1, tipo: 2, descr_origem: 3, origem_cod: 4, familia_cod: 5, agrupamento_erp_valor: 6 };
function leitura(linhas, columns = colunas) {
  return { arquivo: 'cadastro.xls', tipo_arquivo: 'XLS', aba: 'Cadastro', linha_cabecalho: 1, colunas: columns, linhas };
}
const linha = { linha: 2, codigo_produto: '001', descricao: 'ERP', tipo: 'P', descr_origem: 'Produzido',
  origem_cod: '01', familia_cod: 'F1', agrupamento_erp_valor: 'P801' };

describe('Representação compacta — usa todas as linhas relevantes sem workbook/colunas extras', () => {
  it.each(['xls', 'xlsx', 'xlsm'])('%s mantém leitura canônica, filtros, propostas, universo e preservações no servidor', async formato => {
    const arquivo = arquivoCadastro(formato);
    const leituraOriginal = await lerArquivoCadastroMestre(arquivo, SheetJS);
    const preparado = await prepararAprovacaoArquivoCadastroMestre(arquivo, contexto, SheetJS);
    const dados = preparado.dadosExecucao;
    expect(dados.versao_transporte).toBe('CADASTRO_MESTRE_DADOS_V3');
    expect(Object.keys(dados).sort()).toEqual(['fonte', 'linhas', 'versao_transporte']);
    expect(() => validarDadosExecucaoCadastroMestre(dados)).not.toThrow();
    expect(linhasDadosExecucaoCadastroMestre(dados)).toEqual(leituraOriginal.linhas);
    expect(dados.linhas).toHaveLength(8); // Inclusive D/origem inválida/inativo/EXLUIR.
    expect(dados.linhas.every(r => r.length === 11)).toBe(true);
    const servidor = await prepararAprovacaoDadosCadastroMestre(clone(dados), clone(contexto));
    expect(servidor.manifesto).toEqual(preparado.manifesto);
    expect(servidor.revisao).toEqual(preparado.revisao);
    expect(servidor.manifesto.fonte.hash_dados_sha256).toBe(hashReconstrucao(dados));
    expect(servidor.manifesto.universo).toEqual(['001', '002', '008', '1000']);
    expect(servidor.manifesto.resumo).toMatchObject({ linhas_lidas: 8, linhas_excluidas: 4, produtos_com_preview: 4,
      produtos_a_remover: 5, preservacoes_campos: 4 });
    expect(JSON.stringify(dados)).not.toContain('E999');
    expect(JSON.stringify(dados)).not.toContain('ignorar');
  });

  it('coluna opcional ausente é diferente de coluna presente vazia e nenhum código perde zeros', async () => {
    const ausente = { codigo_produto: 0, descricao: 1, tipo: 2, descr_origem: 3 };
    const dadosAusentes = criarDadosExecucaoCadastroMestre(leitura([{ linha: 2, codigo_produto: '002', descricao: null,
      tipo: 'P', descr_origem: 'Produzido' }], ausente), sha);
    const decoded = linhasDadosExecucaoCadastroMestre(dadosAusentes)[0];
    expect(decoded.codigo_produto).toBe('002');
    for (const campo of ['origem_cod', 'familia_cod', 'agrupamento_erp_valor']) expect(Object.hasOwn(decoded, campo)).toBe(false);
    expect(Object.hasOwn(decoded, 'descricao')).toBe(true);
    expect(decoded.descricao).toBeNull();
    const preparado = await prepararAprovacaoDadosCadastroMestre(dadosAusentes, contexto);
    const produto = preparado.manifesto.produtos[0];
    expect(produto.diferencas.find(d => d.campo === 'descricao').tipo).toBe('CAMPO_VAZIO_PRESERVA_EXISTENTE');
    expect(produto.diferencas.find(d => d.campo === 'origem_cod').tipo).toBe('CAMPO_NAO_FORNECIDO');
    expect(produto.calculado).toEqual({ codigo_produto: '002', descricao: 'Preservar descrição', origem_cod: '01', familia_cod: 'F1', agrupamento_erp_valor: 'P302', agrupamento_comercial_erp_cod: null, agrupamento_comercial_erp_descricao: null });
  });

  it('transporte conserva números zero, textos com zeros e os valores fornecidos sem reparar', () => {
    const dados = criarDadosExecucaoCadastroMestre(leitura([{ ...linha, codigo_produto: '0002', origem_cod: 0,
      familia_cod: null, agrupamento_erp_valor: '', descricao: '  Ção  ' }]), sha);
    expect(linhasDadosExecucaoCadastroMestre(dados)).toEqual([{ ...linha, codigo_produto: '0002', origem_cod: 0,
      familia_cod: null, agrupamento_erp_valor: '', descricao: '  Ção  ' }]);
  });

  it('fonte contém hashes de dados/contexto além da proveniência original', () => {
    const dados = criarDadosExecucaoCadastroMestre(leitura([linha]), sha);
    const hashDados = hashReconstrucao(dados);
    const hashContexto = hashReconstrucao(contexto);
    expect(criarFonteManifestoDadosCadastroMestre(dados, hashDados, hashContexto)).toMatchObject({
      modo: 'RECONSTRUCAO_UNIVERSO', arquivo: 'cadastro.xls', tipo_arquivo: 'XLS', aba: 'Cadastro',
      hash_arquivo_sha256: sha, hash_dados_sha256: hashDados, hash_contexto_sha256: hashContexto
    });
  });

  it.each([
    dados => { dados.versao_transporte = 'DESCONHECIDO'; },
    dados => { dados.fonte.hash_arquivo_sha256 = 'invalid'; },
    dados => { dados.fonte.arquivo = 'cadastro.csv'; },
    dados => { dados.linhas[0].push('campo extra'); },
    dados => { dados.linhas[0][0] = -1; },
    dados => { dados.linhas[0][2] = { formula: '=IMPORT' }; },
    dados => { dados.linhas[0][5] = NaN; },
    dados => { delete dados.fonte.colunas.codigo_produto; },
    dados => { dados.fonte.colunas.origem_cod = dados.fonte.colunas.descricao; },
    dados => { dados.universo = ['999']; },
    dados => { dados.fonte.sql = 'DELETE FROM tabela'; },
    dados => { dados.fonte.tipo_arquivo = 'XLSX'; },
    dados => { delete dados.fonte.colunas.familia_cod; },
    dados => { dados.linhas.push([...dados.linhas[0]]); }
  ])('shape inválido não chega a filtro/execução (%#)', alterar => {
    const dados = criarDadosExecucaoCadastroMestre(leitura([linha]), sha);
    alterar(dados);
    expect(() => validarDadosExecucaoCadastroMestre(dados)).toThrow();
  });

  it('duplicidade entre linha elegível e filtrada continua bloqueando reconstrução', async () => {
    const dados = criarDadosExecucaoCadastroMestre(leitura([linha, { ...linha, linha: 3, tipo: 'D' }]), sha);
    const { manifesto, revisao } = await prepararAprovacaoDadosCadastroMestre(dados, contexto);
    expect(manifesto.status).toBe('COM_ERROS');
    expect(manifesto.reconstrucao_bloqueada).toBe(true);
    expect(manifesto.erros[0].motivo).toContain('duplicado');
    expect(() => criarPlanoReconstrucaoCadastroMestre(manifesto, revisao)).toThrow();
  });

  it('alteração apenas do contexto muda hash/manifesto mesmo com dados idênticos', async () => {
    const dados = criarDadosExecucaoCadastroMestre(leitura([linha]), sha);
    const preparado = await prepararAprovacaoDadosCadastroMestre(dados, contexto);
    const contextoAlterado = clone(contexto);
    contextoAlterado.produtos[1].descricao = 'Alteração concorrente';
    const alterado = await prepararAprovacaoDadosCadastroMestre(dados, contextoAlterado);
    expect(alterado.manifesto.fonte.hash_dados_sha256).toBe(preparado.manifesto.fonte.hash_dados_sha256);
    expect(alterado.manifesto.fonte.hash_contexto_sha256).not.toBe(preparado.manifesto.fonte.hash_contexto_sha256);
    expect(hashReconstrucao(alterado.manifesto)).not.toBe(hashReconstrucao(preparado.manifesto));
  });
});

describe('Volume real informado, registros exclusivamente sintéticos', () => {
  afterEach(() => vi.unstubAllGlobals());
  // Revalida aprovação/plano e hashes do lote completo; sob concorrência pode exceder 5 s.
  // Margem somente deste teste de volume (CAD-VOL-01), sem reduzir fixture ou processamento.
  it('6.230 linhas → 860 válidos, 4.853 remoções e 517 preservações cabem no POST de 4 MiB', async () => {
    const produtos = Array.from({ length: 5706 }, (_, i) => ({ codigo_produto: String(i + 1), descricao: 'Atual',
      origem_cod: '01', familia_cod: 'F1', agrupamento_erp_valor: 'P005' }));
    const rows = [...produtos.map((p, i) => ({ ...p, descricao: i < 517 ? null : p.descricao,
      tipo: i < 853 ? 'P' : 'D', descr_origem: 'Produzido' })),
    ...Array.from({ length: 7 }, (_, i) => ({ codigo_produto: String(6000 + i), descricao: 'Novo', tipo: 'C',
      descr_origem: 'Revenda', origem_cod: '01', familia_cod: 'F1', agrupamento_erp_valor: 'P302' })),
    ...Array.from({ length: 517 }, (_, i) => ({ codigo_produto: String(7000 + i), descricao: 'Fora do filtro', tipo: 'D',
      descr_origem: 'Produzido', origem_cod: '01', familia_cod: 'F1', agrupamento_erp_valor: 'P005' }))]
      .map((row, i) => ({ linha: i + 2, ...row }));
    const dados = criarDadosExecucaoCadastroMestre({ ...leitura(rows), arquivo: 'cadastro mestre 8_10(1).xls' }, sha);
    const { manifesto, revisao } = await prepararAprovacaoDadosCadastroMestre(dados, { ...contexto, produtos });
    expect(manifesto.resumo).toMatchObject({ linhas_lidas: 6230, produtos_com_preview: 860, produtos_existentes: 853,
      novos_produtos: 7, produtos_a_remover: 4853, preservacoes_campos: 517 });
    expect(manifesto.produtos.slice(0, 10).map(p => p.calculado.descricao)).not.toContain(null);
    const aprovado = decidirOperacoesCadastroMestre(manifesto, revisao, manifesto.operacoes.map(o => o.id), 'APROVADO');
    const plano = criarPlanoReconstrucaoCadastroMestre(manifesto, aprovado);
    expect(plano.resumo).toEqual({ antes: 5706, depois: 860, inseridos: 7, atualizados: 0, removidos: 4853 });
    const lote = 'CAD_UI_11111111-1111-4111-8111-111111111111';
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ status: 'concluido', identificador_lote: lote, depois: 860 }) })));
    await executarReconstrucaoPelaAplicacao({ auth: { getSession: async () => ({ data: { session: { access_token: 'user-test' } } }) } },
      { dadosExecucao: dados, manifesto, revisao: aprovado, lote });
    const body = fetch.mock.calls[0][1].body;
    expect(Buffer.byteLength(body)).toBeLessThan(4 * 1024 * 1024);
    expect(Buffer.byteLength(serializarDeterministico(dados))).toBeLessThan(1024 * 1024);
    expect(JSON.parse(body).arquivo_base64).toBeUndefined();
    expect(JSON.parse(body).dados_execucao.linhas).toHaveLength(6230);
  }, 10_000);
});
