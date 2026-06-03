import { defineConfig } from 'vitest/config'
import { config as loadEnv } from 'dotenv'

// Load the committed, non-secret test env BEFORE anything imports payload.config
// (which calls requireEnv() at module-load). This runs in Vitest's main process,
// so spawned test workers inherit these vars. dotenv does NOT override vars that
// are already set, so CI can supply its own DATABASE_URL via the workflow env.
loadEnv({ path: '.env.test' })

export default defineConfig({
  // Resolve the tsconfig path aliases (@payload-config, @/*) natively — Vite
  // supports this directly, so no vite-tsconfig-paths plugin needed.
  resolve: { tsconfigPaths: true },
  test: {
    // Backend Local-API suite. `node` is how `payload run` executes the
    // config — the demo's tests are server-only.
    environment: 'node',
    include: ['tests/int/**/*.int.spec.ts'],
    // Drops + recreates + migrates the disposable test DB once before all suites.
    globalSetup: ['tests/int/globalSetup.ts'],
    // Booting Payload + a fresh getPayload() is slow; give hooks generous room.
    testTimeout: 60_000,
    hookTimeout: 120_000,
    // One disposable test DB shared across files — run files serially so suites
    // don't race on the same rows.
    fileParallelism: false,
  },
})
