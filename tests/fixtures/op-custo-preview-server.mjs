// Preview descartável de UI. Não importa a API real nem se conecta ao Supabase.
import { createServer } from 'node:http';
import process from 'node:process';
import { Buffer } from 'node:buffer';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key';
globalThis.window = { __ENV__: { VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_ANON_KEY: 'test-anon-key' } };
const { makeOpCustoContext, makeOpEvent, makeCostSnapshots } = await import('./op-custo-context.js');
delete globalThis.window;
const root = fileURLToPath(new URL('../../', import.meta.url));
function fixture(competencia) {
  const raw = makeOpCustoContext();
  const opEventos = raw.opEventos.map(row => ({ ...row, data_referencia: `${competencia}-05` }));
  const custoSnapshots = raw.custoSnapshots.map(row => ({ ...row, data_referencia: `${competencia}-${row.data_referencia.slice(8)}` }));
  if (competencia === '2026-09') return makeOpCustoContext({ competencia, opEventos, custoSnapshots: [] });
  if (competencia === '2026-08') return makeOpCustoContext({ competencia, opEventos: [], custoSnapshots });
  if (competencia === '2026-07') return makeOpCustoContext({ competencia,
    opEventos: Array.from({ length: 1001 }, (_, i) => makeOpEvent({ id: `volume-${i}`, op: i, cod_produto: String(100000 + i), data_referencia: '2026-07-05' })),
    custoSnapshots: Array.from({ length: 1001 }, (_, i) => makeCostSnapshots(String(100000 + i)).map(r => ({ ...r, data_referencia: `2026-07-${r.data_referencia.slice(8)}` }))).flat() });
  return makeOpCustoContext({ competencia, opEventos, custoSnapshots });
}
const mockApi = `export const api = {
  getCurrentUser: async () => ({data:{user:{user_metadata:{username:'Validação sintética local'}}}}),
  getMasters: async () => ({error:null,origens:[],familias:[],agrupamentos:[],produtos:[],dicionario:[],hierarquia:[]}),
  getApontamentosOp: async () => ({data:(await (await fetch('/fixture?competencia=2026-10')).json()).opEventos,error:null}),
  getOpCustoContext: async ({competencia}) => ({data:await (await fetch('/fixture?competencia='+encodeURIComponent(competencia))).json(),error:null})
};`;
const types = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.md': 'text/plain' };
createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1:4185');
    if (req.method !== 'GET') { res.writeHead(405).end(); return; }
    if (url.pathname === '/fixture') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(fixture(url.searchParams.get('competencia') || '2026-10'))); return;
    }
    if (url.pathname === '/src/services/api.js') { res.writeHead(200, { 'Content-Type': 'text/javascript' }); res.end(mockApi); return; }
    if (url.pathname === '/runtime-config.js') {
      res.writeHead(200, { 'Content-Type': 'text/javascript' });
      res.end("window.__ENV__={VITE_SUPABASE_URL:'https://example.supabase.co',VITE_SUPABASE_ANON_KEY:'test-anon-key'};"); return;
    }
    const relative = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname).slice(1);
    const path = resolve(root, relative);
    if (!path.startsWith(resolve(root) + sep) || !['index.html', 'view/', 'core/', 'assets/', 'src/config/', 'docs/'].some(prefix => relative.startsWith(prefix))) {
      res.writeHead(403).end(); return;
    }
    let content = await readFile(path);
    if (relative === 'index.html') content = Buffer.from(content.toString().replace('<body>', '<body><p style="padding:12px;background:#35264a">VALIDAÇÃO LOCAL — DADOS SINTÉTICOS · sem acesso ao Supabase</p>'));
    res.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(content);
  } catch { res.writeHead(404).end('Recurso indisponível no preview sintético.'); }
}).listen(4185, '127.0.0.1', () => console.log('Preview sintético: http://127.0.0.1:4185/ — encerre com Ctrl+C.'));
