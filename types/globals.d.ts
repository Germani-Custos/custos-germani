declare const XLSX: any;

interface Window {
  __ENV__?: Record<string, string | undefined>;
  __RUNTIME_CONFIG__?: Record<string, string | undefined>;
}

interface ImportMeta {
  env?: Record<string, string | undefined>;
}
