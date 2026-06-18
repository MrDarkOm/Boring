/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PROXY_PORT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
