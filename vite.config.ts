import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    manifest: true,
    target: 'es2020',
    rollupOptions: {
      output: {
        // Named per-variant chunks so the prerender step can find each variant's CSS and JS.
        // Everything shared is pinned elsewhere, or a manual chunk absorbs it (React ended up inside V0 once).
        manualChunks(id) {
          const m = id.match(/src\/variants\/(v\d+[a-z]?)\//)
          if (m) return `variant-${m[1]}`
          if (id.includes('node_modules/three/')) return 'three'
          if (id.includes('node_modules/@fontsource')) return undefined
          if (id.includes('node_modules/')) return 'vendor'
          if (/src\/(shared|content|lib)\//.test(id)) return 'core'
        },
      },
    },
  },
  ssr: { noExternal: ['framer-motion'] },
})
