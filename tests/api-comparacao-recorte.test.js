import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';

const client = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm', () => ({ createClient: () => client }));
vi.mock('../src/config/app-config.js', () => ({
  appConfig: { supabase: { url: 'https://example.supabase.co', anonKey: 'test-key' }, enableVerboseLogs: false }, debugLog: vi.fn()
}));
import { api } from '../src/services/api.js';

// Transporte de teste from/select/range sobre PostgreSQL real local (WASM).
// SQL existe somente no teste. Nenhuma conexão/credencial/alteração remota.
let db;
let requests;
let fault;
const methods = ['getLatestImportComparison', 'getTopVariacoesImportacao'];
const period = { start: '2026-04-01', end: '2026-06-30' };
const names = ['historico_custos', 'dicionario_produtos', 'dicionario_master_produtos', 'categorias_origem', 'categorias_familia'];
const ident = value => {
  if (!/^[a-z_]+$/.test(value)) throw new Error('Identificador inesperado no transporte de teste');
  return `"${value}"`;
};

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE TABLE historico_custos(id integer PRIMARY KEY, codigo_produto text, descricao text,
      data_referencia date NOT NULL, criado_em timestamptz, custo_total numeric, custo_variavel numeric, custo_direto_fixo numeric,
      CONSTRAINT unique_produto_data UNIQUE(codigo_produto,data_referencia));
    CREATE TABLE dicionario_produtos(codigo_produto text PRIMARY KEY, descricao text, origem_id text, familia_id text, agrupamento_cod text);
    CREATE TABLE dicionario_master_produtos(codigo_produto text PRIMARY KEY, origem_cod text, familia_cod text);
    CREATE TABLE categorias_origem(id text PRIMARY KEY, codigo text, descricao text);
    CREATE TABLE categorias_familia(id text PRIMARY KEY, codigo text, descricao text);
  `);
});
afterAll(async () => { await db.close(); });

beforeEach(async () => {
  await db.exec(`TRUNCATE ${names.join(',')}`);
  requests = [];
  fault = (_request, response) => response;
  client.from.mockReset().mockImplementation(table => {
    if (!names.includes(table)) throw new Error('Fonte não autorizada no teste');
    const r = { table, fields: '*', filters: [], orders: [], range: null, options: null };
    requests.push(r);
    const q = {
      select(fields, options) { r.fields = fields; r.options = options; return q; },
      order(key, { ascending }) { r.orders.push([key, ascending]); return q; },
      eq(key, value) { r.filters.push([key, '=', value]); return q; },
      in(key, values) { r.filters.push([key, 'IN', values]); return q; },
      gte(key, value) { r.filters.push([key, '>=', value]); return q; },
      lte(key, value) { r.filters.push([key, '<=', value]); return q; },
      async range(start, end) {
        r.range = [start, end];
        const params = [];
        const param = value => { params.push(value); return `$${params.length}`; };
        const where = r.filters.map(([key, op, value]) => op === 'IN'
          ? `${ident(key)} IN (${value.map(param).join(',')})` : `${ident(key)} ${op} ${param(value)}`);
        const from = `FROM ${ident(table)}${where.length ? ` WHERE ${where.join(' AND ')}` : ''}`;
        const counted = await db.query(`SELECT count(*)::integer AS count ${from}`, params);
        const fields = r.fields === '*' ? '*' : r.fields.split(',').map(s => ident(s.trim())).join(',');
        const order = r.orders.map(([key, asc]) => `${ident(key)} ${asc ? 'ASC' : 'DESC'}`).join(',');
        const limit = param(end - start + 1);
        const offset = param(start);
        // row_to_json conserva DATE civil e microssegundos do TIMESTAMPTZ.
        const result = await db.query(`SELECT row_to_json(s) AS payload FROM
          (SELECT ${fields} ${from} ORDER BY ${order} LIMIT ${limit} OFFSET ${offset}) s`, params);
        return fault(r, { data: result.rows.map(row => row.payload), count: counted.rows[0].count, error: null });
      },
      then() { throw new Error('Leitura sem paginação'); }
    };
    return q;
  });
});

async function add(id, date, imported, cost = 100, code = '001') {
  await db.query(`INSERT INTO historico_custos
    (id,codigo_produto,descricao,data_referencia,criado_em,custo_total,custo_variavel,custo_direto_fixo)
    VALUES ($1,$2,'Produto',$3,$4,$5,$6,$7)`, [id, code, date, imported, cost, cost * 0.6, cost * 0.4]);
}

async function auditFixture() {
  await add(1, '2026-04-05', '2026-09-10T10:00:00.000001Z', 80);
  await add(2, '2026-05-14', '2026-09-10T10:00:00.000002Z', 100);
  await add(3, '2026-06-14', '2026-08-10T10:00:00Z', 60);
  await add(4, '2026-10-05', '2026-10-19T19:58:24.900927Z', 90);
  await add(5, '2026-10-14', '2026-10-19T19:58:41.800652Z', 95);
}

describe('LOG-03 — recorte executado no PostgreSQL local antes da seleção de eventos', () => {
  it('abril–junho exclui outubro; ordem é importação com microssegundos, não competência', async () => {
    await auditFixture();
    const old = await db.query(`SELECT count(*)::integer AS total FROM historico_custos
      WHERE data_referencia BETWEEN '2026-04-01' AND '2026-06-30' AND criado_em IN
      (SELECT DISTINCT criado_em FROM historico_custos ORDER BY criado_em DESC LIMIT 2)`);
    expect(old.rows[0].total).toBe(0); // seleção global antiga reproduz o vazio falso da auditoria
    const result = await api.getLatestImportComparison(period);
    expect(result.error).toBeNull();
    expect(result.data.estadoComparacao).toBe('disponivel');
    expect(result.data.totalEventosElegiveis).toBe(3);
    expect(result.data.imports.map(r => r.criado_em)).toEqual([
      '2026-09-10T10:00:00.000002+00:00', '2026-09-10T10:00:00.000001+00:00'
    ]);
    expect(result.data.imports.map(r => r.quantidade)).toEqual([1, 1]);
    expect(result.data.resumo).toMatchObject({ delta_media: 20, variacao_percentual_media: 25 });
    const reads = requests.filter(r => r.table === 'historico_custos');
    expect(reads.every(r => r.filters.some(([key, op, v]) => key === 'data_referencia' && op === '>=' && v === period.start))).toBe(true);
    expect(reads.every(r => r.options.count === 'exact' && r.orders.at(-1)[0] === 'id')).toBe(true);
  });

  it.each(methods)('%s: janeiro–março/recorte vazio não recebe importações globais nem zeros', async method => {
    await auditFixture();
    const result = await api[method]({ start: '2026-01-01', end: '2026-03-31' });
    expect(result.error).toBeNull();
    expect(result.data).toMatchObject({ imports: [], estadoComparacao: 'insuficiente', motivo: 'sem_eventos_no_recorte' });
    if (method === methods[0]) expect(result.data.resumo).toBeNull();
  });

  it.each(methods)('%s: uma importação permanece insuficiente, inclusive competência única', async method => {
    await auditFixture();
    const result = await api[method]({ start: '2026-06-01', end: '2026-06-30' });
    expect(result.error).toBeNull();
    expect(result.data).toMatchObject({ estadoComparacao: 'insuficiente', motivo: 'apenas_um_evento' });
    expect(result.data.imports).toHaveLength(1);
    if (method === methods[0]) expect(result.data.resumo).toBeNull();
  });

  it('duas datas na mesma competência preservam os eventos; importação pode ocorrer depois da competência', async () => {
    await add(1, '2026-06-05', '2026-10-01T00:00:00Z', 80);
    await add(2, '2026-06-14', '2026-10-02T00:00:00Z', 100);
    const result = await api.getLatestImportComparison({ start: '2026-06-01', end: '2026-06-30' });
    expect(result.data.estadoComparacao).toBe('disponivel');
    expect(result.data.imports.map(r => r.media)).toEqual([100, 80]);
    expect(result.data.resumo.variacao_percentual_media).toBe(25);
  });

  it('Comparação explícita preserva somente as datas escolhidas, sem preencher meses intermediários', async () => {
    await auditFixture();
    const result = await api.getLatestImportComparison({ competencias: ['2026-04-05', '2026-06-14'], ...period });
    expect(result.data.imports.map(r => r.media)).toEqual([80, 60]);
    expect(requests[0].filters).toEqual([['data_referencia', 'IN', ['2026-04-05', '2026-06-14']]]);
  });

  it('cascata/produto restringem o universo antes da escolha dos eventos; não há evento com zero itens', async () => {
    await auditFixture();
    await add(6, '2026-06-25', '2026-10-25T00:00:00Z', 500, '002');
    const result = await api.getLatestImportComparison({ ...period, item: '001' });
    expect(result.data.totalEventosElegiveis).toBe(3);
    expect(result.data.imports.map(r => r.media)).toEqual([100, 80]);
    expect(result.data.imports.every(r => r.quantidade > 0)).toBe(true);
    const missing = await api.getLatestImportComparison({ ...period, item: '999' });
    expect(missing.data).toMatchObject({ estadoComparacao: 'insuficiente', imports: [], resumo: null });
  });

  it('zero real é válido; denominador zero não gera 0% nem estabilidade', async () => {
    await add(1, '2026-04-05', '2026-10-01T00:00:00Z', 0);
    await add(2, '2026-06-14', '2026-10-02T00:00:00Z', 10);
    const result = await api.getLatestImportComparison(period);
    expect(result.data.estadoComparacao).toBe('disponivel');
    expect(result.data.imports[1]).toMatchObject({ quantidade: 1, media: 0 });
    expect(result.data.resumo).toEqual({ variacao_percentual_media: null, delta_media: 10, motivoPercentual: 'base_anterior_zero' });
  });

  it('fatos com timestamp empatado formam um evento, sem escolher id como segundo evento', async () => {
    await add(1, '2026-04-05', '2026-10-01T00:00:00Z', 10);
    await add(2, '2026-06-14', '2026-10-01T00:00:00Z', 20);
    const result = await api.getLatestImportComparison(period);
    expect(result.data).toMatchObject({ estadoComparacao: 'insuficiente', totalEventosElegiveis: 1, resumo: null });
    expect(result.data.imports[0]).toMatchObject({ quantidade: 2, media: 15 });
  });

  it('TOP não compara o mesmo produto em datas distintas nem mistura componentes de snapshots', async () => {
    await auditFixture();
    const result = await api.getTopVariacoesImportacao(period);
    expect(result.data).toMatchObject({ estadoComparacao: 'insuficiente', motivo: 'sem_pares_comparaveis', paresComparaveis: 0 });
    expect(result.data.imports.every(t => !t.startsWith('2026-10-19'))).toBe(true);
    expect(result.data.aumentos).toEqual([]);
    expect(result.data.semComparativo).toEqual(expect.arrayContaining([
      expect.objectContaining({ codigo_produto: '001', data_referencia: '2026-05-14', novo: 100, antigo: null, id_atual: 2 }),
      expect.objectContaining({ codigo_produto: '001', data_referencia: '2026-04-05', novo: null, antigo: 80, id_anterior: 1 })
    ]));
  });

  it('unicidade produto+data impede reter dois snapshots do mesmo par; reimportação não é histórico fabricado', async () => {
    await add(1, '2026-06-14', '2026-10-01T00:00:00Z');
    await expect(add(2, '2026-06-14', '2026-10-02T00:00:00Z')).rejects.toThrow(/unique_produto_data/);
    expect((await api.getTopVariacoesImportacao(period)).data.estadoComparacao).toBe('insuficiente');
  });

  it.each(methods)('%s: >1000 fatos, recorte/ordem repetidos em todas as páginas, sem N+1', async method => {
    await db.exec(`INSERT INTO historico_custos(id,codigo_produto,data_referencia,criado_em,custo_total)
      SELECT i, lpad(i::text,5,'0'), '2026-06-14', CASE WHEN i > 500 THEN '2026-10-02'::timestamptz ELSE '2026-10-01'::timestamptz END, 100
      FROM generate_series(1,1201) i`);
    const result = await api[method](period);
    expect(result.error).toBeNull();
    expect(result.data.imports).toHaveLength(2);
    const history = requests.filter(r => r.table === 'historico_custos');
    expect(history.map(r => r.range)).toEqual([[0, 499], [500, 999], [1000, 1499]]);
    expect(history.every(r => r.filters.length === 2)).toBe(true);
    expect(requests.length).toBeLessThan(15);
  });

  it.each(['erro', 'pagina_incompleta', 'count_divergente', 'id_repetido', 'rejeicao'])('%s bloqueia retorno parcial de ambos os métodos', async mode => {
    await db.exec(`INSERT INTO historico_custos(id,codigo_produto,data_referencia,criado_em,custo_total)
      SELECT i,i::text,'2026-06-14','2026-10-01',100 FROM generate_series(1,501) i`);
    fault = (r, response) => {
      if (r.table !== 'historico_custos' || r.range[0] !== 500) return response;
      if (mode === 'erro') return { data: null, count: null, error: new Error('Leitura falhou') };
      if (mode === 'rejeicao') throw new Error('Leitura rejeitada');
      if (mode === 'pagina_incompleta') return { ...response, data: [] };
      if (mode === 'count_divergente') return { ...response, count: 502 };
      return { ...response, data: [{ ...response.data[0], id: 1 }] };
    };
    for (const method of methods) {
      const result = await api[method](period);
      expect(result.data).toBeNull();
      expect(result.error).not.toBeNull();
    }
  });
});
