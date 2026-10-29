import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';

const migration = readFileSync(new URL('../sql/20261022191744_hardening_acesso_operacional_rls.sql', import.meta.url), 'utf8');
const loteMigration = readFileSync(new URL('../sql/20261026185939_custos_proveniencia_lote.sql', import.meta.url), 'utf8');
const schema = readFileSync(new URL('./fixtures/acesso-operacional-schema.sql', import.meta.url), 'utf8');
const admins = ['14f1b3ff-0b22-495b-a1c3-9aebae13dc36', '72334848-f7d5-41bb-9e5d-eb4933d9d41c'];
const reader = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const targetTables = ['apontamentos_op', 'categorias_agrupamento', 'categorias_familia', 'categorias_origem',
  'dicionario_produtos', 'historico_custos', 'log_importacao', 'log_importacao_op', 'mapa_produtos'];
const reads = targetTables.filter(t => t !== 'mapa_produtos').concat('dicionario_master_produtos');
const allTables = targetTables.concat('dicionario_master_produtos', 'familias_base', 'log_importacao_cadastro_mestre');
const textColumn = { apontamentos_op: 'descricao', categorias_agrupamento: 'descricao', categorias_familia: 'descricao',
  categorias_origem: 'descricao', dicionario_produtos: 'descricao', historico_custos: 'codigo_produto',
  log_importacao: 'status', log_importacao_op: 'status', mapa_produtos: 'codigo_produto' };
const inserts = {
  apontamentos_op: "INSERT INTO public.apontamentos_op(data_referencia,origem,op,cod_produto,descricao,cod_estagio,estagio,unidade) VALUES ('2026-10-01',1,2,'200','Produto',1,'Etapa','KG')",
  categorias_agrupamento: "INSERT INTO public.categorias_agrupamento(id,descricao) VALUES ('g2','Outro grupo')",
  categorias_familia: "INSERT INTO public.categorias_familia(descricao) VALUES ('Outra família')",
  categorias_origem: "INSERT INTO public.categorias_origem(descricao) VALUES ('Outra origem')",
  dicionario_produtos: "INSERT INTO public.dicionario_produtos(codigo_produto,descricao) VALUES ('300','Novo produto')",
  // Ensaios de autorização sobre legado explícito; não são o writer oficial da aplicação.
  historico_custos: "INSERT INTO public.historico_custos(codigo_produto,custo_total,data_referencia,log_importacao_id) VALUES ('200',20,'2026-10-01',NULL)",
  log_importacao: "INSERT INTO public.log_importacao(data_referencia) VALUES ('2026-10-01')",
  log_importacao_op: "INSERT INTO public.log_importacao_op(data_referencia) VALUES ('2026-10-01')",
  mapa_produtos: "INSERT INTO public.mapa_produtos(codigo_produto) VALUES ('300')"
};

describe('SEC-03 — migration real em PostgreSQL local com roles, RLS e trigger', () => {
  let db;
  let before;
  async function as(role, claims, action) {
    await db.exec('BEGIN');
    try {
      await db.query("SELECT set_config('request.jwt.claims',$1,true)", [JSON.stringify(claims)]);
      await db.exec(`SET LOCAL ROLE ${role}`);
      return await action();
    } finally {
      await db.exec('ROLLBACK');
    }
  }
  const claims = id => ({ sub: id, role: 'authenticated', is_anonymous: false });
  const denied = action => expect(action()).rejects.toMatchObject({ code: '42501' });
  async function snapshot() {
    const result = {};
    for (const table of allTables) {
      result[table] = (await db.query(`SELECT to_jsonb(t) AS row FROM public.${table} t ORDER BY to_jsonb(t)::text`)).rows;
    }
    return result;
  }
  beforeAll(async () => {
    db = await PGlite.create();
    await db.exec(schema);
    await db.exec(loteMigration);
    await db.exec(`INSERT INTO public.categorias_origem(id,codigo,descricao) VALUES ('o1','O1','Origem');
      INSERT INTO public.categorias_familia(id,codigo,descricao) VALUES ('f1','F1','Família'),('f2','F2','Família 2');
      INSERT INTO public.categorias_agrupamento(id,descricao) VALUES ('g1','Grupo');
      INSERT INTO public.dicionario_produtos(codigo_produto,descricao,origem_id,familia_id,agrupamento_cod)
        VALUES ('100','Produto','o1','f1','g1'),('200','Outro','o1','f1','g1');
      INSERT INTO public.historico_custos(codigo_produto,custo_total,data_referencia,log_importacao_id) VALUES ('100',10,'2026-09-01',NULL);
      INSERT INTO public.log_importacao(data_referencia) VALUES ('2026-09-01');
      INSERT INTO public.log_importacao_op(data_referencia) VALUES ('2026-09-01');
      INSERT INTO public.apontamentos_op(data_referencia,origem,op,cod_produto,descricao,cod_estagio,estagio,unidade)
        VALUES ('2026-09-01',1,1,'100','Produto',1,'Etapa','KG');
      INSERT INTO public.dicionario_master_produtos(codigo_produto,descricao) VALUES ('100','Produto ERP');
      INSERT INTO public.familias_base(codigo) VALUES ('F1');
      INSERT INTO public.log_importacao_cadastro_mestre(arquivo_nome,tipo_arquivo,identificador_lote)
        VALUES ('fixture.xls','XLS','fixture');`);
    before = await snapshot();
    await db.exec(migration);
  }, 20000);
  afterAll(async () => { await db?.close(); });

  it('preserva integralmente os registros das 12 tabelas ao aplicar a migration', async () => {
    expect(await snapshot()).toEqual(before);
    const rls = await db.query("SELECT count(*)::int AS count FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND c.relrowsecurity");
    expect(rls.rows[0].count).toBe(12);
    expect((await db.query("SELECT count(*)::int AS count FROM pg_policies WHERE schemaname='public'")).rows[0].count).toBe(21);
  });

  for (const table of targetTables) {
    it(`anon não pode SELECT/INSERT/UPDATE/DELETE em ${table}`, async () => {
      for (const sql of [`SELECT * FROM public.${table}`, inserts[table],
        `UPDATE public.${table} SET ${textColumn[table]}=${textColumn[table]}`, `DELETE FROM public.${table}`]) {
        await as('anon', {}, () => denied(() => db.query(sql)));
      }
    });
    it(`leitor não pode INSERT/UPDATE/DELETE em ${table}`, async () => {
      await as('authenticated', claims(reader), () => denied(() => db.query(inserts[table])));
      await as('authenticated', claims(reader), async () => {
        try {
          const updated = await db.query(`UPDATE public.${table} SET ${textColumn[table]}=${textColumn[table]} RETURNING *`);
          expect(updated.rows).toHaveLength(0);
        } catch (error) {
          expect(error.code).toBe('42501');
        }
      });
      await as('authenticated', claims(reader), () => denied(() => db.query(`DELETE FROM public.${table}`)));
    });
  }

  it('leitor tem acesso aos dados completos das nove fontes de consulta, inclusive ERP', async () => {
    await as('authenticated', claims(reader), async () => {
      for (const table of reads) {
        expect((await db.query(`SELECT count(*)::int AS count FROM public.${table}`)).rows[0].count).toBe(before[table].length);
      }
      expect((await db.query('SELECT * FROM public.mapa_produtos')).rows).toHaveLength(0);
    });
  });

  for (const admin of admins) {
    it(`administrador ${admin.slice(0, 8)} pode importar/editar e o trigger insere/atualiza mapa`, async () => {
      await as('authenticated', claims(admin), async () => {
        for (const table of ['dicionario_produtos', 'log_importacao', 'log_importacao_op', 'apontamentos_op']) {
          await db.query(inserts[table]);
        }
        await db.query(inserts.historico_custos);
        for (const table of ['dicionario_produtos', 'historico_custos', 'log_importacao', 'log_importacao_op']) {
          expect((await db.query(`UPDATE public.${table} SET ${textColumn[table]}=${textColumn[table]} RETURNING *`)).rows.length).toBeGreaterThan(0);
        }
        await db.query("UPDATE public.dicionario_produtos SET familia_id='f2' WHERE codigo_produto='200'");
        await db.query("INSERT INTO public.historico_custos(codigo_produto,custo_total,data_referencia,log_importacao_id) VALUES ('200',21,'2026-10-01',NULL) ON CONFLICT(codigo_produto,data_referencia) DO UPDATE SET codigo_produto=excluded.codigo_produto,custo_total=excluded.custo_total");
        await db.exec('RESET ROLE');
        expect((await db.query("SELECT familia_id FROM public.mapa_produtos WHERE codigo_produto='200'")).rows[0].familia_id).toBe('f2');
      });
      expect(await snapshot()).toEqual(before);
    });
  }

  for (const admin of admins) {
    it(`LOG-02: administrador ${admin.slice(0, 8)} grava e lê FK no mesmo upsert sob as policies existentes`, async () => {
      await as('authenticated', claims(admin), async () => {
        const { rows: [log] } = await db.query("INSERT INTO public.log_importacao(data_referencia) VALUES ('2026-10-14') RETURNING id::text");
        const { rows: [fact] } = await db.query(`INSERT INTO public.historico_custos(codigo_produto,custo_total,data_referencia,log_importacao_id)
          VALUES ('100',21,'2026-09-01',$1) ON CONFLICT(codigo_produto,data_referencia)
          DO UPDATE SET custo_total=excluded.custo_total,log_importacao_id=excluded.log_importacao_id
          RETURNING id::text,log_importacao_id::text`, [log.id]);
        expect(fact.log_importacao_id).toBe(log.id);
      });
      expect(await snapshot()).toEqual(before);
      await as('authenticated', claims(admin), () => expect(db.query(`INSERT INTO public.historico_custos(codigo_produto,custo_total,data_referencia,log_importacao_id)
        VALUES ('100',21,'2026-10-14',999999)`)).rejects.toMatchObject({ code: '23503' }));
    });
  }

  it('nem administrador edita catálogos, OP existente ou mapa diretamente', async () => {
    for (const table of ['categorias_origem', 'categorias_familia', 'categorias_agrupamento', 'mapa_produtos']) {
      await as('authenticated', claims(admins[0]), () => denied(() => db.query(inserts[table])));
    }
    await as('authenticated', claims(admins[0]), () => denied(() => db.query("UPDATE public.apontamentos_op SET descricao='Mudança'")));
    await as('authenticated', claims(admins[0]), () => denied(() => db.query("SELECT public.fn_upsert_mapa_produtos_por_codigo('200'::text)")));
  });

  it('user_metadata falso, usuário anônimo autenticado e ausência de sub não concedem privilégio', async () => {
    await as('authenticated', { ...claims(reader), user_metadata: { role: 'admin', kustos_role: 'admin' } }, () => denied(() => db.query(inserts.dicionario_produtos)));
    for (const fake of [{ ...claims(admins[0]), is_anonymous: true }, { role: 'authenticated' }]) {
      await as('authenticated', fake, async () => {
        expect((await db.query('SELECT * FROM public.historico_custos')).rows).toHaveLength(0);
      });
      await as('authenticated', fake, () => denied(() => db.query(inserts.dicionario_produtos)));
    }
  });

  it('view, Master, famílias-base e log administrativo não oferecem bypass anônimo ou de TRUNCATE', async () => {
    for (const role of ['anon', 'authenticated']) {
      for (const table of allTables.concat('vw_produtos_orfaos_agrupamento')) {
        expect((await db.query('SELECT has_table_privilege($1,$2,\'TRUNCATE\') AS allowed', [role, 'public.' + table])).rows[0].allowed).toBe(false);
      }
      for (const table of ['familias_base', 'log_importacao_cadastro_mestre', 'vw_produtos_orfaos_agrupamento']) {
        await as(role, role === 'anon' ? {} : claims(admins[0]), () => denied(() => db.query(`SELECT * FROM public.${table}`)));
      }
    }
    await as('anon', {}, () => denied(() => db.query('SELECT * FROM public.dicionario_master_produtos')));
    for (const role of ['anon', 'authenticated']) {
      expect((await db.query("SELECT has_sequence_privilege($1,'public.log_importacao_cadastro_mestre_id_seq','USAGE') AS allowed", [role])).rows[0].allowed).toBe(false);
      expect((await db.query("SELECT has_sequence_privilege($1,'public.historico_custos_id_seq','UPDATE') AS allowed", [role])).rows[0].allowed).toBe(false);
    }
  });

  it('backend conserva leitura integral e escrita administrativa sem JWT no browser', async () => {
    await as('service_role', {}, async () => {
      for (const table of allTables) expect((await db.query(`SELECT count(*)::int AS count FROM public.${table}`)).rows[0].count).toBe(before[table].length);
      await db.query("INSERT INTO public.categorias_familia(codigo,descricao) VALUES ('F3','Família backend')");
      await db.query("UPDATE public.dicionario_master_produtos SET descricao='Servidor' WHERE codigo_produto='100'");
    });
    expect(await snapshot()).toEqual(before);
  });

  it('script de ensaios administrativos verifica as roles e reverte todos os dados e sequências', async () => {
    const sequenceState = () => db.query("SELECT 'historico' AS name,last_value,is_called FROM public.historico_custos_id_seq UNION ALL SELECT 'log',last_value,is_called FROM public.log_importacao_id_seq UNION ALL SELECT 'op',last_value,is_called FROM public.apontamentos_op_id_seq UNION ALL SELECT 'log_op',last_value,is_called FROM public.log_importacao_op_id_seq");
    const sequencesBefore = await sequenceState();
    const probe = readFileSync(new URL('../sql/validar_acesso_operacional_rls.sql', import.meta.url), 'utf8');
    const results = await db.exec(probe);
    const checks = results.at(-1).rows[0].security_checks;
    expect(checks.length).toBeGreaterThan(200);
    expect(checks.filter(c => !c.ok)).toEqual([]);
    expect(await snapshot()).toEqual(before);
    expect(await sequenceState()).toEqual(sequencesBefore);
  });
});
