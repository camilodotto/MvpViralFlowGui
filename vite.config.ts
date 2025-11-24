import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Importante: base './' para funcionar via file:// dentro do Electron
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
  },
});
