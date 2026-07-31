import { defineConfig } from 'vite'

export default defineConfig({
  // Ensure service worker & PWA assets are available at site root
  publicDir: 'public',
  // The iOS app (ios/) loads this build from a file:// bundle via
  // WKWebView, where absolute "/assets/..." paths (Vite's web default)
  // resolve to nothing. build:ios sets BASE_PATH=./ so every reference
  // stays relative to the bundled index.html; the hosted web build is
  // unaffected since it keeps the default "/".
  base: process.env.BASE_PATH || '/',
  build: {
    manifest: true,
    // Keep asset names stable-ish for SW cache of static icons
    assetsInlineLimit: 0,
    // The flight engine is lazy-loaded, but Three.js used to travel in the
    // same large async file. Keep the renderer runtime cacheable on its own so
    // engine/gameplay edits do not invalidate the heaviest dependency chunk.
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'three-runtime',
              priority: 20,
              minSize: 0,
              test: (id) => id.includes('/node_modules/') && (id.includes('/three/') || id.includes('/three@')),
            },
          ],
        },
      },
    },
  },
  server: {
    host: true,
  },
})
