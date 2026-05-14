/* Runtime config injetado antes do bootstrap da aplicação.
 * Preencha os valores no deploy (ex.: etapa de build/copy no Vercel).
 */
window.__ENV__ = window.__ENV__ || {
  VITE_SUPABASE_URL: '',
  VITE_SUPABASE_ANON_KEY: '',
  VITE_ENABLE_VERBOSE_LOGS: 'false'
};
