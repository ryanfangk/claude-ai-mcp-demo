import { defineConfig } from 'vitest/config'

// Unit layer: pure functions, no DB, no Payload, no globalSetup — fast.
// Co-located `*.test.ts` next to source. (Integration tests live in tests/int
// and run via vitest.config.mts, which boots Payload + a disposable test DB.)
export default defineConfig({
  // Native tsconfig path-alias resolution (no vite-tsconfig-paths plugin).
  resolve: { tsconfigPaths: true },
  test: {
    name: 'unit',
    environment: 'node',
    include: ['{lib,components,collections,app}/**/*.test.ts'],
  },
})
