export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"

function genId(): string {
  return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}
function now(): number { return Date.now() }
const toStr = (v: unknown): string | null => v === null || v === undefined || v === "" ? null : typeof v === "object" ? JSON.stringify(v) : String(v)
const toNum = (v: unknown): number => typeof v === "number" ? v : Number(v ?? 0) || 0

// Decrement inventory (FIFO by productId, single row merge)
async function decrementInventory(productId: string, qty: number) {
  const rs = await db.execute('SELECT id, qty FROM InventoryStock WHERE productId = ? ORDER BY createdAt ASC LIMIT 1', [productId])
  if (rs.rows.length) {
    const row = rs.rows[0] as Record<string, unknown>
    const newQty = Math.max(0, Number(row.qty) - qty)
    await db.execute('UPDATE InventoryStock SET qty = ? WHERE id = ?', [newQty, row.id])
  }
}

// Restore inventory (merge back into existing row)
async function restoreInventory(productId: string, qty: number, brand: string | null, model: string | null, serial: string | null, invoice: string, date: number) {
  const rs = await db.execute('SELECT id, qty FROM InventoryStock WHERE productId = ? ORDER BY createdAt ASC LIMIT 1', [productId])
  if (rs.rows.length) {
    const row = rs.rows[0] as Record<string, unknown>
    await db.execute('UPDATE InventoryStock SET qty = ? WHERE id = ?', [Number(row.qty) + qty, row.id])
  } else {
    const id = genId()
    await db.execute(
      'INSERT INTO InventoryStock (id, date, invoice, productId, brand, model, serial, qty, uom, remarks, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, date, invoice, productId, brand, model, serial, qty, null, 'Restored from Sell', now(), now()]
    )
  }
}

export async function GET() {
  try {
    const rs = await db.execute(`
      SELECT s.*, c.name as "customer.name", c.id as "customer.id",
             c.mobile as "customer.mobile", c.address as "customer.address"
      FROM Sell s
      LEFT JOIN Customer c ON s.customerId = c.id
      ORDER BY s.createdAt DESC
    `)
    const sells = rs.rows.map((r: Record<string, unknown>) => {
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
      const itemsRs = await db.execute(`
        SELECT si.*, p.name as "product.name", p.id as "product.id"
        FROM SellItem si
        LEFT JOIN Product p ON si.productId = p.id
        WHERE si.sellId = ?
      `, [s.id])
      s.items = itemsRs.rows.map((r: Record<string, unknown>) => {
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
    return NextResponse.json(sells)
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
    const paidAmount = toNum(body.paidAmount)
    const dueAmount = Math.max(0, grandTotal - paidAmount)
    const sellId = genId()
    const ts = now()

    await db.execute(
      'INSERT INTO Sell (id, sellDate, customerId, invoiceNo, totalPrice, discount, grandTotal, paidAmount, dueAmount, remarks, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [sellId,
       body.sellDate ? new Date(String(body.sellDate)).getTime() : ts,
       body.customerId ? String(body.customerId) : null,
       String(body.invoiceNo ?? "").trim(),
       totalPrice, discount, grandTotal, paidAmount, dueAmount,
       body.remarks ? String(body.remarks) : null, ts, ts]
    )

    for (const it of items) {
      const itemId = genId()
      const qty = toNum(it.qty)
      await db.execute(
        'INSERT INTO SellItem (id, sellId, productId, brand, model, serial, condition, warrantyText, qty, price, total, remarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [itemId, sellId,
         it.productId ? String(it.productId) : null,
         toStr(it.brand), toStr(it.model), toStr(it.serial), toStr(it.condition), toStr(it.warrantyText),
         qty, toNum(it.price), toNum(it.total), toStr(it.remarks)]
      )
      // Decrement inventory
      const pid = it.productId ? String(it.productId) : null
      if (pid && qty > 0) await decrementInventory(pid, qty)
    }

    return NextResponse.json({ id: sellId, invoiceNo: body.invoiceNo, success: true }, { status: 201 })
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
    const paidAmount = toNum(rest.paidAmount)
    const dueAmount = Math.max(0, grandTotal - paidAmount)
    const ts = now()

    // Restore old items to inventory
    const oldItemsRs = await db.execute('SELECT productId, qty, brand, model, serial FROM SellItem WHERE sellId = ?', [String(id)])
    for (const oldIt of oldItemsRs.rows) {
      const row = oldIt as Record<string, unknown>
      const pid = row.productId ? String(row.productId) : null
      const qty = Number(row.qty) || 0
      if (pid && qty > 0) {
        await restoreInventory(pid, qty, toStr(row.brand), toStr(row.model), toStr(row.serial),
          String(rest.invoiceNo ?? ""), ts)
      }
    }

    // Delete old items
    await db.execute('DELETE FROM SellItem WHERE sellId = ?', [String(id)])

    // Update sell
    await db.execute(
      'UPDATE Sell SET sellDate = ?, customerId = ?, invoiceNo = ?, totalPrice = ?, discount = ?, grandTotal = ?, paidAmount = ?, dueAmount = ?, remarks = ?, updatedAt = ? WHERE id = ?',
      [rest.sellDate ? new Date(String(rest.sellDate)).getTime() : ts,
       rest.customerId ? String(rest.customerId) : null,
       String(rest.invoiceNo ?? ""),
       totalPrice, discount, grandTotal, paidAmount, dueAmount,
       rest.remarks ? String(rest.remarks) : null, ts, String(id)]
    )

    // Insert new items + decrement inventory
    for (const it of items) {
      const itemId = genId()
      const qty = toNum(it.qty)
      await db.execute(
        'INSERT INTO SellItem (id, sellId, productId, brand, model, serial, condition, warrantyText, qty, price, total, remarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [itemId, String(id),
         it.productId ? String(it.productId) : null,
         toStr(it.brand), toStr(it.model), toStr(it.serial), toStr(it.condition), toStr(it.warrantyText),
         qty, toNum(it.price), toNum(it.total), toStr(it.remarks)]
      )
      const pid = it.productId ? String(it.productId) : null
      if (pid && qty > 0) await decrementInventory(pid, qty)
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
    const ts = now()

    // Restore inventory for each item
    const itemsRs = await db.execute('SELECT productId, qty, brand, model, serial FROM SellItem WHERE sellId = ?', [id])
    for (const it of itemsRs.rows) {
      const row = it as Record<string, unknown>
      const pid = row.productId ? String(row.productId) : null
      const qty = Number(row.qty) || 0
      if (pid && qty > 0) {
        await restoreInventory(pid, qty, toStr(row.brand), toStr(row.model), toStr(row.serial),
          '', ts)
      }
    }

    // Delete items + sell
    await db.execute('DELETE FROM SellItem WHERE sellId = ?', [id])
    await db.execute('DELETE FROM Sell WHERE id = ?', [id])

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
