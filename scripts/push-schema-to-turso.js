const { createClient } = require('@libsql/client')
const { execSync } = require('child_process')

const url = process.env.DATABASE_URL
const authToken = process.env.TURSO_AUTH_TOKEN

if (!url || !url.startsWith('libsql:')) { console.error('DATABASE_URL must be libsql://'); process.exit(1) }
if (!authToken) { console.error('TURSO_AUTH_TOKEN required'); process.exit(1) }

console.log('Generating SQL from Prisma schema...')
const sql = execSync('bunx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script', { encoding: 'utf8' })
console.log('Generated', sql.split('\n').length, 'lines')

const client = createClient({ url, authToken })

function splitStatements(sql) {
  const out = []; let buf = ''
  for (const line of sql.split('\n')) {
    const t = line.trim()
    if (t.startsWith('--') || t.length === 0) continue
    buf += (buf ? '\n' : '') + line
    if (t.endsWith(';')) { out.push(buf); buf = '' }
  }
  if (buf.trim()) out.push(buf)
  return out
}

async function run() {
  const stmts = splitStatements(sql)
  console.log('Running', stmts.length, 'SQL statements...')
  let ok = 0, skip = 0
  for (const s of stmts) {
    try { await client.execute(s); ok++ }
    catch (e) { if (/already exists|duplicate/i.test(e.message)) skip++; else { console.error('FAIL:', s.slice(0,200)); console.error(e.message); process.exit(1) } }
  }
  console.log('Done. OK:', ok, 'Skipped:', skip)
}
run().catch(e => { console.error('Fatal:', e); process.exit(1) })
