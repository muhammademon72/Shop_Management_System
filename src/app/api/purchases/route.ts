export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"

function genId(): string {
  return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}
function now(): number { return Date.now() }

const toStr = (v: unknown): string | null => v === null || v === undefined || v === "" ? null : typeof v === "object" ? JSON.stringify(v) : String(v)
const toNum = (v: unknown): number => typeof v === "number" ? v : Number(v ?? 0) || 0
const toInt = (v: unknown): number | null => v === null || v === undefined || v === "" ? null : Math.round(Number(v))

export async function GET() {
  try {
    // Use raw SQL to get purchases with supplier + items + product
    const rs = await db.execute(`
      SELECT p.*, s.name as "supplier.name", s.id as "supplier.id",
             s.mobile as "supplier.mobile", s.address as "supplier.address"
      FROM Purchase p
      LEFT JOIN Supplier s ON p.supplierId = s.id
      ORDER BY p.createdAt DESC
    `)

    const purchases = rs.rows.map((r: Record<string, unknown>) => {
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
      const itemsRs = await db.execute(`
        SELECT pi.*, pr.name as "product.name", pr.id as "product.id"
        FROM PurchaseItem pi
        LEFT JOIN Product pr ON pi.productId = pr.id
        WHERE pi.purchaseId = ?
      `, [p.id])
      p.items = itemsRs.rows.map((r: Record<string, unknown>) => {
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

    return NextResponse.json(purchases)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const items = Array.isArray(body.items) ? body.items : []
    const totalPrice = toNum(body.totalPrice)
    const discount = toNum(body.discount)
    const grandTotal = totalPrice - discount
    const purchaseId = genId()
    const ts = now()

    // Insert Purchase
    await db.execute(
      'INSERT INTO Purchase (id, purchaseDate, supplierId, invoiceNo, totalPrice, discount, grandTotal, attachment, remarks, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        purchaseId,
        body.purchaseDate ? new Date(String(body.purchaseDate)).getTime() : ts,
        body.supplierId ? String(body.supplierId) : null,
        String(body.invoiceNo ?? "").trim(),
        totalPrice, discount, grandTotal,
        body.attachment ? String(body.attachment) : null,
        body.remarks ? String(body.remarks) : null,
        ts, ts
      ]
    )

    // Insert PurchaseItems + update inventory
    for (const it of items) {
      const itemId = genId()
      const qty = toNum(it.qty)
      await db.execute(
        'INSERT INTO PurchaseItem (id, purchaseId, productId, category, brand, model, serial, qty, price, total, condition, warrantyText, warrantyDate, warrantyDays, remarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          itemId, purchaseId,
          it.productId ? String(it.productId) : null,
          toStr(it.category), toStr(it.brand), toStr(it.model), toStr(it.serial),
          qty, toNum(it.price), toNum(it.total),
          toStr(it.condition), toStr(it.warrantyText),
          it.warrantyDate ? new Date(String(it.warrantyDate)).getTime() : null,
          it.warrantyDays ? toInt(it.warrantyDays) : null,
          toStr(it.remarks)
        ]
      )

      // Merge qty into inventory (upsert by productId)
      if (it.productId && qty > 0) {
        const pid = String(it.productId)
        // Get UOM
        let uomName: string | null = null
        const prodRs = await db.execute('SELECT u.name as uom FROM Product p LEFT JOIN Uom u ON p.uomId = u.id WHERE p.id = ?', [pid])
        if (prodRs.rows.length) uomName = (prodRs.rows[0] as Record<string, unknown>).uom as string | null

        // Check if inventory row exists
        const invRs = await db.execute('SELECT id, qty FROM InventoryStock WHERE productId = ? ORDER BY createdAt ASC LIMIT 1', [pid])
        if (invRs.rows.length) {
          const invRow = invRs.rows[0] as Record<string, unknown>
          const newQty = Number(invRow.qty) + qty
          await db.execute('UPDATE InventoryStock SET qty = ?, brand = ?, model = ?, serial = ?, uom = ?, date = ?, invoice = ? WHERE id = ?',
            [newQty, toStr(it.brand), toStr(it.model), toStr(it.serial), uomName,
             body.purchaseDate ? new Date(String(body.purchaseDate)).getTime() : ts,
             String(body.invoiceNo ?? ""), invRow.id])
        } else {
          const invId = genId()
          await db.execute(
            'INSERT INTO InventoryStock (id, date, invoice, purchaseId, productId, brand, model, serial, condition, warrantyText, qty, uom, remarks, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [invId,
             body.purchaseDate ? new Date(String(body.purchaseDate)).getTime() : ts,
             String(body.invoiceNo ?? ""), purchaseId, pid,
             toStr(it.brand), toStr(it.model), toStr(it.serial),
             toStr(it.condition), toStr(it.warrantyText),
             qty, uomName, toStr(it.remarks), ts, ts]
          )
        }
      }
    }

    return NextResponse.json({ id: purchaseId, invoiceNo: body.invoiceNo, success: true }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const { id, items: rawItems, ...rest } = body
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

    const items = Array.isArray(rawItems) ? rawItems : []
    const totalPrice = toNum(rest.totalPrice)
    const discount = toNum(rest.discount)
    const grandTotal = totalPrice - discount
    const ts = now()

    // Reverse old inventory contribution
    const oldItemsRs = await db.execute('SELECT productId, qty FROM PurchaseItem WHERE purchaseId = ?', [String(id)])
    for (const oldIt of oldItemsRs.rows) {
      const row = oldIt as Record<string, unknown>
      if (row.productId && Number(row.qty) > 0) {
        const invRs = await db.execute('SELECT id, qty FROM InventoryStock WHERE productId = ? ORDER BY createdAt ASC LIMIT 1', [row.productId])
        if (invRs.rows.length) {
          const invRow = invRs.rows[0] as Record<string, unknown>
          const newQty = Math.max(0, Number(invRow.qty) - Number(row.qty))
          await db.execute('UPDATE InventoryStock SET qty = ? WHERE id = ?', [newQty, invRow.id])
        }
      }
    }

    // Delete old items
    await db.execute('DELETE FROM PurchaseItem WHERE purchaseId = ?', [String(id)])

    // Update purchase
    await db.execute(
      'UPDATE Purchase SET purchaseDate = ?, supplierId = ?, invoiceNo = ?, totalPrice = ?, discount = ?, grandTotal = ?, attachment = ?, remarks = ?, updatedAt = ? WHERE id = ?',
      [
        rest.purchaseDate ? new Date(String(rest.purchaseDate)).getTime() : ts,
        rest.supplierId ? String(rest.supplierId) : null,
        String(rest.invoiceNo ?? ""),
        totalPrice, discount, grandTotal,
        rest.attachment ? String(rest.attachment) : null,
        rest.remarks ? String(rest.remarks) : null,
        ts, String(id)
      ]
    )

    // Insert new items + update inventory
    for (const it of items) {
      const itemId = genId()
      const qty = toNum(it.qty)
      await db.execute(
        'INSERT INTO PurchaseItem (id, purchaseId, productId, category, brand, model, serial, qty, price, total, condition, warrantyText, remarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          itemId, String(id),
          it.productId ? String(it.productId) : null,
          toStr(it.category), toStr(it.brand), toStr(it.model), toStr(it.serial),
          qty, toNum(it.price), toNum(it.total),
          toStr(it.condition), toStr(it.warrantyText), toStr(it.remarks)
        ]
      )

      if (it.productId && qty > 0) {
        const pid = String(it.productId)
        let uomName: string | null = null
        const prodRs = await db.execute('SELECT u.name as uom FROM Product p LEFT JOIN Uom u ON p.uomId = u.id WHERE p.id = ?', [pid])
        if (prodRs.rows.length) uomName = (prodRs.rows[0] as Record<string, unknown>).uom as string | null

        const invRs = await db.execute('SELECT id, qty FROM InventoryStock WHERE productId = ? ORDER BY createdAt ASC LIMIT 1', [pid])
        if (invRs.rows.length) {
          const invRow = invRs.rows[0] as Record<string, unknown>
          const newQty = Number(invRow.qty) + qty
          await db.execute('UPDATE InventoryStock SET qty = ?, brand = ?, model = ?, serial = ?, uom = ? WHERE id = ?',
            [newQty, toStr(it.brand), toStr(it.model), toStr(it.serial), uomName, invRow.id])
        } else {
          const invId = genId()
          await db.execute(
            'INSERT INTO InventoryStock (id, date, invoice, purchaseId, productId, brand, model, serial, qty, uom, remarks, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [invId, ts, String(rest.invoiceNo ?? ""), String(id), pid,
             toStr(it.brand), toStr(it.model), toStr(it.serial),
             qty, uomName, toStr(it.remarks), ts, ts]
          )
        }
      }
    }

    return NextResponse.json({ id: String(id), success: true })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

    // Reverse inventory contribution
    const itemsRs = await db.execute('SELECT productId, qty FROM PurchaseItem WHERE purchaseId = ?', [id])
    for (const it of itemsRs.rows) {
      const row = it as Record<string, unknown>
      if (row.productId && Number(row.qty) > 0) {
        const invRs = await db.execute('SELECT id, qty FROM InventoryStock WHERE productId = ? ORDER BY createdAt ASC LIMIT 1', [row.productId])
        if (invRs.rows.length) {
          const invRow = invRs.rows[0] as Record<string, unknown>
          const newQty = Math.max(0, Number(invRow.qty) - Number(row.qty))
          await db.execute('UPDATE InventoryStock SET qty = ? WHERE id = ?', [newQty, invRow.id])
        }
      }
    }

    await db.execute('DELETE FROM PurchaseItem WHERE purchaseId = ?', [id])
    await db.execute('DELETE FROM Purchase WHERE id = ?', [id])
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
