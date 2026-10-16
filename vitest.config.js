import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/**/*.test.js'],
    environment: 'node',
    setupFiles: ['./test/setup.js'],
    clearMocks: true,
    // The default `forks` pool intermittently never answers on this setup
    // ("Timeout waiting for worker to respond"), leaving `npm test` hung with
    // no output. Threads share this test suite's statelessness fine and start
    // reliably.
    pool: 'threads',
  },
})
