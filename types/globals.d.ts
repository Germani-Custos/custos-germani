declare const XLSX: any;

declare module 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm' {
  export function createClient(url: string, key: string): any;
}

interface Window {
  __ENV__?: Record<string, string | undefined>;
  __RUNTIME_CONFIG__?: Record<string, string | undefined>;
}

interface ImportMeta {
  env?: Record<string, string | undefined>;
}
