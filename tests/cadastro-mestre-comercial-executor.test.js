import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { executarCargaComercial, validarCargaComercial, hashManifestoComercial, hashBytesComerciais, CAMPOS_COMERCIAIS } from '../scripts/lib/cadastro-mestre-comercial.mjs';
import { prepararAprovacaoArquivoCadastroMestre, lerArquivoCadastroMestre } from '../src/services/cadastro-mestre-preview.js';
import { arquivoComercial } from './fixtures/cadastro-mestre-comercial.js';
import { SheetJS } from './fixtures/cadastro-mestre-arquivo.js';
import { main } from '../scripts/validar-carga-comercial.mjs';

// Volume integral, identidades sintéticas. Nenhum mock de parsing, filtros ou UPDATE.
const linhas = Array.from({ length: 6230 }, (_, i) => [String(100000 + i), `Produto ${i}`, i < 860 ? 'P' : 'D',
  'Produzido', '01', 'F1', 'P005', i < 162 ? `C${String(i % 29).padStart(3, '0')}` : '', i < 162 ? `Comercial ${i % 29}` : '']);
const protegidas = ['dicionario_produtos', 'historico_custos', 'apontamentos_op', 'mapa_produtos',
  'categorias_agrupamento', 'familias_base', 'log_importacao', 'log_importacao_cadastro_mestre', 'log_importacao_op'];
const pick = p => Object.fromEntries(CAMPOS_COMERCIAIS.map(c => [c, p?.[c] ?? null]));
const clonar = value => JSON.parse(JSON.stringify(value));

describe('Carga comercial isolada — PostgreSQL local/PGlite, volume integral', () => {
  let db, client, entrada, contexto, manifestoBase, fotografiaBytes, bytes;
  beforeAll(async () => {
    db = await PGlite.create();
    bytes = Buffer.from(await arquivoComercial('xlsx', linhas).arrayBuffer());
    await db.exec(`CREATE TABLE dicionario_master_produtos (codigo_produto text PRIMARY KEY,descricao text,origem_cod text,familia_cod text,
      agrupamento_erp_valor text,agrupamento_erp_importacao_id bigint,criado_em timestamptz,atualizado_em timestamptz,
      ultima_importacao_cadastro_mestre_id bigint,agrupamento_comercial_erp_cod text,agrupamento_comercial_erp_descricao text);
      CREATE TABLE categorias_origem (id text PRIMARY KEY,codigo text,descricao text);
      CREATE TABLE categorias_familia (id text PRIMARY KEY,codigo text,descricao text);
      INSERT INTO categorias_origem VALUES ('o1','01','Produzido');
      INSERT INTO categorias_familia VALUES ('f1','F1','Família');
      ${protegidas.map(t => `CREATE TABLE ${t} (codigo text PRIMARY KEY,agrupamento_cod text,data_referencia date,criado_em timestamptz${t === 'historico_custos' ? ',log_importacao_id bigint NULL' : ''});
        INSERT INTO ${t} VALUES ('100000','KUSTOS','2026-09-01','2026-10-01'${t === 'historico_custos' ? ',NULL' : ''});`).join('\n')}
      INSERT INTO dicionario_master_produtos
        SELECT (100000+i)::text,'Produto '||i,'01','F1','P005',17,'2026-09-01','2026-10-01',18,NULL,NULL FROM generate_series(0,859) i;`);
    contexto = await ctx();
    fotografiaBytes = Buffer.from(JSON.stringify({ capturado_em: '2026-10-19T17:44:17Z', contexto }));
    const arquivo = { name: 'comercial.xlsx', arrayBuffer: async () => bytes };
    const preparado = await prepararAprovacaoArquivoCadastroMestre(arquivo, contexto, SheetJS);
    const leitura = await lerArquivoCadastroMestre(arquivo, SheetJS);
    // Evidência montada a partir dos valores conhecidos da fixture, independente do executor.
    manifestoBase = { tipo: 'MANIFESTO_COMERCIAL_PARA_REVISAO_FASE_A', somente_preparacao: true, execucao_permitida: false,
      decisao: 'PENDENTE_DE_REVISAO_E_EXECUTOR_ISOLADO',
      fonte: { arquivo: arquivo.name, bytes: bytes.length, sha256: hashBytesComerciais(bytes), aba: leitura.aba, colunas: leitura.colunas,
        adapter: 'src/services/cadastro-mestre-preview.js#lerArquivoCadastroMestre', sheetjs: SheetJS.version,
        transporte: preparado.dadosExecucao.versao_transporte, contrato_base: preparado.manifesto.versao_contrato,
        hash_dados: preparado.manifesto.fonte.hash_dados_sha256, hash_contexto: preparado.manifesto.fonte.hash_contexto_sha256 },
      fotografia: { sha256: hashBytesComerciais(fotografiaBytes), capturado_em: '2026-10-19T17:44:17Z', produtos: 860, campos_master: 11 },
      destino: { tabela: 'dicionario_master_produtos', campos: [...CAMPOS_COMERCIAIS] },
      resumo: { linhas: 6230, universo: 860, existentes: 860, novos: 0, com_agrupamento: 162, sem_agrupamento: 698,
        codigos_distintos: 29, conflitos: 0, campos_inferidos: 0, produtos_a_atualizar: 162, produtos_mantem_null: 698,
        alteracoes_campos: 324, limpezas_para_null: 0, outras_operacoes_no_manifesto_generico: 0, inserts_manifesto_generico: 0, remocoes_manifesto_generico: 0 },
      produtos: linhas.slice(0, 860).map((r, i) => {
        const erp = { [CAMPOS_COMERCIAIS[0]]: r[7] || null, [CAMPOS_COMERCIAIS[1]]: r[8] || null };
        return { codigo_produto: r[0], linha_xls: i + 2, valor_erp: erp,
          valor_erp_bruto: { [CAMPOS_COMERCIAIS[0]]: r[7], [CAMPOS_COMERCIAIS[1]]: r[8] }, valor_atual_master: pick({}),
          valor_proposto: erp, acao_proposta: i < 162 ? 'ATUALIZAR_APENAS_CAMPOS_COMERCIAIS' : 'MANTER_NULL', campos_alterados: i < 162 ? [...CAMPOS_COMERCIAIS] : [] };
      }) };
  }, 20000);
  afterAll(async () => { await db.close(); });
  beforeEach(async () => {
    await db.exec('UPDATE dicionario_master_produtos SET agrupamento_comercial_erp_cod=NULL,agrupamento_comercial_erp_descricao=NULL');
    client = { query: vi.fn((sql, params) => db.query(sql, params)) };
    const manifesto = clonar(manifestoBase);
    entrada = { manifesto, hashManifesto: hashManifestoComercial(manifesto), fotografiaBytes,
      arquivo: { name: 'comercial.xlsx', arrayBuffer: async () => bytes }, leitor: SheetJS };
  });
  async function ctx() {
    const ler = async (table, key) => (await db.query(`SELECT to_jsonb(t) AS registro FROM ${table} t ORDER BY ${key}`)).rows.map(r => r.registro);
    return { produtos: await ler('dicionario_master_produtos', 'codigo_produto'), origens: await ler('categorias_origem', 'id'), familias: await ler('categorias_familia', 'id') };
  }
  const executar = (overrides = {}) => executarCargaComercial({ ...entrada, client,
    confirmacao: `APLICAR_AGRUP_COM:${entrada.hashManifesto}`, ...overrides });
  const rehash = () => { entrada.hashManifesto = hashManifestoComercial(entrada.manifesto); };

  it('aplica 162 produtos/324 valores; preserva 698 NULL, universo, demais colunas, Kustos, fatos e todos os logs', async () => {
    const antes = await ctx();
    const r = await executar();
    expect(r).toMatchObject({ status: 'COMMIT_CONFIRMADO', universo: 860, produtos_a_atualizar: 162, alteracoes_campos: 324, inseridos: 0, removidos: 0 });
    expect(r.outras_tabelas_depois).toEqual(r.outras_tabelas_antes);
    expect(Object.keys(r.outras_tabelas_antes)).toHaveLength(11);
    const depois = await ctx();
    const mudancas = depois.produtos.flatMap((p, i) => Object.keys(p).filter(c => p[c] !== antes.produtos[i][c]).map(c => ({ codigo: p.codigo_produto, campo: c })));
    expect(mudancas).toHaveLength(324);
    expect(new Set(mudancas.map(m => m.codigo)).size).toBe(162);
    expect([...new Set(mudancas.map(m => m.campo))].sort()).toEqual([...CAMPOS_COMERCIAIS].sort());
    expect(depois.produtos.slice(162).every(p => CAMPOS_COMERCIAIS.every(c => p[c] === null))).toBe(true);
    const escritas = client.query.mock.calls.map(([sql]) => sql).filter(sql => /^\s*(UPDATE|INSERT|DELETE|MERGE|CREATE|ALTER|DROP)/i.test(sql));
    expect(escritas).toHaveLength(1);
    expect(escritas[0].split('FROM')[0].trim()).toBe('UPDATE public.dicionario_master_produtos AS m\n      SET agrupamento_comercial_erp_cod=x.agrupamento_comercial_erp_cod,\n          agrupamento_comercial_erp_descricao=x.agrupamento_comercial_erp_descricao');
    await expect(executar()).rejects.toThrow('divergentes da fotografia');
  });
  it('rollback real após UPDATE restaura integralmente os dois campos e preserva as demais tabelas', async () => {
    let atualizado = false;
    client.query.mockImplementation(async (sql, params) => {
      if (atualizado && sql.startsWith('SELECT to_jsonb(t) AS registro FROM (SELECT *')) throw new Error('Falha após UPDATE');
      const r = await db.query(sql, params);
      if (sql.startsWith('UPDATE public.')) atualizado = true;
      return r;
    });
    await expect(executar()).rejects.toThrow('Falha após UPDATE');
    expect(atualizado).toBe(true);
    expect(await ctx()).toEqual(contexto);
    expect(client.query.mock.calls.some(([s]) => s === 'ROLLBACK')).toBe(true);
    expect(client.query.mock.calls.some(([s]) => s === 'COMMIT')).toBe(false);
  });
  it('erro durante o UPDATE aborta e faz rollback', async () => {
    client.query.mockImplementation((sql, params) => {
      if (sql.startsWith('UPDATE public.')) throw new Error('UPDATE rejeitado');
      return db.query(sql, params);
    });
    await expect(executar()).rejects.toThrow('UPDATE rejeitado');
    expect(await ctx()).toEqual(contexto);
    expect(client.query.mock.calls.at(-1)[0]).toBe('ROLLBACK');
  });
  it('contagem retornada incompleta impede COMMIT e reverte o UPDATE real', async () => {
    client.query.mockImplementation(async (sql, params) => {
      const r = await db.query(sql, params);
      return sql.startsWith('UPDATE public.') ? { ...r, rows: r.rows.slice(1) } : r;
    });
    await expect(executar()).rejects.toThrow('Produtos atualizados divergentes');
    expect(await ctx()).toEqual(contexto);
    expect(client.query.mock.calls.at(-1)[0]).toBe('ROLLBACK');
  });
  it('verificador detecta atributo adicional alterado e reverte a transação inteira', async () => {
    client.query.mockImplementation(async (sql, params) => {
      const r = await db.query(sql, params);
      // Injeção de falha exclusivamente no banco local, depois do UPDATE verdadeiro.
      if (sql.startsWith('UPDATE public.')) await db.query("UPDATE dicionario_master_produtos SET atualizado_em=now() WHERE codigo_produto='100000'");
      return r;
    });
    await expect(executar()).rejects.toThrow('Imagem final diferente');
    expect(await ctx()).toEqual(contexto);
  });
  it('verificador detecta escrita indevida em log e reverte inclusive o par comercial', async () => {
    client.query.mockImplementation(async (sql, params) => {
      const r = await db.query(sql, params);
      if (sql.startsWith('UPDATE public.')) await db.query("UPDATE log_importacao_cadastro_mestre SET agrupamento_cod='FALHA_INJETADA'");
      return r;
    });
    await expect(executar()).rejects.toThrow('Outra tabela mudou');
    expect(await ctx()).toEqual(contexto);
    expect((await db.query('SELECT agrupamento_cod FROM log_importacao_cadastro_mestre')).rows[0].agrupamento_cod).toBe('KUSTOS');
  });
  it.each(['codigo_produto', 'descricao', 'atualizado_em', 'ultima_importacao_cadastro_mestre_id'])('bloqueia drift em %s antes de qualquer escrita', async campo => {
    const valor = campo === 'codigo_produto' ? 'NOVO_CODIGO' : campo === 'atualizado_em' ? '2026-10-02' : campo.endsWith('_id') ? '99' : 'Alterada';
    await db.query(`UPDATE dicionario_master_produtos SET ${campo}=$1 WHERE codigo_produto='100000'`, [valor]);
    try {
      await expect(executar()).rejects.toThrow('divergentes da fotografia');
      expect(client.query.mock.calls.every(([s]) => !s.startsWith('UPDATE'))).toBe(true);
    } finally {
      const p = contexto.produtos[0];
      await db.query(`UPDATE dicionario_master_produtos SET ${campo}=$1 WHERE codigo_produto=$2`, [p[campo], campo === 'codigo_produto' ? valor : p.codigo_produto]);
    }
  });
  it('bloqueia 859 produtos e não recria o produto ausente', async () => {
    await db.query("DELETE FROM dicionario_master_produtos WHERE codigo_produto='100859'");
    try { await expect(executar()).rejects.toThrow('divergentes da fotografia'); }
    finally {
      await db.query('INSERT INTO dicionario_master_produtos SELECT * FROM jsonb_populate_record(NULL::dicionario_master_produtos,$1::jsonb)', [JSON.stringify(contexto.produtos.at(-1))]);
    }
  });
  it('bloqueia trigger capaz de escrever em outro atributo/tabela, sem desabilitá-lo', async () => {
    await db.exec(`CREATE FUNCTION efeito_colateral() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      NEW.atualizado_em=now(); UPDATE log_importacao SET agrupamento_cod='ALTERADO'; RETURN NEW; END $$;
      CREATE TRIGGER teste BEFORE UPDATE ON dicionario_master_produtos FOR EACH ROW EXECUTE FUNCTION efeito_colateral();`);
    try {
      await expect(executar()).rejects.toThrow('Dependência');
      expect(await ctx()).toEqual(contexto);
      expect((await db.query('SELECT agrupamento_cod FROM log_importacao')).rows[0].agrupamento_cod).toBe('KUSTOS');
    } finally { await db.exec('DROP TRIGGER teste ON dicionario_master_produtos; DROP FUNCTION efeito_colateral();'); }
  });
  it('preserva RLS habilitada quando a conexão administrativa já possui bypass; não muda políticas', async () => {
    await db.exec('ALTER TABLE dicionario_master_produtos ENABLE ROW LEVEL SECURITY; CREATE POLICY leitura ON dicionario_master_produtos FOR SELECT USING (true);');
    try {
      await executar();
      expect((await db.query("SELECT relrowsecurity FROM pg_class WHERE oid='dicionario_master_produtos'::regclass")).rows[0].relrowsecurity).toBe(true);
      expect((await db.query("SELECT policyname FROM pg_policies WHERE tablename='dicionario_master_produtos'")).rows).toEqual([{ policyname: 'leitura' }]);
      expect(client.query.mock.calls.every(([s]) => !/DISABLE|ALTER|POLICY/i.test(s))).toBe(true);
    } finally { await db.exec('DROP POLICY leitura ON dicionario_master_produtos; ALTER TABLE dicionario_master_produtos DISABLE ROW LEVEL SECURITY;'); }
  });
  it.each(['hash', 'fotografia', 'arquivo', 'confirmacao'])('recusa %s divergente antes de BEGIN', async tipo => {
    if (tipo === 'hash') entrada.hashManifesto = '0'.repeat(64);
    if (tipo === 'fotografia') entrada.fotografiaBytes = Buffer.from('{}');
    if (tipo === 'arquivo') entrada.arquivo = { ...entrada.arquivo, arrayBuffer: async () => Buffer.from('diferente') };
    await expect(executar(tipo === 'confirmacao' ? { confirmacao: 'SIM' } : {})).rejects.toThrow();
    expect(client.query).not.toHaveBeenCalled();
  });
  it.each(['proposta', 'nulo', 'universo', 'contagem', 'destino'])('recusa %s adulterado mesmo com hash recalculado', async tipo => {
    const m = entrada.manifesto;
    if (tipo === 'proposta') m.produtos[0].valor_proposto[CAMPOS_COMERCIAIS[0]] = 'INFERIDO';
    if (tipo === 'nulo') m.produtos[859].valor_proposto[CAMPOS_COMERCIAIS[0]] = 'FALLBACK';
    if (tipo === 'universo') m.produtos[859].codigo_produto = 'NAO_EXISTE';
    if (tipo === 'contagem') m.resumo.produtos_a_atualizar--;
    if (tipo === 'destino') m.destino.campos.push('agrupamento_cod');
    rehash();
    await expect(executar()).rejects.toThrow();
    expect(client.query).not.toHaveBeenCalled();
  });
  it('validação local não usa banco/rede; CLI recusa flag de execução', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Rede proibida'));
    try {
      expect((await validarCargaComercial(entrada)).resumo).toEqual(manifestoBase.resumo);
      expect(fetchSpy).not.toHaveBeenCalled();
      await expect(main(['--executar'])).rejects.toThrow();
      expect(client.query).not.toHaveBeenCalled();
    } finally { fetchSpy.mockRestore(); }
  });
});
