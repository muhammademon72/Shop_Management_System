const { createClient } = require('@libsql/client')

const url = process.env.DATABASE_URL
const authToken = process.env.TURSO_AUTH_TOKEN

if (!url || !url.startsWith('libsql://')) { console.error('DATABASE_URL must be libsql://'); process.exit(1) }
if (!authToken) { console.error('TURSO_AUTH_TOKEN required'); process.exit(1) }

const client = createClient({ url, authToken })

async function run() {
  console.log('Connecting to:', url)
  console.log('\n=== Row counts for all tables ===')
  const tables = [
    'AppUser', 'Brand', 'Category', 'CompanyProfile', 'Condition', 'Customer',
    'InventoryStock', 'Product', 'Purchase', 'PurchaseItem', 'Quotation',
    'QuotationItem', 'Sell', 'SellItem', 'Supplier', 'Uom', 'Warranty'
  ]

  let total = 0
  for (const t of tables) {
    try {
      const rs = await client.execute(`SELECT COUNT(*) AS cnt FROM "${t}"`)
      const count = rs.rows[0].cnt
      console.log(`  ${t}: ${count} rows`)
      total += Number(count)
    } catch (e) {
      console.log(`  ${t}: ERROR — ${e.message}`)
    }
  }
  console.log(`\nTotal records across all tables: ${total}`)

  // Show a few sample records to verify data is accessible
  console.log('\n=== Sample AppUser records ===')
  const users = await client.execute("SELECT id, email, name FROM AppUser LIMIT 5")
  for (const r of users.rows) {
    console.log(`  ${r.email} — ${r.name}`)
  }

  console.log('\n=== Sample Warranty records ===')
  const warranties = await client.execute("SELECT name, status FROM Warranty LIMIT 5")
  for (const r of warranties.rows) {
    console.log(`  ${r.name} (${r.status})`)
  }
}
run().catch(e => { console.error('Fatal:', e.message); process.exit(1) })
