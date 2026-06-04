// Seed the local dev DB with a first admin so a freshly-cloned project
// can sign in immediately (no manual `/admin` first-user form).
//
// Idempotent: re-runs do nothing once an admin exists.
//
// Usage:
//   pnpm seed
//
// Demo-grade credentials — do NOT use in production. The whole point of
// this script is to skip ceremony for the local pop-up-shop demo; the
// password is intentionally trivial and the file is committed.

import { getPayload } from 'payload'
import config from '../payload.config'

const SEED_EMAIL = 'admin@example.com'
const SEED_PASSWORD = '123456'

async function main() {
  const payload = await getPayload({ config })

  const existing = await payload.find({
    collection: 'admins',
    limit: 1,
    overrideAccess: true,
  })

  if (existing.totalDocs > 0) {
    console.log(`Seed: admin already exists (${existing.docs[0].email}); nothing to do.`)
    process.exit(0)
  }

  const admin = await payload.create({
    collection: 'admins',
    data: { email: SEED_EMAIL, password: SEED_PASSWORD },
    overrideAccess: true,
  })

  console.log(`Seed: created admin ${admin.email} (password "${SEED_PASSWORD}"). Sign in at /admin.`)
  process.exit(0)
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
