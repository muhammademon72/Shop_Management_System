export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"

function genId(): string {
  return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}

function now(): number { return Date.now() }

export async function GET() {
  try {
    const data = {
      exportedAt: new Date().toISOString(),
      categories: await db.category.findMany(),
      brands: await db.brand.findMany(),
      uoms: await db.uom.findMany(),
      products: await db.product.findMany(),
      suppliers: await db.supplier.findMany(),
      inventory: await db.inventoryStock.findMany(),
      customers: await db.customer.findMany(),
      company: await db.companyProfile.findMany(),
      users: await db.appUser.findMany(),
    }
    return NextResponse.json(data, {
      headers: { "Content-Disposition": `attachment; filename="shop-backup-${Date.now()}.json"` },
    })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const tables = [
      "SellItem", "QuotationItem", "PurchaseItem",
      "InventoryStock", "Sell", "Quotation", "Purchase",
      "Product", "Customer", "Supplier",
      "Uom", "Brand", "Category",
      "CompanyProfile",
    ]
    for (const table of tables) {
      await db.execute(`DELETE FROM ${table}`)
    }
    return NextResponse.json({ success: true, message: "All data deleted (except user accounts)" })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const ts = now()

    // Helper to convert values — handles numbers, strings, objects, nulls
    const toStr = (v: unknown): string | null => {
      if (v === null || v === undefined || v === "") return null
      if (typeof v === "object") return JSON.stringify(v)
      return String(v)
    }
    const toNum = (v: unknown): number => {
      if (typeof v === "number") return v
      if (typeof v === "string") return Number(v) || 0
      if (v === null || v === undefined) return 0
      return 0
    }
    const toInt = (v: unknown): number | null => {
      if (v === null || v === undefined || v === "") return null
      if (typeof v === "number") return Math.round(v)
      const n = Number(v)
      return isNaN(n) ? null : Math.round(n)
    }
    // Convert date to epoch ms (handles ISO strings, numbers, Date objects)
    const toTs = (v: unknown): number => {
      if (!v) return ts
      if (typeof v === "number") return v
      const d = new Date(String(v))
      return isNaN(d.getTime()) ? ts : d.getTime()
    }

    // Step 1: Delete all existing data (except AppUser)
    const tables = [
      "SellItem", "QuotationItem", "PurchaseItem",
      "InventoryStock", "Sell", "Quotation", "Purchase",
      "Product", "Customer", "Supplier",
      "Uom", "Brand", "Category", "CompanyProfile",
    ]
    for (const t of tables) {
      await db.execute(`DELETE FROM ${t}`)
    }

    // Step 2: Insert data from backup
    // ID maps for relations
    const idMap: Record<string, Record<string, string>> = {}

    // Categories
    idMap.category = {}
    for (const c of body.categories ?? []) {
      const id = genId()
      idMap.category[c.id] = id
      await db.execute({
        sql: 'INSERT INTO Category (id, name, type, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
        args: [id, String(c.name ?? ""), String(c.type ?? "Goods"), String(c.status ?? "Active"), ts, ts]
      })
    }

    // Brands
    idMap.brand = {}
    for (const b of body.brands ?? []) {
      const id = genId()
      idMap.brand[b.id] = id
      await db.execute({
        sql: 'INSERT INTO Brand (id, name, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
        args: [id, String(b.name ?? ""), String(b.status ?? "Active"), ts, ts]
      })
    }

    // UOMs
    idMap.uom = {}
    for (const u of body.uoms ?? []) {
      const id = genId()
      idMap.uom[u.id] = id
      await db.execute({
        sql: 'INSERT INTO Uom (id, name, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
        args: [id, String(u.name ?? ""), String(u.status ?? "Active"), ts, ts]
      })
    }

    // Products
    idMap.product = {}
    for (const p of body.products ?? []) {
      const id = genId()
      idMap.product[p.id] = id
      await db.execute({
        sql: 'INSERT INTO Product (id, name, categoryId, brandId, uomId, model, serial, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: [
          id,
          String(p.name ?? ""),
          p.categoryId && idMap.category[p.categoryId] ? idMap.category[p.categoryId] : null,
          p.brandId && idMap.brand[p.brandId] ? idMap.brand[p.brandId] : null,
          p.uomId && idMap.uom[p.uomId] ? idMap.uom[p.uomId] : null,
          toStr(p.model), toStr(p.serial), String(p.status ?? "Active"), ts, ts
        ]
      })
    }

    // Suppliers
    idMap.supplier = {}
    for (const s of body.suppliers ?? []) {
      const id = genId()
      idMap.supplier[s.id] = id
      await db.execute({
        sql: 'INSERT INTO Supplier (id, name, mobile, address, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        args: [id, String(s.name ?? ""), String(s.mobile ?? ""), toStr(s.address), String(s.status ?? "Active"), ts, ts]
      })
    }

    // Customers
    idMap.customer = {}
    for (const c of body.customers ?? []) {
      const id = genId()
      idMap.customer[c.id] = id
      await db.execute({
        sql: 'INSERT INTO Customer (id, name, mobile, address, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        args: [id, String(c.name ?? ""), String(c.mobile ?? ""), toStr(c.address), String(c.status ?? "Active"), ts, ts]
      })
    }

    // Purchases + PurchaseItems
    idMap.purchase = {}
    for (const p of body.purchases ?? []) {
      const id = genId()
      idMap.purchase[p.id] = id
      await db.execute({
        sql: 'INSERT INTO Purchase (id, purchaseDate, supplierId, invoiceNo, totalPrice, discount, grandTotal, attachment, remarks, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: [
          id,
          toTs(p.purchaseDate),
          p.supplierId && idMap.supplier[p.supplierId] ? idMap.supplier[p.supplierId] : null,
          String(p.invoiceNo ?? ""),
          toNum(p.totalPrice), toNum(p.discount), toNum(p.grandTotal),
          toStr(p.attachment), toStr(p.remarks), ts, ts
        ]
      })
      // Items
      for (const it of p.items ?? []) {
        const itemId = genId()
        await db.execute({
          sql: 'INSERT INTO PurchaseItem (id, purchaseId, productId, category, brand, model, serial, qty, price, total, condition, warrantyText, remarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          args: [
            itemId, id,
            it.productId && idMap.product[it.productId] ? idMap.product[it.productId] : null,
            toStr(it.category), toStr(it.brand), toStr(it.model), toStr(it.serial),
            toNum(it.qty), toNum(it.price), toNum(it.total),
            toStr(it.condition), toStr(it.warrantyText), toStr(it.remarks)
          ]
        })
      }
    }

    // Inventory
    for (const i of body.inventory ?? []) {
      const id = genId()
      await db.execute({
        sql: 'INSERT INTO InventoryStock (id, date, invoice, productId, brand, model, serial, condition, warrantyText, qty, uom, remarks, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: [
          id,
          toTs(i.date),
          String(i.invoice ?? ""),
          i.productId && idMap.product[i.productId] ? idMap.product[i.productId] : null,
          toStr(i.brand), toStr(i.model), toStr(i.serial),
          toStr(i.condition), toStr(i.warrantyText),
          toNum(i.qty), toStr(i.uom), toStr(i.remarks), ts, ts
        ]
      })
    }

    // Quotations + Items
    for (const q of body.quotations ?? []) {
      const id = genId()
      await db.execute({
        sql: 'INSERT INTO Quotation (id, quotationDate, customerId, invoiceNo, totalPrice, discount, grandTotal, remarks, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: [
          id,
          toTs(q.quotationDate),
          q.customerId && idMap.customer[q.customerId] ? idMap.customer[q.customerId] : null,
          String(q.invoiceNo ?? ""),
          toNum(q.totalPrice), toNum(q.discount), toNum(q.grandTotal),
          toStr(q.remarks), ts, ts
        ]
      })
      for (const it of q.items ?? []) {
        const itemId = genId()
        await db.execute({
          sql: 'INSERT INTO QuotationItem (id, quotationId, productId, brand, model, serial, condition, warrantyText, qty, price, total, remarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          args: [
            itemId, id,
            it.productId && idMap.product[it.productId] ? idMap.product[it.productId] : null,
            toStr(it.brand), toStr(it.model), toStr(it.serial),
            toStr(it.condition), toStr(it.warrantyText),
            toNum(it.qty), toNum(it.price), toNum(it.total), toStr(it.remarks)
          ]
        })
      }
    }

    // Sells + Items
    for (const s of body.sells ?? []) {
      const id = genId()
      await db.execute({
        sql: 'INSERT INTO Sell (id, sellDate, customerId, invoiceNo, totalPrice, discount, grandTotal, paidAmount, dueAmount, remarks, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: [
          id,
          toTs(s.sellDate),
          s.customerId && idMap.customer[s.customerId] ? idMap.customer[s.customerId] : null,
          String(s.invoiceNo ?? ""),
          toNum(s.totalPrice), toNum(s.discount), toNum(s.grandTotal),
          toNum(s.paidAmount), toNum(s.dueAmount), toStr(s.remarks), ts, ts
        ]
      })
      for (const it of s.items ?? []) {
        const itemId = genId()
        await db.execute({
          sql: 'INSERT INTO SellItem (id, sellId, productId, brand, model, serial, condition, warrantyText, qty, price, total, remarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          args: [
            itemId, id,
            it.productId && idMap.product[it.productId] ? idMap.product[it.productId] : null,
            toStr(it.brand), toStr(it.model), toStr(it.serial),
            toStr(it.condition), toStr(it.warrantyText),
            toNum(it.qty), toNum(it.price), toNum(it.total), toStr(it.remarks)
          ]
        })
      }
    }

    // Company Profile
    for (const c of body.company ?? []) {
      const id = genId()
      await db.execute({
        sql: 'INSERT INTO CompanyProfile (id, name, address, phone, email, website, vatNo, logo, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: [
          id, String(c.name ?? ""), toStr(c.address), toStr(c.phone),
          toStr(c.email), toStr(c.website), toStr(c.vatNo), toStr(c.logo), ts, ts
        ]
      })
    }

    return NextResponse.json({ success: true, restored: true })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
