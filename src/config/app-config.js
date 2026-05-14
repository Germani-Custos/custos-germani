/* Responsabilidade: configuração centralizada (env, flags, URLs e modo operacional). */
function requireValue(key, value, diagnostics) {
  if (!value) {
    const details = diagnostics?.length ? ` Fontes avaliadas: ${diagnostics.join(' | ')}.` : '';
    throw new Error(`Configuração obrigatória ausente: ${key}. Verifique as variáveis de ambiente.${details}`);
  }

  return value;
}

function normalizeEnv(rawEnv) {
  if (!rawEnv || typeof rawEnv !== 'object') return null;

  const normalized = Object.entries(rawEnv).reduce((acc, [key, value]) => {
    if (!key || typeof key !== 'string') return acc;
    if (!key.startsWith('VITE_') && key !== 'MODE' && key !== 'NODE_ENV') return acc;
    if (value == null || value === '') return acc;
    acc[key] = value;
    return acc;
  }, {});

  return Object.keys(normalized).length ? normalized : null;
}

function readWindowEnv() {
  if (typeof window === 'undefined') return null;

  const candidates = [
    { source: 'window.__ENV__', env: window.__ENV__ },
    { source: 'window.__RUNTIME_CONFIG__', env: window.__RUNTIME_CONFIG__ }
  ];

  return candidates.find(({ env }) => normalizeEnv(env)) || null;
}

function readMetaTagEnv() {
  if (typeof document === 'undefined') return null;

  const keys = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'VITE_ENABLE_VERBOSE_LOGS', 'MODE', 'NODE_ENV'];
  const env = {};

  keys.forEach(key => {
    const value = document.querySelector(`meta[name="${key}"]`)?.getAttribute('content');
    if (value) env[key] = value;
  });

  const normalized = normalizeEnv(env);
  return normalized ? { source: 'meta[name=VITE_*]', env: normalized } : null;
}

function resolveEnvSource() {
  const diagnostics = [];

  const runtimeEnv = readWindowEnv();
  diagnostics.push(runtimeEnv ? `${runtimeEnv.source}:ok` : 'window runtime env:empty');
  if (runtimeEnv) return { source: runtimeEnv.source, env: normalizeEnv(runtimeEnv.env), diagnostics };

  const importMetaEnv = typeof import.meta !== 'undefined' && import.meta?.env ? normalizeEnv(import.meta.env) : null;
  diagnostics.push(importMetaEnv ? 'import.meta.env:ok' : 'import.meta.env:empty');
  if (importMetaEnv) return { source: 'import.meta.env', env: importMetaEnv, diagnostics };

  const metaEnv = readMetaTagEnv();
  diagnostics.push(metaEnv ? 'meta[name=VITE_*]:ok' : 'meta[name=VITE_*]:empty');
  if (metaEnv) return { source: metaEnv.source, env: metaEnv.env, diagnostics };

  return { source: 'none', env: {}, diagnostics };
}

function parseBoolean(value) {
  return String(value).trim().toLowerCase() === 'true';
}

const { env, source: envSource, diagnostics } = resolveEnvSource();

export const appConfig = {
  appEnv: env.MODE || env.NODE_ENV || 'development',
  envSource,
  envDiagnostics: diagnostics,
  enableVerboseLogs: parseBoolean(env.VITE_ENABLE_VERBOSE_LOGS),
  supabase: {
    url: requireValue('VITE_SUPABASE_URL', env.VITE_SUPABASE_URL, diagnostics),
    anonKey: requireValue('VITE_SUPABASE_ANON_KEY', env.VITE_SUPABASE_ANON_KEY, diagnostics)
  }
};

export function debugLog(...args) {
  if (!appConfig.enableVerboseLogs) return;
  console.info('[debug]', ...args);
}
