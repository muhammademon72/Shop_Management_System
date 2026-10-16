export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"

function genId(): string {
  return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}
function now(): number { return Date.now() }
const toStr = (v: unknown): string | null => v === null || v === undefined || v === "" ? null : typeof v === "object" ? JSON.stringify(v) : String(v)
const toNum = (v: unknown): number => typeof v === "number" ? v : Number(v ?? 0) || 0

export async function GET() {
  try {
    const rs = await db.execute(`
      SELECT q.*, c.name as "customer.name", c.id as "customer.id"
      FROM Quotation q
      LEFT JOIN Customer c ON q.customerId = c.id
      ORDER BY q.createdAt DESC
    `)
    const quotations = rs.rows.map((r: Record<string, unknown>) => {
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
      const itemsRs = await db.execute(`
        SELECT qi.*, p.name as "product.name", p.id as "product.id"
        FROM QuotationItem qi
        LEFT JOIN Product p ON qi.productId = p.id
        WHERE qi.quotationId = ?
      `, [q.id])
      q.items = itemsRs.rows.map((r: Record<string, unknown>) => {
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
    return NextResponse.json(quotations)
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
    const qId = genId()
    const ts = now()

    await db.execute(
      'INSERT INTO Quotation (id, quotationDate, customerId, invoiceNo, totalPrice, discount, grandTotal, remarks, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [qId,
       body.quotationDate ? new Date(String(body.quotationDate)).getTime() : ts,
       body.customerId ? String(body.customerId) : null,
       String(body.invoiceNo ?? "").trim(),
       totalPrice, discount, grandTotal,
       body.remarks ? String(body.remarks) : null, ts, ts]
    )

    for (const it of items) {
      const itemId = genId()
      await db.execute(
        'INSERT INTO QuotationItem (id, quotationId, productId, brand, model, serial, condition, warrantyText, qty, price, total, remarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [itemId, qId,
         it.productId ? String(it.productId) : null,
         toStr(it.brand), toStr(it.model), toStr(it.serial), toStr(it.condition), toStr(it.warrantyText),
         toNum(it.qty), toNum(it.price), toNum(it.total), toStr(it.remarks)]
      )
    }

    return NextResponse.json({ id: qId, invoiceNo: body.invoiceNo, success: true }, { status: 201 })
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

    await db.execute('DELETE FROM QuotationItem WHERE quotationId = ?', [String(id)])
    await db.execute(
      'UPDATE Quotation SET quotationDate = ?, customerId = ?, invoiceNo = ?, totalPrice = ?, discount = ?, grandTotal = ?, remarks = ?, updatedAt = ? WHERE id = ?',
      [rest.quotationDate ? new Date(String(rest.quotationDate)).getTime() : ts,
       rest.customerId ? String(rest.customerId) : null,
       String(rest.invoiceNo ?? ""),
       totalPrice, discount, grandTotal,
       rest.remarks ? String(rest.remarks) : null, ts, String(id)]
    )

    for (const it of items) {
      const itemId = genId()
      await db.execute(
        'INSERT INTO QuotationItem (id, quotationId, productId, brand, model, serial, condition, warrantyText, qty, price, total, remarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [itemId, String(id),
         it.productId ? String(it.productId) : null,
         toStr(it.brand), toStr(it.model), toStr(it.serial), toStr(it.condition), toStr(it.warrantyText),
         toNum(it.qty), toNum(it.price), toNum(it.total), toStr(it.remarks)]
      )
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
    await db.execute('DELETE FROM QuotationItem WHERE quotationId = ?', [id])
    await db.execute('DELETE FROM Quotation WHERE id = ?', [id])
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
