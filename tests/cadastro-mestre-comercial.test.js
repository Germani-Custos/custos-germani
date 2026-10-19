import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { criarPreviewCadastroMestre } from '../core/cadastro-mestre-preview-engine.js';
import { criarManifestoCadastroMestre, criarRevisaoCadastroMestre, decidirOperacoesCadastroMestre } from '../core/cadastro-mestre-approval-engine.js';
import { criarPlanoReconstrucaoCadastroMestre } from '../core/cadastro-mestre-reconstruction-engine.js';
import { lerArquivoCadastroMestre, prepararAprovacaoArquivoCadastroMestre, prepararAprovacaoDadosCadastroMestre } from '../src/services/cadastro-mestre-preview.js';
import { validarDadosExecucaoCadastroMestre } from '../core/cadastro-mestre-execution-data.js';
import { prepararConsultaCadastroMestreErp } from '../core/cadastro-mestre-erp-engine.js';
import { classificarCustos } from '../core/custos-classification-engine.js';
import { arquivoComercial, campoComercial as cod, descricaoComercial as desc } from './fixtures/cadastro-mestre-comercial.js';
import { SheetJS, contexto } from './fixtures/cadastro-mestre-arquivo.js';

const row = values => ({ codigo_produto: '001', descricao: 'Produto', tipo: 'P', descr_origem: 'Produzido',
  origem_cod: '01', familia_cod: 'F1', agrupamento_erp_valor: 'P005', ...values });
const ctx = { ...contexto, produtos: [{ ...contexto.produtos[0], [cod]: 'C012', [desc]: 'BISCOITO SOLTO DOCE' }] };
const aprovar = m => decidirOperacoesCadastroMestre(m, criarRevisaoCadastroMestre(m), m.operacoes.map(o => o.id), 'APROVADO');

describe('CAD-COM-01 — campos ERP opcionais e independentes', () => {
  it.each(['xls', 'xlsx', 'xlsm'])('%s identifica ambos os cabeçalhos sem confundir outros Agrup.*, transporta V3 e regenera o mesmo manifesto', async formato => {
    const arquivo = arquivoComercial(formato);
    const leitura = await lerArquivoCadastroMestre(arquivo, SheetJS);
    expect(leitura.linhas[0]).toMatchObject({ [cod]: 'C006', [desc]: 'BISCOITO ESPECIAL', agrupamento_erp_valor: 'P005' });
    for (const campo of ['agrupamento_cod', 'agrupamento_custos', 'agrupamento_fiscal']) expect(leitura.colunas).not.toHaveProperty(campo);
    expect(JSON.stringify(leitura)).not.toMatch(/E999|K999|F999/);
    const preparado = await prepararAprovacaoArquivoCadastroMestre(arquivo, ctx, SheetJS);
    expect(preparado.dadosExecucao.versao_transporte).toBe('CADASTRO_MESTRE_DADOS_V3');
    expect(preparado.dadosExecucao.linhas.every(r => r.length === 11)).toBe(true);
    const servidor = await prepararAprovacaoDadosCadastroMestre(preparado.dadosExecucao, ctx);
    expect(servidor.manifesto).toEqual(preparado.manifesto);
    expect(preparado.manifesto.resumo).toMatchObject({ produtos_com_preview: 3, agrupamentos_comerciais_preenchidos: 1,
      agrupamentos_comerciais_vazios: 2, agrupamentos_comerciais_distintos: 1 });
  });

  it.each([
    ['código e descrição', 'C006', 'BISCOITO ESPECIAL', 'C006', 'BISCOITO ESPECIAL'],
    ['código vazio', '', 'Rótulo recebido sem código', null, 'Rótulo recebido sem código'],
    ['descrição vazia', 'C006', '', 'C006', null],
    ['ambos vazios', '', '', null, null],
    ['ambos NULL', null, null, null, null],
    ['somente espaços', '  ', '  ', null, null]
  ])('%s: mantém produto válido e não infere valores', (_nome, codigo, descricao, esperadoCodigo, esperadaDescricao) => {
    const original = globalThis.structuredClone(ctx);
    const preview = criarPreviewCadastroMestre([row({ [cod]: codigo, [desc]: descricao })], ctx);
    expect(preview.status).toBe('OK');
    expect(preview.produtos[0].calculado).toMatchObject({ [cod]: esperadoCodigo, [desc]: esperadaDescricao });
    expect(preview.produtos[0].calculado).not.toHaveProperty('agrupamento_cod');
    expect(ctx).toEqual(original);
  });

  it('célula vazia gera UPDATE aprovado de NULL; coluna ausente preserva o existente', () => {
    const m = criarManifestoCadastroMestre([row({ [cod]: '', [desc]: '' })], ctx, { modo: 'RECONSTRUCAO_UNIVERSO' });
    const plano = criarPlanoReconstrucaoCadastroMestre(m, aprovar(m));
    expect(plano.updates[0]).toMatchObject({ [cod]: null, [desc]: null });
    expect(m.operacoes.filter(o => o.categoria.includes('COMERCIAL')).every(o => o.precondicao.valores_anteriores[cod] || o.precondicao.valores_anteriores[desc])).toBe(true);
    const ausente = criarManifestoCadastroMestre([row({})], ctx, { modo: 'RECONSTRUCAO_UNIVERSO' });
    expect(ausente.produtos[0].calculado).toMatchObject({ [cod]: 'C012', [desc]: 'BISCOITO SOLTO DOCE' });
    expect(ausente.operacoes.some(o => o.categoria.includes('COMERCIAL'))).toBe(false);
  });

  it('novo sem agrupamento permanece no universo com NULL explícito, sem produto artificial', () => {
    const m = criarManifestoCadastroMestre([row({ [cod]: '', [desc]: '' })], { ...ctx, produtos: [] }, { modo: 'RECONSTRUCAO_UNIVERSO' });
    expect(m.universo).toEqual(['001']);
    expect(m.operacoes).toHaveLength(1);
    expect(m.operacoes[0].dados).toMatchObject({ [cod]: null, [desc]: null });
    expect(JSON.stringify(m)).not.toContain('SEM_AGRUPAMENTO');
  });

  it('conflito do mesmo código no arquivo bloqueia aprovação, inclusive ocorrência excluída; códigos diferentes podem repetir descrição', () => {
    const rows = [row({ [cod]: 'C006', [desc]: 'ESPECIAL' }), row({ codigo_produto: '002', tipo: 'D', [cod]: 'C006', [desc]: 'DIVERGENTE' })];
    const m = criarManifestoCadastroMestre(rows, ctx, { modo: 'RECONSTRUCAO_UNIVERSO' });
    expect(m.reconstrucao_bloqueada).toBe(true);
    expect(m.erros.some(e => e.codigo_agrupamento_comercial === 'C006')).toBe(true);
    expect(() => aprovar(m)).toThrow();
    const ok = criarManifestoCadastroMestre([rows[0], row({ codigo_produto: '002', [cod]: 'C012', [desc]: 'ESPECIAL' })], ctx, { modo: 'RECONSTRUCAO_UNIVERSO' });
    expect(ok.status).toBe('OK');
    expect(ok.universo).toEqual(['001', '002']);
  });

  it('consulta ERP exibe os dois campos sem inferir descrição ausente e sem projetar agrupamento Kustos', () => {
    const erp = prepararConsultaCadastroMestreErp({ ...ctx, produtos: [{ ...ctx.produtos[0], [cod]: 'C006', [desc]: null, agrupamento_cod: 'M005' }] });
    expect(erp.produtos[0]).toMatchObject({ [cod]: 'C006', [desc]: null });
    expect(erp.produtos[0]).not.toHaveProperty('agrupamento_cod');
    const fato = [{ codigo_produto: '001', data_referencia: '2026-06-01', criado_em: '2026-06-10', custo_total: 100 }];
    const operacional = [{ codigo_produto: '001', origem_id: 'operacional', familia_id: 'f', agrupamento_cod: 'M005' }];
    const antes = classificarCustos(fato, operacional, ctx);
    const depois = classificarCustos(fato, operacional, { ...ctx, produtos: [{ ...ctx.produtos[0], [cod]: 'C006', [desc]: 'BISCOITO ESPECIAL' }] });
    expect(depois).toEqual(antes);
    expect(depois[0].agrupamento_cod).toBe('M005');
    expect(fato[0]).not.toHaveProperty(cod);
    expect(operacional[0]).not.toHaveProperty(cod);
  });

  it.each(['CADASTRO_MESTRE_DADOS_V1', 'CADASTRO_MESTRE_DADOS_V2'])('recusa transporte antigo %s e exige nova aprovação', async versao => {
    const p = await prepararAprovacaoArquivoCadastroMestre(arquivoComercial(), ctx, SheetJS);
    expect(() => validarDadosExecucaoCadastroMestre({ ...p.dadosExecucao, versao_transporte: versao })).toThrow();
    expect(() => criarPlanoReconstrucaoCadastroMestre({ ...p.manifesto, versao_contrato: 'RECONSTRUCAO_UNIVERSO_V1' }, p.revisao)).toThrow('novo Preview');
  });
});


describe('CAD-COM-01 — migration aditiva local', () => {
  it('adiciona somente duas colunas text nullable sem default, backfill ou alteração operacional', async () => {
    const db = new PGlite();
    try {
      await db.exec(`CREATE TABLE dicionario_master_produtos(codigo_produto text PRIMARY KEY,descricao text,agrupamento_erp_valor text);
        INSERT INTO dicionario_master_produtos VALUES ('001','Produto','P005');
        CREATE TABLE dicionario_produtos(codigo_produto text,agrupamento_cod text);
        INSERT INTO dicionario_produtos VALUES ('001','M005');`);
      const old = (await db.query('SELECT * FROM dicionario_master_produtos')).rows;
      const migration = readFileSync(new URL('../sql/20261019163220_cadastro_mestre_agrupamento_comercial_erp.sql', import.meta.url), 'utf8');
      expect(migration).not.toMatch(/INSERT INTO|UPDATE |DELETE FROM|CREATE TABLE|REFERENCES|UNIQUE|NOT NULL|DEFAULT/i);
      await db.exec(migration);
      const rows = (await db.query('SELECT * FROM dicionario_master_produtos')).rows;
      expect(rows).toEqual([{ ...old[0], [cod]: null, [desc]: null }]);
      const columns = (await db.query(`SELECT column_name,data_type,is_nullable,column_default FROM information_schema.columns
        WHERE table_name='dicionario_master_produtos' AND column_name LIKE 'agrupamento_comercial_erp_%' ORDER BY column_name`)).rows;
      expect(columns).toHaveLength(2);
      expect(columns.every(c => c.data_type === 'text' && c.is_nullable === 'YES' && c.column_default === null)).toBe(true);
      expect((await db.query('SELECT * FROM dicionario_produtos')).rows).toEqual([{ codigo_produto: '001', agrupamento_cod: 'M005' }]);
    } finally { await db.close(); }
  });
});
