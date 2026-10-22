/* Validação exclusivamente local: não importa pg, API ou executor de reconstrução. */
import { readFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { parseArgs } from 'node:util';
import { validarCargaComercial } from './lib/cadastro-mestre-comercial.mjs';

export async function main(args = process.argv.slice(2)) {
  const { values } = parseArgs({ args, options: {
    manifesto: { type: 'string' }, hash: { type: 'string' }, fotografia: { type: 'string' }, arquivo: { type: 'string' }
  } });
  if (!values.manifesto || !values.hash || !values.fotografia || !values.arquivo) {
    throw new Error('Informe --manifesto, --hash (SHA-256 canônico aprovado), --fotografia e --arquivo. Somente validação local.');
  }
  const [manifestoBytes, fotografiaBytes, bytes] = await Promise.all([
    readFile(values.manifesto), readFile(values.fotografia), readFile(values.arquivo)
  ]);
  const plano = await validarCargaComercial({ manifesto: JSON.parse(manifestoBytes.toString('utf8')), hashManifesto: values.hash,
    fotografiaBytes, arquivo: { name: basename(values.arquivo), arrayBuffer: async () => bytes }, leitor: createRequire(import.meta.url)('xlsx') });
  const resultado = { contrato: 'CARGA_COMERCIAL_ISOLADA_V1', somente_validacao_local: true, escrita_real: false,
    hash_manifesto: plano.hashManifesto, fotografia_sha256: plano.fotografiaSha256, ...plano.resumo };
  console.log(JSON.stringify(resultado, null, 2));
  return resultado;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(() => { console.error('Validação comercial falhou; nenhuma conexão ou escrita foi realizada.'); process.exitCode = 1; });
}
