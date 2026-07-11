import { defineConfig } from 'vite'

export default defineConfig({
  // Ensure service worker & PWA assets are available at site root
  publicDir: 'public',
  build: {
    // Keep asset names stable-ish for SW cache of static icons
    assetsInlineLimit: 0,
  },
  server: {
    host: true,
  },
})
