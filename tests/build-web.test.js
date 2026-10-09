import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { buildWeb } from '../scripts/build-web.mjs';

describe('Deploy estático sem credenciais administrativas', () => {
  const env = { ...process.env, VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_ANON_KEY: 'publishable-test',
    CADASTRO_MESTRE_STORAGE_SECRET_KEY: 'secret-canary-never-public', CADASTRO_MESTRE_DATABASE_URL: 'postgresql://secret-canary-server-only' };
  it('publica imports/docs/assets necessários e exclui função, executor, SQL, env e dependências', () => {
    const output = buildWeb({ env });
    for (const path of ['index.html', 'assets/style.css', 'services/api.js', 'src/services/api.js', 'core/spreadsheet-engine.js',
      'view/ui-cadastro-mestre-preview.js', 'docs/manuais/manual-operacao.md', 'runtime-config.js']) expect(existsSync(join(output, path))).toBe(true);
    for (const path of ['api', 'scripts', 'sql', 'tests', 'node_modules', '.env', '.env.example', 'package.json', 'Banco de Dados.txt']) {
      expect(existsSync(join(output, path))).toBe(false);
    }
    const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]);
    const files = walk(output);
    for (const path of files) {
      const content = readFileSync(path, 'utf8');
      expect(content).not.toContain(env.CADASTRO_MESTRE_STORAGE_SECRET_KEY);
      expect(content).not.toContain(env.CADASTRO_MESTRE_DATABASE_URL);
      if (path.endsWith('.js')) for (const match of content.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)) {
        if (match[1].startsWith('.')) expect(existsSync(join(path, '..', match[1]))).toBe(true);
      }
    }
    expect(readFileSync(join(output, 'runtime-config.js'), 'utf8')).not.toContain('CADASTRO_MESTRE_');
    const config = JSON.parse(readFileSync('vercel.json', 'utf8'));
    expect(config.outputDirectory).toBe('dist');
    expect(config.functions['api/reconstruir-cadastro-mestre.js'].maxDuration).toBe(300);
  });
  it.each(['sb_secret_fake', `x.${Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url')}.x`])('bloqueia chave administrativa atribuída à chave pública', key => {
    expect(() => buildWeb({ env: { ...env, VITE_SUPABASE_ANON_KEY: key } })).toThrow('administrativa');
  });
  it('bloqueia credencial administrativa vazada por variável pública', () => {
    expect(() => buildWeb({ env: { ...env, VITE_SUPABASE_ANON_KEY: env.CADASTRO_MESTRE_STORAGE_SECRET_KEY } })).toThrow('credencial administrativa');
  });
});
