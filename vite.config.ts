import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * GitHub Pages serves the site from https://tooto920.github.io/A340-600/
 * so every asset URL is relative to that sub-path.
 */
export default defineConfig({
  base: '/A340-600/',
  plugins: [react(), tailwindcss()],
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    chunkSizeWarningLimit: 1400,
    rollupOptions: {
      output: {
        // Rolldown (Vite 8) requires a function here rather than an object map.
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('three') || id.includes('postprocessing')) return 'vendor-three'
          if (id.includes('@react-three')) return 'vendor-r3f'
          if (id.includes('gsap')) return 'vendor-gsap'
          if (id.includes('react-dom') || id.includes('/react/')) return 'vendor-react'
          return undefined
        },
      },
    },
  },
})
