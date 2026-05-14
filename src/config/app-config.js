/* Responsabilidade: configuração centralizada (env, flags, URLs e modo operacional). */
function requireValue(key, value) {
  if (!value) {
    throw new Error(`Configuração obrigatória ausente: ${key}. Verifique as variáveis de ambiente.`);
  }

  return value;
}

export const appConfig = {
  appEnv: import.meta.env.MODE || 'development',
  enableVerboseLogs: import.meta.env.VITE_ENABLE_VERBOSE_LOGS === 'true',
  supabase: {
    url: requireValue('VITE_SUPABASE_URL', import.meta.env.VITE_SUPABASE_URL),
    anonKey: requireValue('VITE_SUPABASE_ANON_KEY', import.meta.env.VITE_SUPABASE_ANON_KEY)
  }
};

export function debugLog(...args) {
  if (!appConfig.enableVerboseLogs) return;
  console.info('[debug]', ...args);
}
