import { vi } from 'vitest';

export const ambienteWeb = {
  VITE_SUPABASE_URL: 'https://teste.supabase.co', VITE_SUPABASE_ANON_KEY: 'public-test',
  CADASTRO_MESTRE_EXECUTION_ENABLED: 'true', CADASTRO_MESTRE_EXECUTION_ADMIN_IDS: 'admin-id',
  CADASTRO_MESTRE_APP_ORIGIN: 'https://kustos.example', CADASTRO_MESTRE_DATABASE_URL: 'postgresql://postgres:test@db.teste.supabase.co/postgres',
  CADASTRO_MESTRE_STORAGE_SECRET_KEY: 'secret-test', CADASTRO_MESTRE_SNAPSHOT_BUCKET: 'snapshots'
};
export function respostaWeb() {
  return { code: null, body: null, setHeader: vi.fn(), status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
}
export function storageWeb() {
  const arquivos = new Map();
  const upload = vi.fn(async (path, bytes) => {
    if (arquivos.has(path)) return { error: new Error('Snapshot existente') };
    arquivos.set(path, bytes);
    return { error: null };
  });
  const download = vi.fn(async path => ({ data: new Blob([arquivos.get(path)]), error: null }));
  const storage = { getBucket: vi.fn(async () => ({ data: { public: false }, error: null })),
    from: vi.fn(() => ({ upload, download })) };
  return { storage, arquivos, upload, download,
    criarSupabase: (_url, key) => key === ambienteWeb.CADASTRO_MESTRE_STORAGE_SECRET_KEY ? { storage } :
      { auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'admin-id' } }, error: null })) } } };
}
