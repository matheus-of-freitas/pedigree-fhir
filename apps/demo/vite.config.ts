import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const here = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@pedigree/core': `${here}../../packages/core/src/index.ts`,
      '@pedigree/react': `${here}../../packages/react/src/index.ts`,
    },
  },
});
