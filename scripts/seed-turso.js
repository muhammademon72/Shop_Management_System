#!/usr/bin/env node
/**
 * Export data from local SQLite + insert into Turso.
 * Reads from local `db/custom.db` using better-sqlite3 (fallback to a direct
 * approach) and INSERTs into Turso via @libsql/client.
 *
 * Usage:
 *   TURSO_AUTH_TOKEN=... node scripts/seed-turso.js
 */
const { createClient } = require('@libsql/client')
const sqlite3 = require('node:sqlite')

const LOCAL_DB = '/home/z/my-project/db/custom.db'
const TURSO_URL = process.env.DATABASE_URL || 'libsql://shopmanagementsystem-muhammademon72.aws-ap-south-1.turso.io'
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN

if (!TURSO_TOKEN) {
  console.error('TURSO_AUTH_TOKEN env var is required')
  process.exit(1)
}

// Open local SQLite (Node 22+ built-in)
const local = new sqlite3.DatabaseSync(LOCAL_DB, { readOnly: true })

// Open Turso
const turso = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN })

/**
 * List of tables to copy, in dependency order (parents first).
 */
const TABLES = [
  // Product master data
  'Category', 'Brand', 'Uom', 'Condition', 'Warranty',
  'Product',
  // Suppliers + customers
  'Supplier', 'Customer',
  // Company profile
  'CompanyProfile',
  // Purchases + items (depends on Product, Supplier)
  'Purchase', 'PurchaseItem',
  // Inventory stock (depends on Product)
  'InventoryStock',
  // Sales + items (depends on Customer, Product)
  'Sell', 'SellItem',
  // Quotations + items (depends on Customer, Product)
  'Quotation', 'QuotationItem',
  // Users
  'AppUser',
]

function quoteVal(v) {
  if (v === null || v === undefined) return 'NULL'
  if (typeof v === 'number') return String(v)
  if (typeof v === 'bigint') return String(v)
  if (v instanceof Uint8Array) return 'X\'' + Buffer.from(v).toString('hex') + '\''
  // string + dates
  return '\'' + String(v).replace(/'/g, "''") + '\''
}

async function tableExists(turso, name) {
  try {
    await turso.execute({ sql: `SELECT 1 FROM "${name}" LIMIT 0` })
    return true
  } catch {
    return false
  }
}

async function main() {
  let totalRows = 0
  for (const table of TABLES) {
    if (!(await tableExists(turso, table))) {
      console.log(`SKIP ${table} (table does not exist in Turso yet)`)
      continue
    }
    // Read all rows from local SQLite
    let rows
    try {
      rows = local.prepare(`SELECT * FROM "${table}"`).all()
    } catch (e) {
      console.log(`SKIP ${table} (could not read from local DB: ${e.message})`)
      continue
    }
    if (!rows || rows.length === 0) {
      console.log(`EMPTY ${table} (0 rows)`)
      continue
    }
    // Get column order from first row's keys
    const cols = Object.keys(rows[0])
    // Clear existing Turso rows (so re-running is idempotent)
    try { await turso.execute(`DELETE FROM "${table}"`) } catch (e) {
      console.log(`WARN couldn't DELETE FROM ${table}: ${e.message}`)
    }
    // Insert in batches
    let inserted = 0
    for (const row of rows) {
      const colList = cols.map(c => `"${c}"`).join(', ')
      const valList = cols.map(c => quoteVal(row[c])).join(', ')
      const sql = `INSERT INTO "${table}" (${colList}) VALUES (${valList})`
      try {
        await turso.execute(sql)
        inserted += 1
      } catch (e) {
        console.error(`FAIL row in ${table}: ${e.message}`)
        console.error(`SQL: ${sql.slice(0, 200)}`)
      }
    }
    console.log(`OK ${table}: ${inserted}/${rows.length} rows`)
    totalRows += inserted
  }
  console.log(`\nDone. Total rows inserted: ${totalRows}`)
  local.close()
}

main().catch((e) => {
  console.error('Fatal error:', e)
  process.exit(1)
})
