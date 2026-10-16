import { createClient, type Client } from '@libsql/client'

/**
 * Direct @libsql/client connection to Turso.
 * 
 * We bypass Prisma entirely because Prisma's Rust query engine can't
 * read environment variables on Vercel's serverless functions, causing
 * "URL_INVALID: The URL 'undefined'" errors at runtime.
 * 
 * This module exports a `db` object with methods that mimic the most
 * commonly used Prisma operations (findMany, create, update, delete)
 * using raw SQL via @libsql/client. This way, the API routes don't
 * need to change much — they just call `db.category.findMany()` etc.
 * 
 * For local development, if DATABASE_URL is a file: path, we still
 * use this client (libSQL client supports file: URLs too).
 */

const FALLBACK_URL = 'libsql://database-cyclamen-ferry-vercel-icfg-aduzcyxzagywfkds7rsn5mkv.aws-us-east-1.turso.io'
const FALLBACK_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTIwODUwNTcsImlkIjoiMDFhMTQwOTctZGQwMS03ODQ0LWIzZDQtMGZiYWFiMjlmZjdmIiwia2lkIjoiWW1aV2g0YnFQcDV5dHVXODNsbkNtWm1HX1RyN0hEbkpyRzZQUEgxNkVBcyIsInJpZCI6IjM1MTZlNTY1LWYyNTctNDBhZC05OTRkLWU4MDUzM2I1M2UxOCJ9.xpdXpnVicqbWoRfSDsKD3qZaqYgZWGDlIRW37G0_RRxVjbi_YLaiSdna6b7ChG98Q-QCVi_ohjg_W1WSBiJQAA'

let url = process.env.DATABASE_URL ?? ''
let authToken = process.env.TURSO_AUTH_TOKEN ?? ''

const isMissing = (v: string) => !v || v.trim() === '' || v === 'undefined'
if (isMissing(url)) url = FALLBACK_URL
if (isMissing(authToken)) authToken = FALLBACK_TOKEN

// For local file: URLs, @libsql/client works too (it supports local files)
const client: Client = createClient(
  url.startsWith('file:')
    ? { url }
    : { url, authToken }
)

export { client }

// === Helper: convert a row (which has values as Uint8Array/string/number) to a plain object ===
function row<T = Record<string, unknown>>(r: Record<string, unknown>): T {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(r)) {
    if (v instanceof Uint8Array) {
      out[k] = Buffer.from(v).toString('utf8')
    } else {
      out[k] = v
    }
  }
  return out as T
}

function rows<T = Record<string, unknown>[]>(rs: { rows: Record<string, unknown>[] }): T[] {
  return rs.rows.map((r) => row<T>(r))
}

// === DB API: mimics Prisma's model.findMany / create / update / delete ===
// Each "model" is a table name. We provide findMany, findUnique, create,
// update, delete, count, and aggregate methods.

// === Helper: generate a cuid-like ID ===
function genId(): string {
  return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}

// === Helper: current timestamp (epoch ms) ===
function now(): number {
  return Date.now()
}

export const db = {
  // === Category ===
  category: {
    async findMany(args?: { where?: Record<string, unknown>; orderBy?: Record<string, string>; take?: number }) {
      let sql = 'SELECT * FROM Category'
      const params: unknown[] = []
      const where = args?.where
      if (where) {
        const clauses: string[] = []
        for (const [k, v] of Object.entries(where)) {
          if (v === undefined || v === null) continue
          clauses.push(`${k} = ?`)
          params.push(v)
        }
        if (clauses.length) sql += ' WHERE ' + clauses.join(' AND ')
      }
      sql += ' ORDER BY createdAt DESC'
      if (args?.take) { sql += ' LIMIT ?'; params.push(args.take) }
      const rs = await client.execute({ sql, args: params })
      return rows(rs)
    },
    async create(args: { data: Record<string, unknown> }) {
      const data = { id: genId(), createdAt: now(), updatedAt: now(), ...args.data }
      const cols = Object.keys(data)
      const vals = Object.values(data)
      const placeholders = cols.map(() => '?').join(', ')
      const sql = `INSERT INTO Category (${cols.join(', ')}) VALUES (${placeholders}) RETURNING *`
      const rs = await client.execute({ sql, args: vals })
      return row(rs.rows[0])
    },
    async update(args: { where: { id: string }; data: Record<string, unknown> }) {
      const updateData = { ...args.data, updatedAt: now() }
      const sets = Object.keys(updateData).map((k) => `${k} = ?`)
      const vals = [...Object.values(updateData), args.where.id]
      const sql = `UPDATE Category SET ${sets.join(', ')} WHERE id = ? RETURNING *`
      const rs = await client.execute({ sql, args: vals })
      return row(rs.rows[0])
    },
    async delete(args: { where: { id: string } }) {
      await client.execute({ sql: 'DELETE FROM Category WHERE id = ?', args: [args.where.id] })
      return { success: true }
    },
    async count() {
      const rs = await client.execute('SELECT COUNT(*) as count FROM Category')
      return Number(rs.rows[0]?.count ?? 0)
    },
  },

  // === Brand ===
  brand: {
    async findMany(args?: { where?: Record<string, unknown> }) {
      let sql = 'SELECT * FROM Brand'
      const params: unknown[] = []
      const where = args?.where
      if (where) {
        const clauses: string[] = []
        for (const [k, v] of Object.entries(where)) {
          if (v === undefined || v === null) continue
          clauses.push(`${k} = ?`)
          params.push(v)
        }
        if (clauses.length) sql += ' WHERE ' + clauses.join(' AND ')
      }
      sql += ' ORDER BY createdAt DESC'
      const rs = await client.execute({ sql, args: params })
      return rows(rs)
    },
    async create(args: { data: Record<string, unknown> }) {
      const data = { id: genId(), createdAt: now(), updatedAt: now(), ...args.data }
      const cols = Object.keys(data)
      const vals = Object.values(data)
      const placeholders = cols.map(() => '?').join(', ')
      const sql = `INSERT INTO Brand (${cols.join(', ')}) VALUES (${placeholders}) RETURNING *`
      const rs = await client.execute({ sql, args: vals })
      return row(rs.rows[0])
    },
    async update(args: { where: { id: string }; data: Record<string, unknown> }) {
      const updateData = { ...args.data, updatedAt: now() }
      const sets = Object.keys(updateData).map((k) => `${k} = ?`)
      const vals = [...Object.values(updateData), args.where.id]
      const sql = `UPDATE Brand SET ${sets.join(', ')} WHERE id = ? RETURNING *`
      const rs = await client.execute({ sql, args: vals })
      return row(rs.rows[0])
    },
    async delete(args: { where: { id: string } }) {
      await client.execute({ sql: 'DELETE FROM Brand WHERE id = ?', args: [args.where.id] })
      return { success: true }
    },
    async count() {
      const rs = await client.execute('SELECT COUNT(*) as count FROM Brand')
      return Number(rs.rows[0]?.count ?? 0)
    },
  },

  // === Uom ===
  uom: {
    async findMany() {
      const rs = await client.execute('SELECT * FROM Uom ORDER BY createdAt DESC')
      return rows(rs)
    },
    async create(args: { data: Record<string, unknown> }) {
      const data = { id: genId(), createdAt: now(), updatedAt: now(), ...args.data }
      const cols = Object.keys(data)
      const vals = Object.values(data)
      const placeholders = cols.map(() => '?').join(', ')
      const sql = `INSERT INTO Uom (${cols.join(', ')}) VALUES (${placeholders}) RETURNING *`
      const rs = await client.execute({ sql, args: vals })
      return row(rs.rows[0])
    },
    async update(args: { where: { id: string }; data: Record<string, unknown> }) {
      const updateData = { ...args.data, updatedAt: now() }
      const sets = Object.keys(updateData).map((k) => `${k} = ?`)
      const vals = [...Object.values(updateData), args.where.id]
      const sql = `UPDATE Uom SET ${sets.join(', ')} WHERE id = ? RETURNING *`
      const rs = await client.execute({ sql, args: vals })
      return row(rs.rows[0])
    },
    async delete(args: { where: { id: string } }) {
      await client.execute({ sql: 'DELETE FROM Uom WHERE id = ?', args: [args.where.id] })
      return { success: true }
    },
  },

  // === Condition ===
  condition: {
    async findMany() {
      const rs = await client.execute('SELECT * FROM Condition ORDER BY createdAt DESC')
      return rows(rs)
    },
    async create(args: { data: Record<string, unknown> }) {
      const data = { id: genId(), createdAt: now(), updatedAt: now(), ...args.data }
      const cols = Object.keys(data)
      const vals = Object.values(data)
      const placeholders = cols.map(() => '?').join(', ')
      const sql = `INSERT INTO Condition (${cols.join(', ')}) VALUES (${placeholders}) RETURNING *`
      const rs = await client.execute({ sql, args: vals })
      return row(rs.rows[0])
    },
    async update(args: { where: { id: string }; data: Record<string, unknown> }) {
      const updateData = { ...args.data, updatedAt: now() }
      const sets = Object.keys(updateData).map((k) => `${k} = ?`)
      const vals = [...Object.values(updateData), args.where.id]
      const sql = `UPDATE Condition SET ${sets.join(', ')} WHERE id = ? RETURNING *`
      const rs = await client.execute({ sql, args: vals })
      return row(rs.rows[0])
    },
    async delete(args: { where: { id: string } }) {
      await client.execute({ sql: 'DELETE FROM Condition WHERE id = ?', args: [args.where.id] })
      return { success: true }
    },
  },

  // === Warranty ===
  warranty: {
    async findMany() {
      const rs = await client.execute('SELECT * FROM Warranty ORDER BY createdAt DESC')
      return rows(rs)
    },
    async create(args: { data: Record<string, unknown> }) {
      const data = { id: genId(), createdAt: now(), updatedAt: now(), ...args.data }
      const cols = Object.keys(data)
      const vals = Object.values(data)
      const placeholders = cols.map(() => '?').join(', ')
      const sql = `INSERT INTO Warranty (${cols.join(', ')}) VALUES (${placeholders}) RETURNING *`
      const rs = await client.execute({ sql, args: vals })
      return row(rs.rows[0])
    },
    async update(args: { where: { id: string }; data: Record<string, unknown> }) {
      const updateData = { ...args.data, updatedAt: now() }
      const sets = Object.keys(updateData).map((k) => `${k} = ?`)
      const vals = [...Object.values(updateData), args.where.id]
      const sql = `UPDATE Warranty SET ${sets.join(', ')} WHERE id = ? RETURNING *`
      const rs = await client.execute({ sql, args: vals })
      return row(rs.rows[0])
    },
    async delete(args: { where: { id: string } }) {
      await client.execute({ sql: 'DELETE FROM Warranty WHERE id = ?', args: [args.where.id] })
      return { success: true }
    },
  },

  // === Product (with relations to Category, Brand, Uom) ===
  product: {
    async findMany() {
      const rs = await client.execute(`
        SELECT p.*, c.name as "category.name", c.id as "category.id",
               b.name as "brand.name", b.id as "brand.id",
               u.name as "uom.name", u.id as "uom.id"
        FROM Product p
        LEFT JOIN Category c ON p.categoryId = c.id
        LEFT JOIN Brand b ON p.brandId = b.id
        LEFT JOIN Uom u ON p.uomId = u.id
        ORDER BY p.createdAt DESC
      `)
      // Flatten the joined columns into nested objects (like Prisma does)
      return rs.rows.map((r) => {
        const obj: Record<string, unknown> = {}
        const nested: Record<string, Record<string, unknown>> = {}
        for (const [k, v] of Object.entries(r)) {
          if (k.includes('.')) {
            const [model, field] = k.split('.')
            if (!nested[model]) nested[model] = {}
            if (v !== null) nested[model][field] = v
          } else {
            obj[k] = v instanceof Uint8Array ? Buffer.from(v).toString('utf8') : v
          }
        }
        obj.category = nested.category || null
        obj.brand = nested.brand || null
        obj.uom = nested.uom || null
        return obj
      })
    },
    async create(args: { data: Record<string, unknown> }) {
      const data = { id: genId(), createdAt: now(), updatedAt: now(), ...args.data }
      const cols = Object.keys(data)
      const vals = Object.values(data)
      const placeholders = cols.map(() => '?').join(', ')
      const sql = `INSERT INTO Product (${cols.join(', ')}) VALUES (${placeholders}) RETURNING *`
      const rs = await client.execute({ sql, args: vals })
      return row(rs.rows[0])
    },
    async update(args: { where: { id: string }; data: Record<string, unknown> }) {
      const updateData = { ...args.data, updatedAt: now() }
      const sets = Object.keys(updateData).map((k) => `${k} = ?`)
      const vals = [...Object.values(updateData), args.where.id]
      const sql = `UPDATE Product SET ${sets.join(', ')} WHERE id = ? RETURNING *`
      const rs = await client.execute({ sql, args: vals })
      return row(rs.rows[0])
    },
    async delete(args: { where: { id: string } }) {
      await client.execute({ sql: 'DELETE FROM Product WHERE id = ?', args: [args.where.id] })
      return { success: true }
    },
    async count() {
      const rs = await client.execute('SELECT COUNT(*) as count FROM Product')
      return Number(rs.rows[0]?.count ?? 0)
    },
  },

  // === Supplier ===
  supplier: {
    async findMany() {
      const rs = await client.execute('SELECT * FROM Supplier ORDER BY createdAt DESC')
      return rows(rs)
    },
    async create(args: { data: Record<string, unknown> }) {
      const data = { id: genId(), createdAt: now(), updatedAt: now(), ...args.data }
      const cols = Object.keys(data)
      const vals = Object.values(data)
      const placeholders = cols.map(() => '?').join(', ')
      const sql = `INSERT INTO Supplier (${cols.join(', ')}) VALUES (${placeholders}) RETURNING *`
      const rs = await client.execute({ sql, args: vals })
      return row(rs.rows[0])
    },
    async update(args: { where: { id: string }; data: Record<string, unknown> }) {
      const updateData = { ...args.data, updatedAt: now() }
      const sets = Object.keys(updateData).map((k) => `${k} = ?`)
      const vals = [...Object.values(updateData), args.where.id]
      const sql = `UPDATE Supplier SET ${sets.join(', ')} WHERE id = ? RETURNING *`
      const rs = await client.execute({ sql, args: vals })
      return row(rs.rows[0])
    },
    async delete(args: { where: { id: string } }) {
      await client.execute({ sql: 'DELETE FROM Supplier WHERE id = ?', args: [args.where.id] })
      return { success: true }
    },
    async count() {
      const rs = await client.execute('SELECT COUNT(*) as count FROM Supplier')
      return Number(rs.rows[0]?.count ?? 0)
    },
  },

  // === Customer ===
  customer: {
    async findMany() {
      const rs = await client.execute('SELECT * FROM Customer ORDER BY createdAt DESC')
      return rows(rs)
    },
    async create(args: { data: Record<string, unknown> }) {
      const data = { id: genId(), createdAt: now(), updatedAt: now(), ...args.data }
      const cols = Object.keys(data)
      const vals = Object.values(data)
      const placeholders = cols.map(() => '?').join(', ')
      const sql = `INSERT INTO Customer (${cols.join(', ')}) VALUES (${placeholders}) RETURNING *`
      const rs = await client.execute({ sql, args: vals })
      return row(rs.rows[0])
    },
    async update(args: { where: { id: string }; data: Record<string, unknown> }) {
      const updateData = { ...args.data, updatedAt: now() }
      const sets = Object.keys(updateData).map((k) => `${k} = ?`)
      const vals = [...Object.values(updateData), args.where.id]
      const sql = `UPDATE Customer SET ${sets.join(', ')} WHERE id = ? RETURNING *`
      const rs = await client.execute({ sql, args: vals })
      return row(rs.rows[0])
    },
    async delete(args: { where: { id: string } }) {
      await client.execute({ sql: 'DELETE FROM Customer WHERE id = ?', args: [args.where.id] })
      return { success: true }
    },
    async count() {
      const rs = await client.execute('SELECT COUNT(*) as count FROM Customer')
      return Number(rs.rows[0]?.count ?? 0)
    },
  },

  // === CompanyProfile ===
  companyProfile: {
    async findMany() {
      const rs = await client.execute('SELECT * FROM CompanyProfile ORDER BY createdAt ASC LIMIT 1')
      return rows(rs)
    },
    async create(args: { data: Record<string, unknown> }) {
      const data = { id: genId(), createdAt: now(), updatedAt: now(), ...args.data }
      const cols = Object.keys(data)
      const vals = Object.values(data)
      const placeholders = cols.map(() => '?').join(', ')
      const sql = `INSERT INTO CompanyProfile (${cols.join(', ')}) VALUES (${placeholders}) RETURNING *`
      const rs = await client.execute({ sql, args: vals })
      return row(rs.rows[0])
    },
    async update(args: { where: { id: string }; data: Record<string, unknown> }) {
      const updateData = { ...args.data, updatedAt: now() }
      const sets = Object.keys(updateData).map((k) => `${k} = ?`)
      const vals = [...Object.values(updateData), args.where.id]
      const sql = `UPDATE CompanyProfile SET ${sets.join(', ')} WHERE id = ? RETURNING *`
      const rs = await client.execute({ sql, args: vals })
      return row(rs.rows[0])
    },
  },

  // === Purchase (with supplier + items + product relations) ===
  purchase: {
    async aggregate(args: { _sum: { grandTotal: true } }) {
      const rs = await client.execute('SELECT COALESCE(SUM(grandTotal), 0) as sum FROM Purchase')
      return { _sum: { grandTotal: Number(rs.rows[0]?.sum ?? 0) } }
    },
    async count() {
      const rs = await client.execute('SELECT COUNT(*) as count FROM Purchase')
      return Number(rs.rows[0]?.count ?? 0)
    },
    async findMany() {
      const rs = await client.execute(`
        SELECT p.*, s.name as "supplier.name", s.id as "supplier.id",
               s.mobile as "supplier.mobile", s.address as "supplier.address",
               s.status as "supplier.status"
        FROM Purchase p
        LEFT JOIN Supplier s ON p.supplierId = s.id
        ORDER BY p.createdAt DESC
      `)
      const purchases = rs.rows.map((r) => {
        const obj: Record<string, unknown> = {}
        const supplier: Record<string, unknown> = {}
        for (const [k, v] of Object.entries(r)) {
          if (k.startsWith('supplier.')) {
            const field = k.split('.')[1]
            if (v !== null) supplier[field] = v
          } else {
            obj[k] = v instanceof Uint8Array ? Buffer.from(v).toString('utf8') : v
          }
        }
        obj.supplier = Object.keys(supplier).length ? supplier : null
        return obj
      })
      // Load items for each purchase
      for (const p of purchases) {
        const itemsRs = await client.execute(`
          SELECT pi.*, pr.name as "product.name", pr.id as "product.id"
          FROM PurchaseItem pi
          LEFT JOIN Product pr ON pi.productId = pr.id
          WHERE pi.purchaseId = ?
        `, [p.id])
        p.items = itemsRs.rows.map((r) => {
          const obj: Record<string, unknown> = {}
          const product: Record<string, unknown> = {}
          for (const [k, v] of Object.entries(r)) {
            if (k.startsWith('product.')) {
              const field = k.split('.')[1]
              if (v !== null) product[field] = v
            } else {
              obj[k] = v instanceof Uint8Array ? Buffer.from(v).toString('utf8') : v
            }
          }
          obj.product = Object.keys(product).length ? product : null
          return obj
        })
      }
      return purchases
    },
  },

  // === Sell (with customer + items + product relations) ===
  sell: {
    async aggregate(args: { _sum: { grandTotal: true } }) {
      const rs = await client.execute('SELECT COALESCE(SUM(grandTotal), 0) as sum FROM Sell')
      return { _sum: { grandTotal: Number(rs.rows[0]?.sum ?? 0) } }
    },
    async count() {
      const rs = await client.execute('SELECT COUNT(*) as count FROM Sell')
      return Number(rs.rows[0]?.count ?? 0)
    },
    async findMany() {
      const rs = await client.execute(`
        SELECT s.*, c.name as "customer.name", c.id as "customer.id",
               c.mobile as "customer.mobile", c.address as "customer.address"
        FROM Sell s
        LEFT JOIN Customer c ON s.customerId = c.id
        ORDER BY s.createdAt DESC
      `)
      const sells = rs.rows.map((r) => {
        const obj: Record<string, unknown> = {}
        const customer: Record<string, unknown> = {}
        for (const [k, v] of Object.entries(r)) {
          if (k.startsWith('customer.')) {
            const field = k.split('.')[1]
            if (v !== null) customer[field] = v
          } else {
            obj[k] = v instanceof Uint8Array ? Buffer.from(v).toString('utf8') : v
          }
        }
        obj.customer = Object.keys(customer).length ? customer : null
        return obj
      })
      for (const s of sells) {
        const itemsRs = await client.execute(`
          SELECT si.*, pr.name as "product.name", pr.id as "product.id"
          FROM SellItem si
          LEFT JOIN Product pr ON si.productId = pr.id
          WHERE si.sellId = ?
        `, [s.id])
        s.items = itemsRs.rows.map((r) => {
          const obj: Record<string, unknown> = {}
          const product: Record<string, unknown> = {}
          for (const [k, v] of Object.entries(r)) {
            if (k.startsWith('product.')) {
              const field = k.split('.')[1]
              if (v !== null) product[field] = v
            } else {
              obj[k] = v instanceof Uint8Array ? Buffer.from(v).toString('utf8') : v
            }
          }
          obj.product = Object.keys(product).length ? product : null
          return obj
        })
      }
      return sells
    },
  },

  // === InventoryStock (with product + purchase.supplier relations) ===
  inventoryStock: {
    async delete(args: { where: { id: string } }) {
      await client.execute({ sql: 'DELETE FROM InventoryStock WHERE id = ?', args: [args.where.id] })
      return { success: true }
    },
    async create(args: { data: Record<string, unknown> }) {
      const data = { id: genId(), createdAt: now(), updatedAt: now(), ...args.data }
      const cols = Object.keys(data)
      const vals = Object.values(data)
      const placeholders = cols.map(() => '?').join(', ')
      const sql = `INSERT INTO InventoryStock (${cols.join(', ')}) VALUES (${placeholders}) RETURNING *`
      const rs = await client.execute({ sql, args: vals })
      return row(rs.rows[0])
    },
    async update(args: { where: { id: string }; data: Record<string, unknown> }) {
      const updateData = { ...args.data, updatedAt: now() }
      const sets = Object.keys(updateData).map((k) => `${k} = ?`)
      const vals = [...Object.values(updateData), args.where.id]
      const sql = `UPDATE InventoryStock SET ${sets.join(', ')} WHERE id = ? RETURNING *`
      const rs = await client.execute({ sql, args: vals })
      return row(rs.rows[0])
    },
    async count() {
      const rs = await client.execute('SELECT COUNT(*) as count FROM InventoryStock')
      return Number(rs.rows[0]?.count ?? 0)
    },
    async findMany() {
      const rs = await client.execute(`
        SELECT i.*, p.name as "product.name", p.id as "product.id",
               p.model as "product.model", p.serial as "product.serial",
               u.name as "product.uom.name", u.id as "product.uom.id",
               sup.name as "purchase.supplier.name"
        FROM InventoryStock i
        LEFT JOIN Product p ON i.productId = p.id
        LEFT JOIN Uom u ON p.uomId = u.id
        LEFT JOIN Purchase pur ON i.purchaseId = pur.id
        LEFT JOIN Supplier sup ON pur.supplierId = sup.id
        ORDER BY i.createdAt DESC
      `)
      return rs.rows.map((r) => {
        const obj: Record<string, unknown> = {}
        const product: Record<string, unknown> = {}
        const uom: Record<string, unknown> = {}
        const purchase: Record<string, unknown> = {}
        const supplier: Record<string, unknown> = {}
        for (const [k, v] of Object.entries(r)) {
          if (k.startsWith('product.uom.')) {
            const field = k.split('.')[2]
            if (v !== null) uom[field] = v
          } else if (k.startsWith('product.')) {
            const field = k.split('.')[1]
            if (v !== null) product[field] = v
          } else if (k.startsWith('purchase.supplier.')) {
            const field = k.split('.')[2]
            if (v !== null) supplier[field] = v
          } else {
            obj[k] = v instanceof Uint8Array ? Buffer.from(v).toString('utf8') : v
          }
        }
        product.uom = Object.keys(uom).length ? uom : null
        obj.product = Object.keys(product).length ? product : null
        purchase.supplier = Object.keys(supplier).length ? supplier : null
        obj.purchase = Object.keys(purchase).length ? purchase : null
        return obj
      })
    },
  },

  // === Quotation (with customer + items) ===
  quotation: {
    async findMany() {
      const rs = await client.execute(`
        SELECT q.*, c.name as "customer.name", c.id as "customer.id"
        FROM Quotation q
        LEFT JOIN Customer c ON q.customerId = c.id
        ORDER BY q.createdAt DESC
      `)
      const quotations = rs.rows.map((r) => {
        const obj: Record<string, unknown> = {}
        const customer: Record<string, unknown> = {}
        for (const [k, v] of Object.entries(r)) {
          if (k.startsWith('customer.')) {
            const field = k.split('.')[1]
            if (v !== null) customer[field] = v
          } else {
            obj[k] = v instanceof Uint8Array ? Buffer.from(v).toString('utf8') : v
          }
        }
        obj.customer = Object.keys(customer).length ? customer : null
        return obj
      })
      for (const q of quotations) {
        const itemsRs = await client.execute(`
          SELECT qi.*, pr.name as "product.name", pr.id as "product.id"
          FROM QuotationItem qi
          LEFT JOIN Product pr ON qi.productId = pr.id
          WHERE qi.quotationId = ?
        `, [q.id])
        q.items = itemsRs.rows.map((r) => {
          const obj: Record<string, unknown> = {}
          const product: Record<string, unknown> = {}
          for (const [k, v] of Object.entries(r)) {
            if (k.startsWith('product.')) {
              const field = k.split('.')[1]
              if (v !== null) product[field] = v
            } else {
              obj[k] = v instanceof Uint8Array ? Buffer.from(v).toString('utf8') : v
            }
          }
          obj.product = Object.keys(product).length ? product : null
          return obj
        })
      }
      return quotations
    },
  },

// === AppUser ===
  appUser: {
    async findMany(args?: { where?: Record<string, unknown>; take?: number }) {
      let sql = 'SELECT id, name, email, mobile, role, status, createdAt, updatedAt FROM AppUser'
      const params: unknown[] = []
      const where = args?.where
      if (where) {
        const clauses: string[] = []
        for (const [k, v] of Object.entries(where)) {
          if (v === undefined || v === null) continue
          clauses.push(`${k} = ?`)
          params.push(v)
        }
        if (clauses.length) sql += ' WHERE ' + clauses.join(' AND ')
      }
      sql += ' ORDER BY createdAt DESC'
      if (args?.take) { sql += ' LIMIT ?'; params.push(args.take) }
      const rs = await client.execute({ sql, args: params })
      return rows(rs)
    },
    async findFirst(args: { where: Record<string, unknown> }) {
      let sql = 'SELECT * FROM AppUser'
      const params: unknown[] = []
      const clauses: string[] = []
      for (const [k, v] of Object.entries(args.where)) {
        if (v === undefined || v === null) continue
        clauses.push(`${k} = ?`)
        params.push(v)
      }
      if (clauses.length) sql += ' WHERE ' + clauses.join(' AND ')
      sql += ' LIMIT 1'
      const rs = await client.execute({ sql, args: params })
      return rs.rows.length ? row(rs.rows[0]) : null
    },
    async create(args: { data: Record<string, unknown> }) {
      const data = { id: genId(), createdAt: now(), updatedAt: now(), ...args.data }
      const cols = Object.keys(data)
      const vals = Object.values(data)
      const placeholders = cols.map(() => '?').join(', ')
      const sql = `INSERT INTO AppUser (${cols.join(', ')}) VALUES (${placeholders}) RETURNING *`
      const rs = await client.execute({ sql, args: vals })
      return row(rs.rows[0])
    },
    async update(args: { where: { id: string }; data: Record<string, unknown> }) {
      const updateData = { ...args.data, updatedAt: now() }
      const sets = Object.keys(updateData).map((k) => `${k} = ?`)
      const vals = [...Object.values(updateData), args.where.id]
      const sql = `UPDATE AppUser SET ${sets.join(', ')} WHERE id = ? RETURNING *`
      const rs = await client.execute({ sql, args: vals })
      return row(rs.rows[0])
    },
    async delete(args: { where: { id: string } }) {
      await client.execute({ sql: 'DELETE FROM AppUser WHERE id = ?', args: [args.where.id] })
      return { success: true }
    },
    async count() {
      const rs = await client.execute('SELECT COUNT(*) as count FROM AppUser')
      return Number(rs.rows[0]?.count ?? 0)
    },
  },

  // === Raw SQL execution (for complex queries) ===
  async execute(sql: string, args: unknown[] = []) {
    return client.execute({ sql, args })
  },
  async batch(statements: { sql: string; args: unknown[] }[]) {
    return client.batch(statements.map((s) => ({ sql: s.sql, args: s.args })))
  },
}
