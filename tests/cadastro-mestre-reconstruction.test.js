import { beforeAll, beforeEach, afterAll, describe, expect, it, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { criarManifestoCadastroMestre, criarRevisaoCadastroMestre, decidirOperacoesCadastroMestre } from '../core/cadastro-mestre-approval-engine.js';
import { criarPlanoReconstrucaoCadastroMestre } from '../core/cadastro-mestre-reconstruction-engine.js';
import { prepararAprovacaoArquivoCadastroMestre, prepararAprovacaoDadosCadastroMestre } from '../src/services/cadastro-mestre-preview.js';
import { executarReconstrucaoCadastroMestre, hashReconstrucao } from '../scripts/lib/cadastro-mestre-reconstruction.mjs';
import { arquivoCadastro, contexto, SheetJS } from './fixtures/cadastro-mestre-arquivo.js';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { main, salvarSnapshotDuravel } from '../scripts/reconstruir-cadastro-mestre.mjs';
import { criarCadastroMestreWebHandler } from '../scripts/lib/cadastro-mestre-web.mjs';
import { ambienteWeb, respostaWeb, storageWeb } from './fixtures/cadastro-mestre-web.js';
import { arquivoComercial } from './fixtures/cadastro-mestre-comercial.js';
import { arquivoFamilias } from './fixtures/cadastro-mestre-familias.js';

const aprovar = m => decidirOperacoesCadastroMestre(m, criarRevisaoCadastroMestre(m), m.operacoes.filter(o => o.aprovavel).map(o => o.id), 'APROVADO');
describe('Contrato do universo — preparação pura', () => {
  it('ausente/filtrado vira remoção revisável e vazio de pertencente preserva campo', async () => {
    const { manifesto } = await prepararAprovacaoArquivoCadastroMestre(arquivoCadastro(), contexto, SheetJS);
    const plano = criarPlanoReconstrucaoCadastroMestre(manifesto, aprovar(manifesto));
    expect(plano.resumo).toEqual({ antes: 8, depois: 4, inseridos: 1, atualizados: 1, removidos: 5 });
    expect(plano.universo).toEqual(['001', '002', '008', '1000']);
    expect(plano.esperados.find(p => p.codigo_produto === '002').calculado).toEqual(contexto.produtos[1]);
    expect(manifesto.operacoes.filter(o => o.acao === 'DELETE').every(o => o.tabela === 'dicionario_master_produtos')).toBe(true);
    expect(() => criarPlanoReconstrucaoCadastroMestre(manifesto, criarRevisaoCadastroMestre(manifesto))).toThrow('Todas');
    const r = decidirOperacoesCadastroMestre(manifesto, aprovar(manifesto), [manifesto.operacoes.find(o => o.acao === 'DELETE').id], 'REJEITADO');
    expect(() => criarPlanoReconstrucaoCadastroMestre(manifesto, r)).toThrow('Todas');
  });
  it.each([{ rows: [] }, { rows: [{ codigo_produto: '001', tipo: 'P', descr_origem: 'Produzido', descricao: 'A' }, { codigo_produto: '001', tipo: 'P', descr_origem: 'Produzido', descricao: 'B' }] }])('universo vazio/erro de identidade bloqueia remoções e execução', ({ rows }) => {
    const m = criarManifestoCadastroMestre(rows, contexto, { modo: 'RECONSTRUCAO_UNIVERSO' });
    expect(m.reconstrucao_bloqueada).toBe(true);
    expect(m.operacoes.every(o => !o.aprovavel)).toBe(true);
    expect(() => criarPlanoReconstrucaoCadastroMestre(m, criarRevisaoCadastroMestre(m))).toThrow('bloqueada');
  });
  it('exemplo informado pelo usuário: 6.230 → 860, 853 existentes + 7 novos, 4.853 remoções', () => {
    // Contagens reais informadas pelo usuário; registros desta prova são sintéticos.
    const produtos = Array.from({ length: 5706 }, (_, i) => ({ codigo_produto: String(i + 1), descricao: 'Atual', origem_cod: '01', familia_cod: 'F1', agrupamento_erp_valor: 'P005' }));
    const rows = [
      ...produtos.map((p, i) => ({ ...p, descricao: i < 517 ? '' : p.descricao, tipo: i < 853 ? 'P' : 'D', descr_origem: 'Produzido' })),
      ...Array.from({ length: 7 }, (_, i) => ({ codigo_produto: String(6000 + i), descricao: 'Novo', origem_cod: '01', familia_cod: 'F1', agrupamento_erp_valor: 'P005', tipo: 'C', descr_origem: 'Revenda' })),
      ...Array.from({ length: 517 }, (_, i) => ({ codigo_produto: String(7000 + i), descricao: 'Excluído', tipo: 'D', descr_origem: 'Produzido' }))
    ];
    const m = criarManifestoCadastroMestre(rows, { ...contexto, produtos }, { modo: 'RECONSTRUCAO_UNIVERSO' });
    expect(m.resumo).toMatchObject({ linhas_lidas: 6230, produtos_com_preview: 860, produtos_existentes: 853, novos_produtos: 7,
      produtos_a_remover: 4853, produtos_master_antes: 5706, produtos_master_depois: 860, preservacoes_campos: 517 });
    expect(criarPlanoReconstrucaoCadastroMestre(m, aprovar(m)).resumo).toMatchObject({ depois: 860, removidos: 4853, inseridos: 7 });
  });
});

describe('Executor — PostgreSQL real em memória, sem Supabase', () => {
  let db;
  let client;
  let evidencia;
  let dadosExecucao;
  let snapshot;
  let before;
  const protegidas = ['apontamentos_op', 'categorias_agrupamento', 'dicionario_produtos', 'historico_custos', 'mapa_produtos'];
  beforeAll(async () => { db = await PGlite.create(); }, 20000);
  afterAll(async () => { await db.close(); });
  beforeEach(async () => {
    await db.exec(`DROP SCHEMA public CASCADE; CREATE SCHEMA public;
      CREATE TABLE log_importacao_cadastro_mestre (id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
        arquivo_nome text NOT NULL, tipo_arquivo text NOT NULL, arquivo_hash text, identificador_lote text,
        fonte_sistema text DEFAULT 'ERP',status text DEFAULT 'processando',total_registros int DEFAULT 0,
        registros_processados int DEFAULT 0,registros_inseridos int DEFAULT 0,registros_atualizados int DEFAULT 0,
        registros_erro int DEFAULT 0,erros jsonb DEFAULT '[]',metadados_origem jsonb DEFAULT '{}',
        criado_em timestamptz DEFAULT now(),iniciado_em timestamptz DEFAULT now(),finalizado_em timestamptz);
      CREATE TABLE dicionario_master_produtos (codigo_produto text PRIMARY KEY,descricao text,origem_cod text,familia_cod text,
        agrupamento_erp_valor text,agrupamento_comercial_erp_cod text,agrupamento_comercial_erp_descricao text,ultima_importacao_cadastro_mestre_id bigint REFERENCES log_importacao_cadastro_mestre(id),
        agrupamento_erp_importacao_id bigint REFERENCES log_importacao_cadastro_mestre(id),
        criado_em timestamptz DEFAULT now(),atualizado_em timestamptz DEFAULT now());
      CREATE TABLE categorias_origem (id text PRIMARY KEY,codigo text,descricao text);
      CREATE TABLE categorias_familia (id text PRIMARY KEY DEFAULT gen_random_uuid(),codigo text UNIQUE,descricao text NOT NULL,criado_em timestamptz DEFAULT now());
      ${protegidas.map(t => `CREATE TABLE ${t} (codigo text PRIMARY KEY,conteudo jsonb${t === 'historico_custos' ? ',log_importacao_id bigint NULL' : ''});
        INSERT INTO ${t} VALUES ('003','{"fato":"intacto"}'${t === 'historico_custos' ? ',NULL' : ''});`).join('\n')}`);
    for (const table of ['categorias_origem', 'categorias_familia']) {
      const rows = table === 'categorias_origem' ? contexto.origens : contexto.familias;
      await db.query(`INSERT INTO ${table} (id,codigo,descricao) SELECT * FROM jsonb_to_recordset($1::jsonb) AS x(id text,codigo text,descricao text)`, [JSON.stringify(rows)]);
    }
    for (const p of contexto.produtos) await db.query(`INSERT INTO dicionario_master_produtos
      (codigo_produto,descricao,origem_cod,familia_cod,agrupamento_erp_valor) VALUES ($1,$2,$3,$4,$5)`, [p.codigo_produto, p.descricao, p.origem_cod, p.familia_cod, p.agrupamento_erp_valor]);
    client = { query: vi.fn((sql, params) => db.query(sql, params)) };
    before = await ctx();
    const result = await prepararAprovacaoArquivoCadastroMestre(arquivoCadastro(), before, SheetJS);
    evidencia = { manifesto: result.manifesto, revisao: aprovar(result.manifesto) };
    dadosExecucao = result.dadosExecucao;
    snapshot = vi.fn(async () => {});
  });
  async function ctx() {
    const table = async (name, fields, key) => (await db.query(`SELECT to_jsonb(t) AS registro FROM (SELECT ${fields} FROM ${name} ORDER BY ${key}) t`)).rows.map(r => r.registro);
    return { produtos: await table('dicionario_master_produtos', '*', 'codigo_produto'),
      origens: await table('categorias_origem', 'id,codigo,descricao', 'id'), familias: await table('categorias_familia', 'id,codigo,descricao', 'id') };
  }
  const executar = (overrides = {}) => executarReconstrucaoCadastroMestre({ client, arquivo: arquivoCadastro(), evidencia, leitor: SheetJS,
    identificadorLote: 'TESTE_LOCAL', autor: 'Teste sintético', confirmacao: `RECONSTRUIR_MASTER:${hashReconstrucao(evidencia.manifesto)}`,
    salvarSnapshot: snapshot, ...overrides });

  async function chamadaWeb({ formato = 'xls', arquivoOverride, transform = p => p, storageOverride } = {}) {
    const arquivo = arquivoOverride || arquivoCadastro(formato);
    const preparado = await prepararAprovacaoArquivoCadastroMestre(arquivo, before, SheetJS);
    const manifest = preparado.manifesto;
    const pedido = await transform({ dados_execucao: preparado.dadosExecucao,
      decisoes: aprovar(manifest).decisoes, hash_manifesto: hashReconstrucao(manifest),
      confirmacao: `RECONSTRUIR_MASTER:${hashReconstrucao(manifest)}`, lote: 'CAD_UI_11111111-1111-4111-8111-111111111111' });
    const storage = storageOverride || storageWeb();
    client.connect = vi.fn(async () => {});
    client.end = vi.fn(async () => {});
    const handler = criarCadastroMestreWebHandler({ env: ambienteWeb, criarSupabase: storage.criarSupabase, criarClientePg: () => client, leitor: SheetJS });
    const res = respostaWeb();
    await handler({ method: 'POST', headers: { authorization: 'Bearer test', origin: ambienteWeb.CADASTRO_MESTRE_APP_ORIGIN }, body: pedido }, res);
    return { res, storage, handler, pedido };
  }

  it.each(['xls', 'xlsx', 'xlsm'])('HTTP %s reutiliza executor real e confirma snapshot privado antes do DML', async formato => {
    const storage = storageWeb();
    const original = client.query;
    client.query = vi.fn(async (sql, params) => {
      if (sql.startsWith('INSERT INTO public.dicionario_master_produtos')) {
        expect(storage.upload).toHaveBeenCalledOnce();
        expect(storage.download).toHaveBeenCalledOnce();
      }
      return original(sql, params);
    });
    const { res } = await chamadaWeb({ formato, storageOverride: storage });
    expect(res.code).toBe(200);
    expect(res.body).toMatchObject({ status: 'concluido', antes: 8, depois: 4, inseridos: 1, atualizados: 1, removidos: 5 });
    expect((await ctx()).produtos.map(p => p.codigo_produto)).toEqual(['001', '002', '008', '1000']);
    const log = (await db.query('SELECT * FROM log_importacao_cadastro_mestre')).rows[0];
    expect(log.metadados_origem.autor).toBe('supabase-auth:admin-id');
    expect(log.metadados_origem.snapshot_referencia).toBe(res.body.snapshot_referencia);
    expect(log.metadados_origem.snapshot_master).toEqual(before.produtos);
    expect(storage.upload.mock.calls[0][2].upsert).toBe(false);
    for (const t of protegidas) expect((await db.query(`SELECT * FROM ${t}`)).rows).toEqual([{ codigo: '003', conteudo: { fato: 'intacto' }, ...(t === 'historico_custos' ? { log_importacao_id: null } : {}) }]);
    const consulta = respostaWeb();
    await (await chamadaHandlerSomenteConsulta(storage))({ method: 'GET', headers: { authorization: 'Bearer test' }, query: { lote: res.body.identificador_lote } }, consulta);
    expect(consulta.body.resultado.status).toBe('concluido');
    expect(client.query.mock.calls.at(-1)[0]).toMatch(/^SELECT /);
  });
  function chamadaHandlerSomenteConsulta(storage) {
    return criarCadastroMestreWebHandler({ env: ambienteWeb, criarSupabase: storage.criarSupabase, criarClientePg: () => client, leitor: SheetJS });
  }

  it('diagnóstico de deploy usa PostgreSQL em READ ONLY sem alterar estado ou salvar snapshot', async () => {
    const storage = storageWeb();
    client.connect = vi.fn();
    client.end = vi.fn();
    const handler = criarCadastroMestreWebHandler({ env: { ...ambienteWeb, CADASTRO_MESTRE_EXECUTION_ENABLED: 'false' },
      criarSupabase: storage.criarSupabase, criarClientePg: () => client, leitor: SheetJS });
    const res = respostaWeb();
    await handler({ method: 'GET', headers: { authorization: 'Bearer test' }, query: { verificar: '1' } }, res);
    expect(res.code).toBe(200);
    expect(res.body).toMatchObject({ pronto_para_habilitar: true, master_atual: 8, execucao_habilitada: false, execucao_realizada: false });
    expect(client.query.mock.calls.every(([sql]) => /^(BEGIN READ ONLY|SET LOCAL|SELECT|ROLLBACK)/.test(sql))).toBe(true);
    expect((await ctx()).produtos).toEqual(before.produtos);
    expect((await db.query('SELECT * FROM log_importacao_cadastro_mestre')).rows).toEqual([]);
    expect(storage.upload).not.toHaveBeenCalled();
    expect(storage.download).not.toHaveBeenCalled();
    for (const t of protegidas) expect((await db.query(`SELECT * FROM ${t}`)).rows).toEqual([{ codigo: '003', conteudo: { fato: 'intacto' }, ...(t === 'historico_custos' ? { log_importacao_id: null } : {}) }]);
  });

  it.each(['upload', 'download', 'publico'])('falha de snapshot %s reverte log antes de qualquer alteração no Master', async etapa => {
    const storage = storageWeb();
    if (etapa === 'upload') storage.upload.mockResolvedValue({ error: new Error('secret-test') });
    if (etapa === 'download') storage.download.mockResolvedValue({ data: new Blob(['corrompido']), error: null });
    if (etapa === 'publico') storage.storage.getBucket.mockResolvedValue({ data: { public: true }, error: null });
    const { res } = await chamadaWeb({ storageOverride: storage });
    expect(res.code).toBe(503);
    expect((await ctx()).produtos).toEqual(before.produtos);
    expect((await db.query('SELECT * FROM log_importacao_cadastro_mestre')).rows).toEqual([]);
    expect(JSON.stringify(res.body)).not.toContain('secret-test');
    expect(client.query.mock.calls.some(([sql]) => /^(INSERT INTO|UPDATE|DELETE FROM) public.dicionario_master_produtos/.test(sql))).toBe(false);
  });

  it('HTTP recusa decisões faltantes ou hash antigo sem log/escrita', async () => {
    let result = await chamadaWeb({ transform: p => ({ ...p, decisoes: p.decisoes.slice(1) }) });
    expect(result.res.code).toBe(400);
    await db.query("UPDATE dicionario_master_produtos SET descricao='externo' WHERE codigo_produto='002'");
    result = await chamadaWeb();
    expect(result.res.code).toBe(409);
    expect((await db.query('SELECT * FROM log_importacao_cadastro_mestre')).rows).toEqual([]);
    expect(result.storage.upload).not.toHaveBeenCalled();
  });

  it.each([
    ['descrição', linhas => { linhas[0][2] = 'Valor adulterado'; }],
    ['remoção de linha válida', linhas => { linhas.splice(0, 1); }],
    ['remoção de linha filtrada', linhas => { linhas.splice(2, 1); }],
    ['alteração de filtro', linhas => { linhas[2][3] = 'P'; }],
    ['inclusão no universo', linhas => { linhas.push([90, '999', 'Novo não aprovado', 'P', 'Produzido', '01', 'F1', 'P005']); }]
  ])('HTTP recusa %s nos dados depois da aprovação sem log/snapshot/DML', async (_nome, alterar) => {
    const { res, storage } = await chamadaWeb({ transform: p => { alterar(p.dados_execucao.linhas); return p; } });
    expect([400, 409]).toContain(res.code);
    expect((await ctx()).produtos).toEqual(before.produtos);
    expect((await db.query('SELECT * FROM log_importacao_cadastro_mestre')).rows).toEqual([]);
    expect(storage.upload).not.toHaveBeenCalled();
    expect(client.query.mock.calls.some(([sql]) => /^(INSERT INTO|UPDATE|DELETE FROM) public\./.test(sql))).toBe(false);
  });

  it.each(['universo', 'patches', 'sql', 'arquivo_base64', 'familias', 'catalogo_familias'])('HTTP não aceita campo %s como substituto do motor do servidor', async campo => {
    const { res, storage } = await chamadaWeb({ transform: p => ({ ...p, [campo]: ['999'] }) });
    expect(res.code).toBe(400);
    expect(client.connect).not.toHaveBeenCalled();
    expect(storage.upload).not.toHaveBeenCalled();
    expect((await db.query('SELECT * FROM log_importacao_cadastro_mestre')).rows).toEqual([]);
  });

  it('servidor bloqueia universo filtrado vazio mesmo com novo hash e decisões declaradas aprovadas', async () => {
    const { res, storage } = await chamadaWeb({ transform: async p => {
      p.dados_execucao.linhas.forEach(row => { row[3] = 'D'; });
      const { manifesto } = await prepararAprovacaoDadosCadastroMestre(p.dados_execucao, before);
      const hash = hashReconstrucao(manifesto);
      return { ...p, hash_manifesto: hash, confirmacao: `RECONSTRUIR_MASTER:${hash}`,
        decisoes: manifesto.operacoes.map(o => ({ id: o.id, status: 'APROVADO' })) };
    } });
    expect(res.code).toBe(400);
    expect(storage.upload).not.toHaveBeenCalled();
    expect((await ctx()).produtos).toEqual(before.produtos);
    expect((await db.query('SELECT * FROM log_importacao_cadastro_mestre')).rows).toEqual([]);
    expect(client.query.mock.calls.every(([sql]) => /^(BEGIN READ ONLY|SET LOCAL|SELECT|ROLLBACK)/.test(sql))).toBe(true);
  });

  it('executor compacto relê o contexto sob locks e rejeita mudança depois da aprovação HTTP', async () => {
    const original = client.query;
    let mudou = false;
    client.query = vi.fn(async (sql, params) => {
      if (!mudou && sql.startsWith('LOCK TABLE')) {
        mudou = true;
        await db.query("UPDATE dicionario_master_produtos SET descricao='Mudança concorrente' WHERE codigo_produto='002'");
      }
      return original(sql, params);
    });
    const { res, storage } = await chamadaWeb();
    expect(res.code).toBe(409);
    expect(storage.upload).not.toHaveBeenCalled();
    expect((await db.query('SELECT * FROM log_importacao_cadastro_mestre')).rows).toEqual([]);
    expect((await ctx()).produtos).toEqual(before.produtos);
  });

  it('executor compacto central executa sem arquivo nem SheetJS e preserva snapshot e vazios', async () => {
    const result = await executar({ arquivo: undefined, leitor: undefined, dadosExecucao });
    expect(result).toMatchObject({ antes: 8, depois: 4, inseridos: 1, atualizados: 1, removidos: 5 });
    expect(snapshot).toHaveBeenCalledOnce();
    expect((await ctx()).produtos.find(p => p.codigo_produto === '002')).toEqual(before.produtos.find(p => p.codigo_produto === '002'));
    for (const t of protegidas) expect((await db.query(`SELECT * FROM ${t}`)).rows).toEqual([{ codigo: '003', conteudo: { fato: 'intacto' }, ...(t === 'historico_custos' ? { log_importacao_id: null } : {}) }]);
  });

  it('executor compacto recusa dados incompatíveis com o manifesto sob locks sem snapshot', async () => {
    const alterado = globalThis.structuredClone(dadosExecucao);
    alterado.linhas[0][1] = '999';
    await expect(executar({ arquivo: undefined, leitor: undefined, dadosExecucao: alterado })).rejects.toThrow(/dados|contexto|Preview|Arquivo/i);
    expect(snapshot).not.toHaveBeenCalled();
    expect((await ctx()).produtos).toEqual(before.produtos);
    expect((await db.query('SELECT * FROM log_importacao_cadastro_mestre')).rows).toEqual([]);
  });

  it('erro SQL pelo HTTP executa rollback central e consulta retorna falhou sem retry', async () => {
    const original = client.query;
    let falhou = false;
    client.query = vi.fn(async (sql, params) => {
      if (!falhou && sql.startsWith('DELETE FROM public.dicionario_master_produtos')) { falhou = true; return db.query('SELECT 1/0'); }
      return original(sql, params);
    });
    const { res, storage, handler, pedido } = await chamadaWeb();
    expect(res.code).toBe(409);
    expect(res.body.consultar_lote).toBe(true);
    expect((await ctx()).produtos).toEqual(before.produtos);
    expect(storage.arquivos.size).toBe(1);
    const consulta = respostaWeb();
    await handler({ method: 'GET', headers: { authorization: 'Bearer test' }, query: { lote: pedido.lote } }, consulta);
    expect(consulta.body.resultado.status).toBe('falhou');
    expect(consulta.body.resultado.inseridos).toBe(0);
    expect(consulta.body.resultado.snapshot_referencia).toContain('storage://');
    for (const t of protegidas) expect((await db.query(`SELECT * FROM ${t}`)).rows).toEqual([{ codigo: '003', conteudo: { fato: 'intacto' }, ...(t === 'historico_custos' ? { log_importacao_id: null } : {}) }]);
  });

  it('insere novo, atualiza existente, remove filtrados/ausente e registra snapshot/lote', async () => {
    const result = await executar();
    expect(result).toMatchObject({ status: 'concluido', antes: 8, depois: 4, inseridos: 1, atualizados: 1, removidos: 5 });
    const after = await ctx();
    expect(after.produtos.map(p => p.codigo_produto)).toEqual(['001', '002', '008', '1000']);
    expect(after.produtos[1]).toEqual(before.produtos.find(p => p.codigo_produto === '002'));
    const lote = (await db.query('SELECT * FROM log_importacao_cadastro_mestre')).rows[0];
    expect(lote.status).toBe('concluido');
    expect(lote.metadados_origem.snapshot_master).toEqual(before.produtos);
    expect(lote.metadados_origem.registros_removidos).toBe(5);
    expect(lote.metadados_origem.snapshot_sha256).toBe(hashReconstrucao(before.produtos));
    expect(snapshot.mock.calls[0][0].snapshot_master).toEqual(before.produtos);
    for (const t of protegidas) expect((await db.query(`SELECT * FROM ${t}`)).rows).toEqual([{ codigo: '003', conteudo: { fato: 'intacto' }, ...(t === 'historico_custos' ? { log_importacao_id: null } : {}) }]);
  });

  it('origem/família ERP preenchidas atualizam os códigos brutos do Master', async () => {
    await db.query("UPDATE dicionario_master_produtos SET origem_cod='99',familia_cod='F9' WHERE codigo_produto='001'");
    before = await ctx();
    const { manifesto } = await prepararAprovacaoArquivoCadastroMestre(arquivoCadastro(), before, SheetJS);
    evidencia = { manifesto, revisao: aprovar(manifesto) };
    const result = await executar();
    expect(result.atualizados).toBe(1);
    expect((await ctx()).produtos.find(p => p.codigo_produto === '001')).toMatchObject({ origem_cod: '01', familia_cod: 'F1', agrupamento_erp_valor: 'P801' });
    for (const t of protegidas) expect((await db.query(`SELECT * FROM ${t}`)).rows).toEqual([{ codigo: '003', conteudo: { fato: 'intacto' }, ...(t === 'historico_custos' ? { log_importacao_id: null } : {}) }]);
  });

  it('ERP vazio preserva origem/família mesmo quando descrição e agrupamento do produto são atualizados', async () => {
    const workbook = SheetJS.read(await arquivoCadastro().arrayBuffer(), { type: 'array', cellNF: true });
    workbook.Sheets.Cadastro.E4 = { t: 's', v: '' };
    workbook.Sheets.Cadastro.F4 = { t: 's', v: '' };
    const bytes = SheetJS.write(workbook, { type: 'array', bookType: 'xls' });
    const arquivo = { name: 'cadastro.xls', arrayBuffer: async () => bytes };
    const { manifesto } = await prepararAprovacaoArquivoCadastroMestre(arquivo, before, SheetJS);
    evidencia = { manifesto, revisao: aprovar(manifesto) };
    const result = await executar({ arquivo });
    const atual = (await ctx()).produtos.find(p => p.codigo_produto === '001');
    expect(result.atualizados).toBe(1);
    expect(atual).toMatchObject({ descricao: 'Descrição atualizada çã', origem_cod: '01', familia_cod: 'F1', agrupamento_erp_valor: 'P801' });
    expect(atual.criado_em).toBe(before.produtos.find(p => p.codigo_produto === '001').criado_em);
  });

  it.each(['INSERT INTO public.dicionario_master_produtos', 'UPDATE public.dicionario_master_produtos', 'DELETE FROM public.dicionario_master_produtos', "UPDATE public.log_importacao_cadastro_mestre SET status='concluido'"])(
    'erro em %s reverte o Master inteiro e preserva snapshot/log falhou', async alvo => {
      const original = client.query;
      let injetado = false;
      client.query = vi.fn(async (sql, params) => {
        if (!injetado && sql.startsWith(alvo)) { injetado = true; return db.query('SELECT 1/0'); }
        return original(sql, params);
      });
      await expect(executar()).rejects.toThrow('revertida integralmente');
      expect((await ctx()).produtos).toEqual(before.produtos);
      const log = (await db.query('SELECT * FROM log_importacao_cadastro_mestre')).rows[0];
      expect(log).toMatchObject({ status: 'falhou', registros_inseridos: 0, registros_atualizados: 0, registros_processados: 0 });
      expect(log.metadados_origem.snapshot_master).toEqual(before.produtos);
      expect(log.metadados_origem.registros_removidos).toBe(0);
      expect(log.erros[0].code).toBe('22012');
      for (const t of protegidas) expect((await db.query(`SELECT count(*)::int AS n FROM ${t}`)).rows[0].n).toBe(1);
    });

  it('mudança do Master após aprovação bloqueia antes de log/DML', async () => {
    await db.query("UPDATE dicionario_master_produtos SET descricao='Alteração externa' WHERE codigo_produto='002'");
    await expect(executar()).rejects.toThrow('contexto mudou');
    expect(snapshot).not.toHaveBeenCalled();
    expect((await db.query('SELECT * FROM log_importacao_cadastro_mestre')).rows).toEqual([]);
    expect((await ctx()).produtos).toHaveLength(8);
  });

  it('arquivo diferente da revisão é recusado antes de qualquer escrita', async () => {
    await expect(executar({ arquivo: arquivoCadastro('xlsx') })).rejects.toThrow('Arquivo ou contexto mudou');
    expect(snapshot).not.toHaveBeenCalled();
    expect((await ctx()).produtos).toEqual(before.produtos);
    expect((await db.query('SELECT * FROM log_importacao_cadastro_mestre')).rows).toEqual([]);
  });

  it('resultado incerto de COMMIT exige consulta ao lote e não repete a carga', async () => {
    const original = client.query;
    client.query = vi.fn(async (sql, params) => {
      const result = await original(sql, params);
      if (sql === 'COMMIT') throw new Error('Conexão encerrada após enviar COMMIT');
      return result;
    });
    await expect(executar()).rejects.toThrow('COMMIT não confirmado');
    expect((await db.query('SELECT status FROM log_importacao_cadastro_mestre')).rows).toEqual([{ status: 'concluido' }]);
    expect((await ctx()).produtos).toHaveLength(4);
    expect(snapshot).toHaveBeenCalledOnce();
    expect(client.query.mock.calls.filter(([sql]) => sql === 'COMMIT')).toHaveLength(1);
  });

  it('falha no snapshot durável impede qualquer remoção', async () => {
    await expect(executar({ salvarSnapshot: async () => { throw new Error('Disco indisponível'); } })).rejects.toThrow('Disco');
    expect((await ctx()).produtos).toEqual(before.produtos);
    expect((await db.query('SELECT * FROM log_importacao_cadastro_mestre')).rows).toEqual([]);
    expect(client.query.mock.calls.some(([sql]) => sql.startsWith('DELETE FROM'))).toBe(false);
  });

  it('dependência com CASCADE é bloqueada antes de tocar fatos', async () => {
    await db.exec('CREATE TABLE dependencia (codigo text REFERENCES dicionario_master_produtos(codigo_produto) ON DELETE CASCADE)');
    await expect(executar()).rejects.toThrow('Dependências');
    expect((await ctx()).produtos).toEqual(before.produtos);
  });

  it('conexão limitada por RLS falha em vez de reconstruir um universo parcialmente visível', async () => {
    await db.exec(`CREATE ROLE cad_rebuild_limitado;
      GRANT USAGE ON SCHEMA public TO cad_rebuild_limitado;
      GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO cad_rebuild_limitado;
      GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO cad_rebuild_limitado;
      ALTER TABLE dicionario_master_produtos ENABLE ROW LEVEL SECURITY;
      SET ROLE cad_rebuild_limitado;`);
    try {
      await expect(executar()).rejects.toThrow('row-level security');
      expect(snapshot).not.toHaveBeenCalled();
    } finally { await db.exec('RESET ROLE; DROP OWNED BY cad_rebuild_limitado; DROP ROLE cad_rebuild_limitado;'); }
    expect((await ctx()).produtos).toEqual(before.produtos);
    expect((await db.query('SELECT * FROM log_importacao_cadastro_mestre')).rows).toEqual([]);
  });

  it('aprovação parcial/confirmacão ausente não inicia transação', async () => {
    await expect(executar({ confirmacao: '' })).rejects.toThrow('Confirmação');
    expect(client.query).not.toHaveBeenCalled();
    const r = criarRevisaoCadastroMestre(evidencia.manifesto);
    await expect(executar({ evidencia: { ...evidencia, revisao: r } })).rejects.toThrow('Todas');
    expect(client.query).not.toHaveBeenCalled();
  });

  it('lote repetido é bloqueado e exige nova revisão', async () => {
    await executar();
    await expect(executar()).rejects.toThrow('já registrado');
    expect((await db.query('SELECT * FROM log_importacao_cadastro_mestre')).rows).toHaveLength(1);
    expect((await ctx()).produtos).toHaveLength(4);
  });

  async function prepararFamilias() {
    const arquivo = await arquivoFamilias();
    const preparado = await prepararAprovacaoArquivoCadastroMestre(arquivo, before, SheetJS);
    evidencia = { manifesto: preparado.manifesto, revisao: aprovar(preparado.manifesto) };
    dadosExecucao = preparado.dadosExecucao;
    return arquivo;
  }
  const familiasIntegrais = async () => (await db.query('SELECT to_jsonb(f) AS registro FROM categorias_familia f ORDER BY id')).rows.map(r => r.registro);

  it('HTTP executa famílias e Master na mesma transação, com snapshot parcial do catálogo e auditoria', async () => {
    await db.query("INSERT INTO categorias_familia(id,codigo,descricao) VALUES ('legado',NULL,'Sem código legado')");
    before = await ctx();
    const familiasAntes = await familiasIntegrais();
    const original = client.query;
    const storage = storageWeb();
    client.query = vi.fn(async (sql, params) => {
      if (/^(INSERT INTO|UPDATE) public.categorias_familia/.test(sql)) {
        expect(storage.upload).toHaveBeenCalledOnce();
        expect(storage.download).toHaveBeenCalledOnce();
        expect(client.query.mock.calls.some(([s]) => s === 'SAVEPOINT reconstruir_master')).toBe(true);
      }
      return original(sql, params);
    });
    const { res, handler, pedido } = await chamadaWeb({ arquivoOverride: await prepararFamilias(), storageOverride: storage });
    expect(res.code).toBe(200);
    expect(res.body).toMatchObject({ depois: 4, familias: { inseridas: 2, atualizadas: 1 } });
    const depois = await familiasIntegrais();
    expect(depois.find(f => f.id === 'f')).toEqual({ ...familiasAntes.find(f => f.id === 'f'), descricao: 'Família atualizada' });
    expect(depois.find(f => f.id === 'legado')).toEqual(familiasAntes.find(f => f.id === 'legado'));
    expect(depois.filter(f => f.descricao === 'Mesmo rótulo').map(f => f.codigo).sort()).toEqual(['0002', 'F3']);
    expect(depois.some(f => f.codigo === 'FORA')).toBe(false);
    const log = (await db.query('SELECT * FROM log_importacao_cadastro_mestre')).rows[0];
    expect(log.metadados_origem.snapshot_familias_afetadas).toEqual([
      { codigo: '0002', anterior: null }, { codigo: 'F1', anterior: familiasAntes.find(f => f.id === 'f') }, { codigo: 'F3', anterior: null }
    ]);
    const snapshotDuravel = JSON.parse([...storage.arquivos.values()][0].toString());
    expect(snapshotDuravel.snapshot_familias_afetadas).toEqual(log.metadados_origem.snapshot_familias_afetadas);
    expect(snapshotDuravel.snapshot_master).toEqual(before.produtos);
    expect(log.metadados_origem.catalogo_familias).toMatchObject({ registros_inseridos: 2, registros_atualizados: 1, rejeitadas: 0 });
    expect(log.metadados_origem.catalogo_familias.operacoes.find(o => o.acao === 'UPDATE')).toMatchObject({
      atual: { id: 'f', codigo: 'F1', descricao: 'Família teste' }, dados: { descricao: 'Família atualizada' }, quantidade_produtos: 2
    });
    expect(client.query.mock.calls.filter(([sql]) => sql === 'BEGIN')).toHaveLength(1);
    expect(client.query.mock.calls.at(-1)[0]).toBe('COMMIT');
    expect(client.query.mock.calls.some(([sql]) => /LOCK TABLE .*categorias_familia IN EXCLUSIVE MODE NOWAIT/.test(sql))).toBe(true);
    for (const t of protegidas) expect((await db.query(`SELECT * FROM ${t}`)).rows).toEqual([{ codigo: '003', conteudo: { fato: 'intacto' }, ...(t === 'historico_custos' ? { log_importacao_id: null } : {}) }]);
    const consulta = respostaWeb();
    await handler({ method: 'GET', headers: { authorization: 'Bearer test' }, query: { lote: pedido.lote } }, consulta);
    expect(consulta.body.resultado).toMatchObject({ familias_inseridas: 2, familias_atualizadas: 1 });
  });

  it.each(['INSERT INTO public.categorias_familia', 'UPDATE public.categorias_familia', "UPDATE public.log_importacao_cadastro_mestre SET status='concluido'"])(
    'erro SQL em %s reverte Master e catálogo integralmente, preservando snapshot e lote falhou', async alvo => {
      const arquivo = await prepararFamilias();
      const familiasAntes = await familiasIntegrais();
      const original = client.query;
      let falhou = false;
      client.query = vi.fn(async (sql, params) => {
        if (!falhou && sql.startsWith(alvo)) { falhou = true; return db.query('SELECT 1/0'); }
        return original(sql, params);
      });
      await expect(executar({ arquivo })).rejects.toThrow('revertida integralmente');
      expect(falhou).toBe(true);
      expect((await ctx()).produtos).toEqual(before.produtos);
      expect(await familiasIntegrais()).toEqual(familiasAntes);
      expect(snapshot.mock.calls[0][0].snapshot_familias_afetadas).toHaveLength(3);
      const log = (await db.query('SELECT * FROM log_importacao_cadastro_mestre')).rows[0];
      expect(log).toMatchObject({ status: 'falhou', registros_inseridos: 0, registros_atualizados: 0, registros_erro: 1 });
      expect(log.metadados_origem.catalogo_familias).toMatchObject({ registros_inseridos: 0, registros_atualizados: 0 });
      for (const t of protegidas) expect((await db.query(`SELECT * FROM ${t}`)).rows).toEqual([{ codigo: '003', conteudo: { fato: 'intacto' }, ...(t === 'historico_custos' ? { log_importacao_id: null } : {}) }]);
    });

  it('constraint real em família aborta a reconstrução depois do DML do Master, sem estado parcial', async () => {
    await db.exec("ALTER TABLE categorias_familia ADD CHECK (codigo IS DISTINCT FROM 'F3')");
    const familiasAntes = await familiasIntegrais();
    await expect(executar({ arquivo: await prepararFamilias() })).rejects.toThrow('revertida integralmente');
    expect((await ctx()).produtos).toEqual(before.produtos);
    expect(await familiasIntegrais()).toEqual(familiasAntes);
    expect((await db.query('SELECT erros FROM log_importacao_cadastro_mestre')).rows[0].erros[0].code).toBe('23514');
  });

  it.each(["criado_em=now()+interval '1 day'", "codigo='OUTRO'", "id='id-alterado'"])(
    'prova integral recusa alteração não aprovada de família (%s) e restaura tudo', async setter => {
      const arquivo = await prepararFamilias();
      const familiasAntes = await familiasIntegrais();
      const original = client.query;
      client.query = vi.fn(async (sql, params) => {
        const result = await original(sql, params);
        if (sql.startsWith('UPDATE public.categorias_familia')) await db.query(`UPDATE categorias_familia SET ${setter} WHERE id='f'`);
        return result;
      });
      await expect(executar({ arquivo })).rejects.toThrow('revertida integralmente');
      expect((await ctx()).produtos).toEqual(before.produtos);
      expect(await familiasIntegrais()).toEqual(familiasAntes);
    });

  it('alteração em família fora das propostas é detectada pela proteção própria do catálogo', async () => {
    await db.query("INSERT INTO categorias_familia VALUES ('intocada','NAO_USADA','Intocada',now())");
    before = await ctx();
    const familiasAntes = await familiasIntegrais();
    const arquivo = await prepararFamilias();
    const original = client.query;
    client.query = vi.fn(async (sql, params) => {
      const result = await original(sql, params);
      if (sql.startsWith('UPDATE public.categorias_familia')) await db.query("UPDATE categorias_familia SET descricao='Adulterada' WHERE id='intocada'");
      return result;
    });
    await expect(executar({ arquivo })).rejects.toThrow('revertida integralmente');
    expect(await familiasIntegrais()).toEqual(familiasAntes);
  });

  it.each(['rotulo', 'decisao', 'versao_antiga'])('HTTP rejeita %s de família adulterado/sem aprovação sem log ou snapshot', async caso => {
    const familiasAntes = await familiasIntegrais();
    const { res, storage } = await chamadaWeb({ arquivoOverride: await prepararFamilias(), transform: p => {
      if (caso === 'rotulo') p.dados_execucao.linhas[0][8] = 'Não aprovado';
      if (caso === 'decisao') p.decisoes = p.decisoes.filter(d => !d.id.startsWith('ATUALIZAR_ROTULO_FAMILIA_ERP:'));
      if (caso === 'versao_antiga') p.dados_execucao.versao_transporte = 'CADASTRO_MESTRE_DADOS_V1';
      return p;
    } });
    expect([400, 409]).toContain(res.code);
    expect(storage.upload).not.toHaveBeenCalled();
    expect((await db.query('SELECT * FROM log_importacao_cadastro_mestre')).rows).toEqual([]);
    expect((await ctx()).produtos).toEqual(before.produtos);
    expect(await familiasIntegrais()).toEqual(familiasAntes);
  });

  it('catálogo alterado após a leitura HTTP é revalidado novamente sob locks centrais', async () => {
    const familiasAntes = await familiasIntegrais();
    const original = client.query;
    let injetada = false;
    client.query = vi.fn(async (sql, params) => {
      if (!injetada && sql.startsWith('LOCK TABLE')) {
        injetada = true;
        await db.query("UPDATE categorias_familia SET descricao='Mudou após HTTP' WHERE id='f'");
      }
      return original(sql, params);
    });
    const { res, storage } = await chamadaWeb({ arquivoOverride: await prepararFamilias() });
    expect(res.code).toBe(409);
    expect(storage.upload).not.toHaveBeenCalled();
    expect(await familiasIntegrais()).toEqual(familiasAntes);
    expect((await db.query('SELECT * FROM log_importacao_cadastro_mestre')).rows).toEqual([]);
  });

  it('trigger no catálogo bloqueia execução antes de snapshot ou DML', async () => {
    await db.exec(`CREATE FUNCTION familia_trigger() RETURNS trigger LANGUAGE plpgsql AS 'BEGIN RETURN NEW; END';
      CREATE TRIGGER familia_trigger BEFORE UPDATE ON categorias_familia FOR EACH ROW EXECUTE FUNCTION familia_trigger();`);
    await expect(executar({ arquivo: await prepararFamilias() })).rejects.toThrow('Dependências');
    expect(snapshot).not.toHaveBeenCalled();
    expect((await ctx()).produtos).toEqual(before.produtos);
  });

  it.each(['xls', 'xlsx', 'xlsm'])('CAD-COM-01 %s grava/atualiza comercial, limpa vazio para NULL, preserva snapshot e tabelas protegidas', async formato => {
    await db.query("UPDATE dicionario_master_produtos SET agrupamento_comercial_erp_cod='C012',agrupamento_comercial_erp_descricao='BISCOITO SOLTO DOCE' WHERE codigo_produto IN ('001','002')");
    before = await ctx();
    const preparado = await prepararAprovacaoArquivoCadastroMestre(arquivoComercial(formato), before, SheetJS);
    const dados = preparado.dadosExecucao;
    const pedido = { manifesto: preparado.manifesto, revisao: aprovar(preparado.manifesto) };
    const result = await executar({ arquivo: null, dadosExecucao: dados, evidencia: pedido,
      confirmacao: `RECONSTRUIR_MASTER:${hashReconstrucao(preparado.manifesto)}` });
    expect(result.status).toBe('concluido');
    const produtos = (await ctx()).produtos;
    expect(produtos).toHaveLength(3);
    expect(produtos.find(p => p.codigo_produto === '001')).toMatchObject({ agrupamento_comercial_erp_cod: 'C006', agrupamento_comercial_erp_descricao: 'BISCOITO ESPECIAL', agrupamento_erp_valor: 'P005' });
    for (const codigo of ['002', '2000']) expect(produtos.find(p => p.codigo_produto === codigo)).toMatchObject({ agrupamento_comercial_erp_cod: null, agrupamento_comercial_erp_descricao: null });
    expect(snapshot.mock.calls[0][0].snapshot_master).toEqual(before.produtos);
    const log = (await db.query('SELECT metadados_origem FROM log_importacao_cadastro_mestre')).rows[0].metadados_origem;
    expect(log.snapshot_master.find(p => p.codigo_produto === '002').agrupamento_comercial_erp_cod).toBe('C012');
    expect(log.protegidas_antes).toEqual(log.protegidas_depois);
    for (const t of protegidas) expect((await db.query(`SELECT * FROM ${t}`)).rows).toEqual([{ codigo: '003', conteudo: { fato: 'intacto' }, ...(t === 'historico_custos' ? { log_importacao_id: null } : {}) }]);
  });

  it('CAD-COM-01 erro após atualizar comercial reverte também a limpeza para NULL', async () => {
    await db.query("UPDATE dicionario_master_produtos SET agrupamento_comercial_erp_cod='C012',agrupamento_comercial_erp_descricao='BISCOITO SOLTO DOCE' WHERE codigo_produto='002'");
    before = await ctx();
    const preparado = await prepararAprovacaoArquivoCadastroMestre(arquivoComercial(), before, SheetJS);
    const original = client.query;
    client.query = vi.fn((sql, params) => sql.startsWith('DELETE FROM public.dicionario_master_produtos') ? db.query('SELECT 1/0') : original(sql, params));
    await expect(executar({ arquivo: null, dadosExecucao: preparado.dadosExecucao,
      evidencia: { manifesto: preparado.manifesto, revisao: aprovar(preparado.manifesto) },
      confirmacao: `RECONSTRUIR_MASTER:${hashReconstrucao(preparado.manifesto)}` })).rejects.toThrow('revertida integralmente');
    expect((await ctx()).produtos).toEqual(before.produtos);
    expect(snapshot.mock.calls[0][0].snapshot_master).toEqual(before.produtos);
  });

  it('CAD-COM-01 schema não preparado bloqueia antes de log/snapshot/DML', async () => {
    await db.exec('ALTER TABLE dicionario_master_produtos DROP COLUMN agrupamento_comercial_erp_cod');
    client.query.mockClear();
    await expect(executar()).rejects.toThrow();
    expect(snapshot).not.toHaveBeenCalled();
    expect(client.query.mock.calls.some(([sql]) => /^(INSERT INTO|UPDATE|DELETE FROM) public\./.test(sql))).toBe(false);
    expect((await db.query('SELECT * FROM log_importacao_cadastro_mestre')).rows).toEqual([]);
  });

});

describe('Comando administrativo e snapshot independente', () => {
  it('snapshot é persistido integralmente e recusa sobrescrever uma evidência anterior', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'kustos-rebuild-'));
    const file = join(dir, 'snapshot.json');
    try {
      const value = { snapshot_master: contexto.produtos, lote_id: '1', snapshot_sha256: hashReconstrucao(contexto.produtos),
        snapshot_familias_afetadas: [{ codigo: 'F1', anterior: contexto.familias[0] }, { codigo: 'NOVA', anterior: null }] };
      await salvarSnapshotDuravel(file, value);
      expect(JSON.parse(await readFile(file, 'utf8'))).toEqual(value);
      await expect(salvarSnapshotDuravel(file, {})).rejects.toMatchObject({ code: 'EEXIST' });
      expect(JSON.parse(await readFile(file, 'utf8'))).toEqual(value);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  it('sem --executar valida revisão local sem depender de conexão PostgreSQL', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'kustos-rebuild-'));
    const file = join(dir, 'revisao.json');
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.stubEnv('CADASTRO_MESTRE_DATABASE_URL', 'postgresql://inacessivel.invalid/banco');
    try {
      const { manifesto } = await prepararAprovacaoArquivoCadastroMestre(arquivoCadastro(), contexto, SheetJS);
      await salvarSnapshotDuravel(file, { manifesto, revisao: aprovar(manifesto) });
      await main(['--revisao', file]);
      expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchObject({ somente_validacao_local: true, antes: 8, depois: 4, removidos: 5 });
      await expect(main(['--revisao', file, '--executar'])).rejects.toThrow('Execução exige');
    } finally { consoleSpy.mockRestore(); vi.unstubAllEnvs(); await rm(dir, { recursive: true, force: true }); }
  });
});
