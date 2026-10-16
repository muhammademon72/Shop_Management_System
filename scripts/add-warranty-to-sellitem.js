const { createClient } = require('@libsql/client')

const url = process.env.DATABASE_URL
const authToken = process.env.TURSO_AUTH_TOKEN

if (!url || !url.startsWith('libsql:')) { console.error('DATABASE_URL must be libsql://'); process.exit(1) }
if (!authToken) { console.error('TURSO_AUTH_TOKEN required'); process.exit(1) }

const client = createClient({ url, authToken })

async function run() {
  // Add warrantyText column to SellItem (idempotent — skip if already exists)
  try {
    await client.execute('ALTER TABLE SellItem ADD COLUMN warrantyText TEXT;')
    console.log('OK: warrantyText column added to SellItem.')
  } catch (e) {
    if (/duplicate column|already exists/i.test(e.message)) {
      console.log('SKIP: warrantyText column already exists on SellItem.')
    } else {
      console.error('FAIL:', e.message); process.exit(1)
    }
  }
}
run().catch(e => { console.error('Fatal:', e); process.exit(1) })
