/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PROXY_PORT?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
