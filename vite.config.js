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
    chunkSizeWarningLimit: 800,
    minify: 'esbuild',          // fast + drops dead code
    rollupOptions: {
      output: {
        // Split vendor chunks so the long-tail UI code is cached separately from React core
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three';
          if (id.includes('node_modules/gsap') || id.includes('node_modules/@studio-freight')) return 'gsap';
          if (id.includes('node_modules/lucide-react')) return 'icons';
          if (id.includes('node_modules/simplex-noise')) return 'noise';
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) return 'react-vendor';
          // Split each below-fold section into its own chunk (loaded lazily)
          if (id.includes('/sections/About')) return 'section-about';
          if (id.includes('/sections/Projects')) return 'section-projects';
          if (id.includes('/sections/Skills')) return 'section-skills';
          if (id.includes('/sections/Experience')) return 'section-experience';
          if (id.includes('/sections/Terminal')) return 'section-terminal';
          if (id.includes('/sections/Contact')) return 'section-contact';
          if (id.includes('/sections/Footer')) return 'section-footer';
          // Heavy conditional overlays in their own chunks
          if (id.includes('/components/DetailPage')) return 'overlay-detail';
          if (id.includes('/components/ChatWidget')) return 'overlay-chat';
          if (id.includes('/components/AudioVisualizer')) return 'overlay-audio';
          if (id.includes('/components/AstronautHUD')) return 'overlay-hud';
          if (id.includes('/components/KeyboardHelp')) return 'overlay-keyboard';
          if (id.includes('/components/SourceViewer')) return 'overlay-source';
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
