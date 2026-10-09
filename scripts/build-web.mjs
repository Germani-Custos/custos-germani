/* Publicação por allowlist: funções, executor e configurações privadas ficam fora de dist. */
import { mkdirSync, readdirSync, readFileSync, rmSync, copyFileSync } from 'node:fs';
import { resolve, join, extname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));

export function buildWeb({ env = process.env } = {}) {
  const output = resolve(root, 'dist');
  // Destino fixo verificado dentro do checkout; nunca aceitar caminho externo para limpeza.
  if (output !== join(root, 'dist')) throw new Error('Destino de build inválido.');
  const key = env.VITE_SUPABASE_ANON_KEY || '';
  let role;
  try { role = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role; } catch { /* publishable key não é JWT */ }
  if (key.startsWith('sb_secret_') || role === 'service_role') throw new Error('Chave administrativa proibida na configuração pública.');
  rmSync(output, { recursive: true, force: true });
  mkdirSync(output);
  const copied = [];
  const copy = (source, target) => {
    mkdirSync(resolve(target, '..'), { recursive: true });
    copyFileSync(source, target);
    copied.push(target);
  };
  const tree = (folder, extensions) => {
    for (const entry of readdirSync(join(root, folder), { withFileTypes: true })) {
      const path = join(folder, entry.name);
      if (entry.isSymbolicLink()) throw new Error('Symlink proibido nos arquivos publicados.');
      if (entry.isDirectory()) tree(path, extensions);
      else if (extensions.includes(extname(entry.name))) copy(join(root, path), join(output, path));
    }
  };
  copy(join(root, 'index.html'), join(output, 'index.html'));
  for (const dir of ['core', 'view', 'src', 'services']) tree(dir, ['.js']);
  tree('assets', ['.css', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.ico', '.woff', '.woff2']);
  tree('docs', ['.md']);
  execFileSync(process.execPath, [join(root, 'scripts/generate-runtime-config.mjs')], { cwd: output, env, stdio: 'pipe' });
  copied.push(join(output, 'runtime-config.js'));
  const secrets = ['CADASTRO_MESTRE_DATABASE_URL', 'CADASTRO_MESTRE_DATABASE_CA', 'CADASTRO_MESTRE_STORAGE_SECRET_KEY']
    .map(name => env[name]).filter(value => value && value.length >= 8);
  if (copied.some(path => secrets.some(secret => {
    const bytes = readFileSync(path);
    return bytes.includes(Buffer.from(secret)) || bytes.includes(Buffer.from(JSON.stringify(secret).slice(1, -1)));
  }))) {
    rmSync(output, { recursive: true, force: true });
    throw new Error('Build bloqueado: credencial administrativa encontrada em arquivo público.');
  }
  return output;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  buildWeb();
  console.log('[build-web] dist gerado; arquivos administrativos excluídos.');
}
