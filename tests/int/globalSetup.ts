import { execSync } from 'node:child_process'
import { Client } from 'pg'

// Vitest globalSetup — runs ONCE in the main process before any suite.
//
// Provisions a pristine, disposable test database:
//   1. Guard — refuse to proceed unless the target DB name contains "test", so
//      this destructive routine can never run against dev/prod data.
//   2. Drop + recreate the database, then run the real migration FILES via the
//      Payload bin invoked DIRECTLY with node (not `pnpm migrate` — a nested
//      pnpm inside the test runner can be flaky in CI). We migrate (not
//      schema-push) so the test DB matches production exactly.
//   3. Verify the schema materialized; RETRY the whole drop/create/migrate up
//      to 3 times if not, and fail LOUD with the migrate output if it never
//      does — rather than letting every test fail with "relation does not exist".

const PAYLOAD_BIN = 'node_modules/payload/bin.js'
const SCHEMA_CHECK_TABLE = 'admins' // first auth collection in the demo

export async function setup() {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL is not set — expected .env.test (or CI env) to provide it.')
  }

  const dbName = new URL(url).pathname.replace(/^\//, '')
  if (!/test/i.test(dbName)) {
    throw new Error(
      `Refusing to run the test harness: database "${dbName}" does not look like a test DB ` +
        `(its name must contain "test"). This guard prevents wiping dev/prod data.`,
    )
  }

  const adminUrl = new URL(url)
  adminUrl.pathname = '/postgres'

  const dropCreate = async () => {
    const admin = new Client({ connectionString: adminUrl.toString() })
    await admin.connect()
    try {
      await admin.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`)
      await admin.query(`CREATE DATABASE "${dbName}"`)
    } finally {
      await admin.end()
    }
  }

  const schemaTableExists = async () => {
    const c = new Client({ connectionString: url })
    await c.connect()
    try {
      const { rows } = await c.query(`SELECT to_regclass('public.${SCHEMA_CHECK_TABLE}') AS t`)
      return Boolean(rows[0]?.t)
    } finally {
      await c.end()
    }
  }

  let migrateOut = ''
  let ok = false
  for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
    await dropCreate()
    try {
      // 2>&1 merges stderr so the migrate logs are captured even in CI.
      migrateOut = execSync(`node ${PAYLOAD_BIN} migrate 2>&1`, { env: process.env, encoding: 'utf8' })
    } catch (err) {
      const e = err as { stdout?: string; message?: string }
      migrateOut = e.stdout ?? e.message ?? ''
    }
    ok = await schemaTableExists()
    if (!ok) {
      console.warn(`[globalSetup] migrate attempt ${attempt}/3 did not create the schema. Output:\n${migrateOut}`)
    }
  }

  if (!ok) {
    throw new Error(
      `Test DB migration failed after 3 attempts — "${SCHEMA_CHECK_TABLE}" table missing.\n--- last output ---\n${migrateOut}`,
    )
  }
  console.log('[globalSetup] test DB migrated.')
}
