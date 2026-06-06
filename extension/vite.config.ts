import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  const isPopup = mode === 'popup';

  return {
    plugins: [react()],
    build: {
      outDir: 'dist',
      emptyOutDir: !isPopup, // Clear on content build, keep on popup build
      rollupOptions: {
        input: (isPopup
          ? { popup: resolve(__dirname, 'src/popup.tsx') }
          : { content: resolve(__dirname, 'src/content.tsx') }) as any,
        output: {
          entryFileNames: '[name].js',
          assetFileNames: '[name].[ext]',
          format: 'iife', // Self-contained bundle
        },
      },
    },
  };
});
