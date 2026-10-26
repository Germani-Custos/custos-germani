import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const client = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm', () => ({ createClient: () => client }));
vi.mock('../src/config/app-config.js', () => ({ appConfig: {
  supabase: { url: 'https://example.supabase.co', anonKey: 'test-key' }, enableVerboseLogs: false
}, debugLog: vi.fn() }));
import { api } from '../src/services/api.js';

let db;
let calls;
let startMode;
let finishMode;
let chunkFailure;
let returnedId;
const reference = '2026-10-14';
const stamp = '2026-10-19T19:58:41.800652Z';
const code = i => String(i + 1).padStart(4, '0');
const payload = (count = 801, date = reference) => Array.from({ length: count }, (_, i) => ({
  codigo_produto: code(i), descricao: `Produto ${i}`, custo_variavel: 6, custo_direto_fixo: 4,
  custo_total: 10, data_referencia: date
}));
const qid = name => {
  if (!/^[a-z_]+$/.test(name)) throw new Error('Coluna inesperada no transporte de teste');
  return `"${name}"`;
};

beforeAll(async () => {
  db = new PGlite();
  // DDL extraído da fotografia versionada; SQL somente em teste local.
  const schema = readFileSync(new URL('./fixtures/acesso-operacional-schema.sql', import.meta.url), 'utf8');
  for (const table of ['historico_custos', 'log_importacao']) {
    await db.exec(schema.match(new RegExp(`CREATE TABLE public.${table} \\([\\s\\S]*?\\n\\);`))[0]);
    await db.exec(`ALTER TABLE ${table} ADD PRIMARY KEY(id)`);
  }
  await db.exec(`ALTER TABLE historico_custos ADD CONSTRAINT unique_produto_data UNIQUE(codigo_produto,data_referencia);
    ALTER TABLE historico_custos ALTER COLUMN criado_em SET DEFAULT '${stamp}'::timestamptz;
    CREATE TABLE dicionario_produtos(codigo_produto text PRIMARY KEY, descricao text, origem_id uuid, familia_id uuid, agrupamento_cod text);`);
});
afterAll(async () => { await db.close(); });

beforeEach(async () => {
  await db.exec('TRUNCATE historico_custos,log_importacao,dicionario_produtos RESTART IDENTITY');
  calls = [];
  startMode = null;
  finishMode = null;
  chunkFailure = null;
  returnedId = undefined;
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  client.from.mockReset().mockImplementation(table => {
    if (!['historico_custos', 'log_importacao', 'dicionario_produtos'].includes(table)) throw new Error(`Fonte fora do escopo: ${table}`);
    return {
      insert(row) {
        calls.push({ table, operation: 'insert', row });
        return { select: () => ({ single: async () => {
          if (startMode === 'erro') return { data: null, error: new Error('Log indisponível') };
          if (startMode === 'rejeicao') throw new Error('Transporte indisponível');
          const keys = Object.keys(row);
          const result = await db.query(`INSERT INTO log_importacao (${keys.map(qid).join(',')})
            VALUES (${keys.map((_, i) => `$${i + 1}`).join(',')}) RETURNING id::text`, Object.values(row));
          return { data: startMode === 'sem_id' ? {} : { id: returnedId ?? result.rows[0].id }, error: null };
        } }) };
      },
      update(row) {
        return { eq: async (key, id) => {
          calls.push({ table, operation: 'update', row, id });
          if (finishMode === 'rejeicao') throw new Error('Fechamento rejeitado');
          if (finishMode === 'erro') return { error: new Error('Fechamento indisponível') };
          const keys = Object.keys(row);
          await db.query(`UPDATE log_importacao SET ${keys.map((k, i) => `${qid(k)}=$${i + 1}`).join(',')}
            WHERE ${qid(key)}=$${keys.length + 1}`, [...Object.values(row), id]);
          return { error: null };
        } };
      },
      select() {
        return { in: async (key, values) => {
          calls.push({ table, operation: 'select' });
          const result = await db.query(`SELECT codigo_produto FROM dicionario_produtos WHERE ${qid(key)} IN
            (${values.map((_, i) => `$${i + 1}`).join(',')})`, values);
          return { data: result.rows, error: null };
        } };
      },
      async upsert(rows, options) {
        calls.push({ table, operation: 'upsert', rows, options });
        const index = calls.filter(c => c.table === 'historico_custos' && c.operation === 'upsert').length;
        if (table === 'historico_custos' && chunkFailure?.index === index) {
          if (chunkFailure.reject) throw new Error('Chunk rejeitado');
          return { data: null, error: new Error('Chunk falhou') };
        }
        // Uma transação local por chamada de chunk. Não é acesso remoto/N+1 do frontend.
        await db.exec('BEGIN');
        try {
          for (const row of rows) {
            const keys = Object.keys(row);
            await db.query(`INSERT INTO ${qid(table)} (${keys.map(qid).join(',')})
              VALUES (${keys.map((_, i) => `$${i + 1}`).join(',')})
              ON CONFLICT (${options.onConflict.split(',').map(qid).join(',')}) DO UPDATE
              SET ${keys.map(k => `${qid(k)}=excluded.${qid(k)}`).join(',')}`, Object.values(row));
          }
          await db.exec('COMMIT');
          return { data: null, error: null };
        } catch (error) { await db.exec('ROLLBACK'); return { data: null, error }; }
      }
    };
  });
});
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

const run = (rows = payload(), options = {}) => api.importarHistoricoCustosComLog(rows, { dataReferencia: reference, ...options });
const logs = async () => (await db.query('SELECT id::text,status,total_linhas,linhas_importadas,linhas_erro,iniciado_em::text FROM log_importacao ORDER BY id')).rows;

describe('LOG-02 — identidade da execução com schema atual, PostgreSQL local', () => {
  it('801 linhas: uma PK persistida, três chunks com o mesmo batchId e um fechamento', async () => {
    const result = await run();
    expect(result.error).toBeNull();
    expect(result.data.batchId).toBe('1');
    expect(result.data.log_id).toBe('1');
    expect(result.data.chunks).toEqual([400, 400, 1].map((count, i) => ({ batchId: '1', indice: i + 1, total_linhas: count, status: 'gravado' })));
    expect(await logs()).toEqual([expect.objectContaining({ id: '1', status: 'finalizado', linhas_importadas: 801 })]);
    expect(calls[0]).toMatchObject({ table: 'log_importacao', operation: 'insert' });
    expect(calls.filter(c => c.table === 'log_importacao').map(c => c.operation)).toEqual(['insert', 'update']);
    const writes = calls.filter(c => c.table === 'historico_custos');
    expect(writes).toHaveLength(3);
    expect(writes.every(c => c.options.onConflict === 'codigo_produto,data_referencia')).toBe(true);
    expect(writes.flatMap(c => c.rows).every(r => r.data_referencia === reference && !Object.hasOwn(r, 'criado_em') && !Object.hasOwn(r, 'batchId'))).toBe(true);
    expect((await db.query('SELECT count(*)::integer AS total FROM historico_custos')).rows[0].total).toBe(801);
    expect(calls.length).toBe(7); // log + busca/criação de dimensão + 3 chunks + fechamento, sem N+1
    expect(result.data.rastreabilidade).toMatchObject({ persistencia_log: true, persistencia_fatos: false });
  });

  it('duas execuções com a mesma competência e timestamps iguais possuem IDs distintos', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(stamp));
    const a = await run(payload(1));
    const b = await run(payload(1), { batchId: a.data.batchId }); // ID fornecido pelo chamador não é reutilizado
    expect(a.data.batchId).not.toBe(b.data.batchId);
    expect((await logs()).map(r => r.iniciado_em)).toEqual([expect.any(String), expect.any(String)]);
    const rows = await logs();
    expect(rows[0].iniciado_em).toBe(rows[1].iniciado_em);
    expect(rows.map(r => r.id)).toEqual(['1', '2']);
  });

  it.each([false, true])('falha do segundo chunk (rejeição=%s) mantém a identidade e prossegue sem novo lote', async reject => {
    chunkFailure = { index: 2, reject };
    const result = await run();
    expect(result.data.chunks.map(c => c.batchId)).toEqual(['1', '1', '1']);
    expect(result.data.chunks.map(c => c.status)).toEqual(['gravado', 'erro', 'gravado']);
    expect(result.data.resumo).toEqual({ total_linhas: 801, linhas_importadas: 401, linhas_erro: 400 });
    expect(await logs()).toHaveLength(1);
    expect(calls.filter(c => c.table === 'log_importacao' && c.operation === 'insert')).toHaveLength(1);
    expect((await logs())[0]).toMatchObject({ linhas_importadas: 401, linhas_erro: 400 });
  });

  it('validação por linha e competências diferentes dentro da execução não criam novas identidades', async () => {
    const rows = payload(3);
    rows[1].data_referencia = '2026-09-05';
    rows[2].codigo_produto = '';
    const result = await run(rows);
    expect(result.data.chunks).toEqual([{ batchId: '1', indice: 1, total_linhas: 2, status: 'gravado' }]);
    expect(result.data.resumo).toMatchObject({ linhas_importadas: 2, linhas_erro: 1 });
    expect((await db.query('SELECT data_referencia::text AS date FROM historico_custos ORDER BY codigo_produto')).rows.map(r => r.date))
      .toEqual([reference, '2026-09-05']);
  });

  it('execuções de competências diferentes também recebem identidades independentes', async () => {
    const a = await run(payload(1, '2026-09-05'), { dataReferencia: '2026-09-05' });
    const b = await run(payload(1, reference));
    expect([a.data.batchId, b.data.batchId]).toEqual(['1', '2']);
    expect((await db.query('SELECT data_referencia::text AS date FROM log_importacao ORDER BY id')).rows.map(r => r.date))
      .toEqual(['2026-09-05', reference]);
  });

  it.each(['erro', 'rejeicao', 'sem_id'])('ausência de identidade (%s) bloqueia dimensão/fatos e não inventa lote', async mode => {
    startMode = mode;
    const result = await run(payload(1));
    expect(result.data).toBeNull();
    expect(result.error).not.toBeNull();
    expect(result.error.details.batchId).toBeNull();
    expect(calls).toHaveLength(1);
    expect((await db.query('SELECT count(*)::integer AS n FROM historico_custos')).rows[0].n).toBe(0);
  });

  it.each([0, '', -1, 1.5, 9007199254740992])('ID técnico inválido ou impreciso %s não autoriza escrita de fatos', async id => {
    returnedId = id;
    expect((await run(payload(1))).error).not.toBeNull();
    expect(calls).toHaveLength(1);
  });

  it('ID BIGINT textual preserva precisão, sem converter para Number', async () => {
    await db.query("SELECT setval('log_importacao_id_seq',9007199254740993,false)");
    const result = await run(payload(1));
    expect(result.data.batchId).toBe('9007199254740993');
    expect((await logs())[0].id).toBe('9007199254740993');
    expect(calls.at(-1).id).toBe('9007199254740993');
  });

  it.each(['erro', 'rejeicao'])('falha de fechamento (%s) conserva ID e informa confirmação pendente', async mode => {
    finishMode = mode;
    const result = await run(payload(1));
    expect(result.data.batchId).toBe('1');
    expect(result.data.log_error).not.toBeNull();
    expect(result.data.rastreabilidade.fechamento_log).toBe('nao_confirmado');
    expect(await logs()).toEqual([expect.objectContaining({ id: '1', status: 'processando' })]);
  });

  it('upsert conserva chave, ID e timestamp; não cria snapshots nem associação de legado por proximidade', async () => {
    await db.query(`INSERT INTO historico_custos(codigo_produto,custo_total,data_referencia)
      VALUES ('0001',1,$1)`, [reference]);
    const before = (await db.query('SELECT id::text,criado_em::text FROM historico_custos')).rows[0];
    const a = await run(payload(1));
    const b = await run(payload(1).map(r => ({ ...r, custo_total: 20 })));
    expect(a.data.batchId).not.toBe(b.data.batchId);
    expect(b.data.rastreabilidade).toMatchObject({ persistencia_fatos: false, motivo: 'SCHEMA_SEM_VINCULO_LOTE_NO_FATO' });
    const after = (await db.query('SELECT id::text,criado_em::text,custo_total::text FROM historico_custos')).rows;
    expect(after).toEqual([{ ...before, custo_total: '20' }]);
    const columns = (await db.query("SELECT column_name FROM information_schema.columns WHERE table_name='historico_custos'")).rows.map(r => r.column_name);
    expect(columns).not.toContain('log_importacao_id');
    expect(columns).not.toContain('batch_id');
  });
});
