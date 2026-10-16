const { createClient } = require('@libsql/client')
const url = process.env.DATABASE_URL
const authToken = process.env.TURSO_AUTH_TOKEN
const client = createClient({ url, authToken })

async function run() {
  const rs = await client.execute("PRAGMA table_info(SellItem);")
  for (const row of rs.rows) {
    console.log(row.name, '->', row.type)
  }
}
run().catch(e => { console.error('Fatal:', e); process.exit(1) })
