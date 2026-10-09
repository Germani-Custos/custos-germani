/* Comando administrativo opt-in. Selecionar arquivo na UI nunca chama este script. */
import { readFile, open } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { parseArgs } from 'node:util';
import { executarReconstrucaoCadastroMestre, hashReconstrucao } from './lib/cadastro-mestre-reconstruction.mjs';
import { criarPlanoReconstrucaoCadastroMestre } from '../core/cadastro-mestre-reconstruction-engine.js';

export async function salvarSnapshotDuravel(destino, snapshot) {
  const file = await open(destino, 'wx', 0o600);
  try { await file.writeFile(JSON.stringify(snapshot, null, 2) + '\n', 'utf8'); await file.sync(); }
  finally { await file.close(); }
}

export async function main(args = process.argv.slice(2)) {
  const { values } = parseArgs({ args, options: {
    executar: { type: 'boolean', default: false }, revisao: { type: 'string' }, arquivo: { type: 'string' },
    snapshot: { type: 'string' }, lote: { type: 'string' }, autor: { type: 'string' }, confirmar: { type: 'string' }
  } });
  if (!values.revisao) throw new Error('Informe --revisao. Sem --executar, apenas valida/mostra o plano local, sem conexão ao banco.');
  const evidencia = JSON.parse(await readFile(values.revisao, 'utf8'));
  const plano = criarPlanoReconstrucaoCadastroMestre(evidencia.manifesto, evidencia.revisao);
  const confirmacao = `RECONSTRUIR_MASTER:${hashReconstrucao(evidencia.manifesto)}`;
  if (!values.executar) { console.log(JSON.stringify({ ...plano.resumo, confirmacao, somente_validacao_local: true })); return; }
  if (values.confirmar !== confirmacao || !values.arquivo || !values.snapshot || !values.lote || !values.autor) {
    throw new Error('Execução exige --arquivo, --snapshot, --lote, --autor e --confirmar com o vínculo completo do manifesto.');
  }
  const connectionString = process.env.CADASTRO_MESTRE_DATABASE_URL;
  if (!connectionString) throw new Error('CADASTRO_MESTRE_DATABASE_URL é obrigatória somente no ambiente administrativo; nunca no frontend.');
  const bytes = await readFile(values.arquivo);
  const arquivo = { name: path.basename(values.arquivo), arrayBuffer: async () => bytes };
  const leitor = createRequire(import.meta.url)('xlsx');
  const { Client } = await import('pg');
  const client = new Client({ connectionString });
  try {
    await client.connect();
    const result = await executarReconstrucaoCadastroMestre({ client, arquivo, evidencia, leitor,
      identificadorLote: values.lote, autor: values.autor, confirmacao,
      salvarSnapshot: snapshot => salvarSnapshotDuravel(values.snapshot, snapshot) });
    console.log(JSON.stringify(result));
  } finally { await client.end(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => {
    const connectionString = process.env.CADASTRO_MESTRE_DATABASE_URL;
    let message = String(error.message || 'Falha administrativa');
    if (connectionString) message = message.replaceAll(connectionString, '[conexão omitida]');
    console.error(message.replace(/postgres(?:ql)?:\/\/\S+/gi, '[conexão omitida]'));
    console.error('Reconstrução não confirmada. Conferir revisão, log e snapshot; não repetir automaticamente.');
    process.exitCode = 1;
  });
}
