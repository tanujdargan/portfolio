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
          const m = id.match(/src\/variants\/(main|[a-z]\d+[a-z]?)\//)
          if (m) return `variant-${m[1]}`
          if (id.includes('node_modules/three/')) return 'three'
          // SGP4 is only used by the lazy orbit demo; keep it out of the vendor chunk every page loads.
          if (id.includes('node_modules/satellite.js/')) return 'sgp4'
          // Font CSS shared by two variants would otherwise be absorbed into one of them (v5 ended up importing v0).
          // Per file, not per package: grouping would hand one variant another's weights (v5 started fetching v1's Plex 500).
          const font = id.match(/node_modules\/@fontsource(?:-variable)?\/([^/]+)\/([^/?]+)\.css/)
          if (font) return `font-${font[1]}-${font[2]}`
          // Every page loads React and MotionConfig (App's MotionProvider); the rest of framer-motion only comes with
          // the variants and demos that animate with it. MotionConfig's files are pinned so 'motion' isn't pulled in.
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react'
          if (/framer-motion\/dist\/es\/(components\/MotionConfig\/|context\/MotionConfigContext|utils\/use-constant|render\/dom\/utils\/filter-props|motion\/utils\/valid-prop)/.test(id)) return 'motion-config'
          if (/node_modules\/(framer-motion|motion-dom|motion-utils)\//.test(id)) return 'motion'
          if (id.includes('node_modules/lucide-react/')) return 'icons'
          if (id.includes('node_modules/lenis/')) return 'lenis'
          if (id.includes('node_modules/')) return 'vendor'
          // Shared modules get a chunk each, so a page only loads the ones it renders.
          const shared = id.match(/src\/shared\/(posters\/)?([\w-]+)\./)
          if (shared) return `shared-${shared[1] ? 'posters' : shared[2]}`
          if (/src\/demos\/Demo\.tsx/.test(id)) return 'shared-Demo'
          if (/src\/lib\/lenis\./.test(id)) return 'lenis'
          if (/src\/(content|lib)\//.test(id)) return 'core'
          // Each shared data file gets its own chunk: one bundle made every page load steering.json via the
          // timelapse manifest, and leaving them unpinned lets a variant absorb them.
          const data = id.match(/src\/data\/([\w-]+)\.json/)
          if (data) return `data-${data[1]}`
        },
      },
    },
  },
  ssr: { noExternal: ['framer-motion'] },
})
