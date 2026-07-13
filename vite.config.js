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
  },
  server: {
    host: true,
  },
})
