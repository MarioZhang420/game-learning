import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';

export default defineConfig({
  main: {
    // Workspace packages ship TypeScript source, so bundle them; keep real npm deps external.
    plugins: [
      externalizeDepsPlugin({
        exclude: [
          '@game-learning/hub',
          '@game-learning/core',
          '@game-learning/content',
          '@game-learning/protocol',
        ],
      }),
    ],
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: { rollupOptions: { output: { format: 'cjs' } } },
  },
  renderer: {
    root: resolve(import.meta.dirname, 'src/renderer'),
    plugins: [react()],
    build: { rollupOptions: { input: resolve(import.meta.dirname, 'src/renderer/index.html') } },
  },
});
