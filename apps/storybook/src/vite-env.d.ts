/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly STORYBOOK_DOCSITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
