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
          // Font CSS shared by two variants would otherwise be absorbed into one of them (v5 ended up importing v0).
          // Per file, not per package: grouping would hand one variant another's weights (v5 started fetching v1's Plex 500).
          const font = id.match(/node_modules\/@fontsource(?:-variable)?\/([^/]+)\/([^/?]+)\.css/)
          if (font) return `font-${font[1]}-${font[2]}`
          if (id.includes('node_modules/')) return 'vendor'
          if (/src\/(shared|content|lib)\//.test(id)) return 'core'
          // Shared data (steering.json is used by the demo, v2, v3, v6) gets its own chunk, or a variant absorbs it.
          if (/src\/data\//.test(id)) return 'data'
        },
      },
    },
  },
  ssr: { noExternal: ['framer-motion'] },
})
