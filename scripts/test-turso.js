const { createClient } = require('@libsql/client')

const url = process.env.DATABASE_URL
const authToken = process.env.TURSO_AUTH_TOKEN

if (!url || !url.startsWith('libsql:')) { console.error('DATABASE_URL must be libsql://'); process.exit(1) }
if (!authToken) { console.error('TURSO_AUTH_TOKEN required'); process.exit(1) }

const client = createClient({ url, authToken })

async function run() {
  console.log('Connecting to:', url)
  // 1. Verify connectivity
  const rs = await client.execute("SELECT 1 AS ok")
  console.log('Connection OK:', rs.rows[0])

  // 2. List existing tables
  const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
  console.log('\nExisting tables:')
  for (const r of tables.rows) {
    console.log(' -', r.name)
  }
}
run().catch(e => { console.error('Fatal:', e.message); process.exit(1) })
