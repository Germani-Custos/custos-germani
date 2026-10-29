import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';

const migration = readFileSync(new URL('../sql/20261026185939_custos_proveniencia_lote.sql', import.meta.url), 'utf8');
let db;
afterEach(async () => { await db?.close(); });

async function setup({ unique = true } = {}) {
  db = new PGlite();
  // Replica os tipos/nulabilidade/IDENTITY ALWAYS confirmados no catálogo remoto, sem dados reais.
  await db.exec(`CREATE TABLE log_importacao(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY);
    CREATE TABLE historico_custos(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,codigo_produto text,
      data_referencia date NOT NULL,criado_em timestamptz DEFAULT now(),custo_total numeric NOT NULL
      ${unique ? ', CONSTRAINT unique_produto_data UNIQUE(codigo_produto,data_referencia)' : ''});
    INSERT INTO historico_custos(codigo_produto,data_referencia,custo_total,criado_em)
      VALUES ('001','2026-10-05',12,'2026-10-26 00:00:00.123456Z'),('002','2026-10-14',0,NULL);`);
}

describe('LOG-02 — migration aditiva, PostgreSQL isolado', () => {
  it('preserva fatos legados integralmente, NULL sem default, chave funcional e IDs ALWAYS', async () => {
    await setup();
    const before = (await db.query('SELECT to_jsonb(t) AS fato FROM historico_custos t ORDER BY id')).rows;
    await db.exec(migration);
    expect((await db.query("SELECT to_jsonb(t)-'log_importacao_id' AS fato FROM historico_custos t ORDER BY id")).rows).toEqual(before);
    expect((await db.query('SELECT log_importacao_id FROM historico_custos')).rows).toEqual([{ log_importacao_id: null }, { log_importacao_id: null }]);
    expect((await db.query(`SELECT data_type,is_nullable,column_default FROM information_schema.columns
      WHERE table_name='historico_custos' AND column_name='log_importacao_id'`)).rows)
      .toEqual([{ data_type: 'bigint', is_nullable: 'YES', column_default: null }]);
    expect((await db.query("SELECT identity_generation FROM information_schema.columns WHERE column_name='id' AND table_name IN ('log_importacao','historico_custos')")).rows)
      .toEqual([{ identity_generation: 'ALWAYS' }, { identity_generation: 'ALWAYS' }]);
    await expect(db.exec("INSERT INTO historico_custos(codigo_produto,data_referencia,custo_total,log_importacao_id) VALUES ('001','2026-10-05',99,NULL)"))
      .rejects.toMatchObject({ code: '23505' });
  });

  it('FK validada não diferível protege DELETE/UPDATE e índice não único só cobre referências', async () => {
    await setup();
    await db.exec(migration);
    const fk = (await db.query("SELECT confdeltype,confupdtype,condeferrable,convalidated FROM pg_constraint WHERE conname='historico_custos_log_importacao_id_fkey'")).rows[0];
    expect(fk).toEqual({ confdeltype: 'r', confupdtype: 'r', condeferrable: false, convalidated: true });
    const index = (await db.query("SELECT indisunique,pg_get_expr(indpred,indrelid) AS predicate FROM pg_index WHERE indexrelid='idx_historico_log_importacao_id'::regclass")).rows[0];
    expect(index).toEqual({ indisunique: false, predicate: '(log_importacao_id IS NOT NULL)' });
    await expect(db.exec("INSERT INTO historico_custos(codigo_produto,data_referencia,custo_total,log_importacao_id) VALUES ('X','2026-10-05',9,999)"))
      .rejects.toMatchObject({ code: '23503' });
  });

  it.each(['unique_ausente', 'reaplicacao'])('guarda %s recusa DDL sem tentar sanear', async mode => {
    await setup({ unique: mode !== 'unique_ausente' });
    if (mode === 'reaplicacao') await db.exec(migration);
    await expect(db.exec(migration)).rejects.toThrow('schema divergente ou migration já aplicada');
    await db.exec('ROLLBACK');
    const columns = (await db.query("SELECT column_name FROM information_schema.columns WHERE table_name='historico_custos' AND column_name='log_importacao_id'")).rows;
    expect(columns).toHaveLength(mode === 'reaplicacao' ? 1 : 0);
    expect((await db.query('SELECT count(*)::int AS n FROM historico_custos')).rows[0].n).toBe(2);
  });
});
