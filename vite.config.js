import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cloudflare } from '@cloudflare/vite-plugin';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), cloudflare()],
  server: { port: 5173, open: true },

  build: {
    target: 'es2020',           // smaller modern bundles, drops legacy polyfills
    cssCodeSplit: true,
    sourcemap: false,
    reportCompressedSize: false, // speeds up build; size is what Brotli/CF compresses anyway
    chunkSizeWarningLimit: 600,
    minify: 'esbuild',          // fast + drops dead code
    rollupOptions: {
      output: {
        // Split vendor chunks so the long-tail UI code is cached separately from React core
        manualChunks: {
          'react-vendor':  ['react', 'react-dom'],
          'icons':         ['lucide-react'],
          'noise':         ['simplex-noise']
        },
        // Long-term cacheable hashed names
        entryFileNames:  'assets/[name]-[hash].js',
        chunkFileNames:  'assets/[name]-[hash].js',
        assetFileNames:  'assets/[name]-[hash][extname]'
      }
    }
  },

  esbuild: {
    // Strip console.* and debugger in production builds
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : []
  }
});
