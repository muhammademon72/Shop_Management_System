import { NextResponse } from "next/server"
import { db } from "@/lib/db"

/**
 * Decrement inventory stock for a single SellItem's product. Pulls from the
 * earliest inventory rows first (FIFO) so older stock is consumed first.
 * Rows that hit qty 0 are deleted so the inventory list stays clean.
 *
 * Returns true on success or false if there wasn't enough stock (caller may
 * choose to ignore — sell record is still created; we don't block the sell
 * on partial stock because the user might be selling pre-booked items).
 */
async function decrementInventory(
  tx: Parameters<Parameters<typeof db.$transaction>[0]>[0],
  productId: string | null,
  qtyToDecrement: number,
): Promise<void> {
  if (!productId || qtyToDecrement <= 0) return
  let remaining = qtyToDecrement
  // Order by createdAt asc → oldest first (FIFO).
  const rows = await tx.inventoryStock.findMany({
    where: { productId, qty: { gt: 0 } },
    orderBy: { createdAt: "asc" },
  })
  for (const row of rows) {
    if (remaining <= 0) break
    const take = Math.min(row.qty, remaining)
    const newQty = row.qty - take
    remaining -= take
    if (newQty <= 0) {
      await tx.inventoryStock.delete({ where: { id: row.id } })
    } else {
      await tx.inventoryStock.update({
        where: { id: row.id },
        data: { qty: newQty },
      })
    }
  }
  // If `remaining > 0` here, we ran out of stock — silently ignore (see note above).
}

/**
 * Restore inventory stock for a single SellItem's product (used when a Sell
 * is edited or deleted — we put the units back so the stock is correct).
 * Adds a new InventoryStock row with the item's brand/model/serial so the
 * restoration is auditable.
 */
async function restoreInventory(
  tx: Parameters<Parameters<typeof db.$transaction>[0]>[0],
  productId: string | null,
  qtyToRestore: number,
  brand: string | null,
  model: string | null,
  serial: string | null,
  uomName: string | null,
  invoice: string,
  date: Date,
): Promise<void> {
  if (!productId || qtyToRestore <= 0) return
  await tx.inventoryStock.create({
    data: {
      date,
      invoice,
      productId,
      brand,
      model,
      serial,
      qty: qtyToRestore,
      uom: uomName,
      remarks: "Restored from Sell (edit/delete)",
    },
  })
}

export async function GET() {
  try {
    const items = await db.sell.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        customer: true,
        items: { include: { product: true } },
      },
    })
    return NextResponse.json(items)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const items = Array.isArray(body.items) ? body.items : []
    const totalPrice = Number(body.totalPrice ?? 0)
    const discount = Number(body.discount ?? 0)
    const grandTotal = totalPrice - discount
    const paidAmount = Number(body.paidAmount ?? 0)
    const dueAmount = Math.max(0, grandTotal - paidAmount)

    const created = await db.$transaction(async (tx) => {
      const sell = await tx.sell.create({
        data: {
          sellDate: body.sellDate ? new Date(body.sellDate) : new Date(),
          customerId: body.customerId ? String(body.customerId) : null,
          invoiceNo: String(body.invoiceNo ?? "").trim(),
          totalPrice,
          discount,
          grandTotal,
          paidAmount,
          dueAmount,
          remarks: body.remarks ? String(body.remarks) : null,
          items: {
            create: items.map((it: Record<string, unknown>) => ({
              productId: it.productId ? String(it.productId) : null,
              brand: it.brand ? String(it.brand) : null,
              model: it.model ? String(it.model) : null,
              serial: it.serial ? String(it.serial) : null,
              condition: it.condition ? String(it.condition) : null,
              qty: Number(it.qty ?? 0),
              price: Number(it.price ?? 0),
              total: Number(it.total ?? 0),
              remarks: it.remarks ? String(it.remarks) : null,
            })),
          },
        },
        include: { customer: true, items: { include: { product: true } } },
      })

      // Decrement inventory stock for each sell line item (FIFO).
      // Inventory is reduced ONLY for items that have a productId linked —
      // free-text items (productId null) don't have an inventory trail.
      for (const it of items) {
        const pid = it.productId ? String(it.productId) : null
        const qty = Number(it.qty ?? 0)
        if (!pid || qty <= 0) continue
        await decrementInventory(tx, pid, qty)
      }

      return sell
    })

    return NextResponse.json(created, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const { id, items: rawItems, ...rest } = body
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

    const totalPrice = Number(rest.totalPrice ?? 0)
    const discount = Number(rest.discount ?? 0)
    const grandTotal = totalPrice - discount
    const paidAmount = Number(rest.paidAmount ?? 0)
    const dueAmount = Math.max(0, grandTotal - paidAmount)
    const items = Array.isArray(rawItems) ? rawItems : []

    const updated = await db.$transaction(async (tx) => {
      // Capture the OLD sell's items so we can restore their inventory qty
      // before applying the new line items.
      const oldSell = await tx.sell.findUnique({
        where: { id: String(id) },
        include: { items: true },
      })
      if (oldSell) {
        for (const oldIt of oldSell.items) {
          if (!oldIt.productId || (oldIt.qty ?? 0) <= 0) continue
          let uomName: string | null = null
          if (oldIt.productId) {
            const prod = await tx.product.findUnique({
              where: { id: oldIt.productId },
              include: { uom: true },
            })
            uomName = prod?.uom?.name ?? null
          }
          await restoreInventory(
            tx,
            oldIt.productId,
            oldIt.qty,
            oldIt.brand,
            oldIt.model,
            oldIt.serial,
            uomName,
            oldSell.invoiceNo,
            oldSell.sellDate,
          )
        }
      }

      // Delete existing items (we'll re-create them with the new payload).
      await tx.sellItem.deleteMany({ where: { sellId: String(id) } })

      const sell = await tx.sell.update({
        where: { id: String(id) },
        data: {
          ...(rest.sellDate !== undefined && {
            sellDate: new Date(rest.sellDate),
          }),
          ...(rest.customerId !== undefined && {
            customerId: rest.customerId ? String(rest.customerId) : null,
          }),
          ...(rest.invoiceNo !== undefined && {
            invoiceNo: String(rest.invoiceNo),
          }),
          totalPrice,
          discount,
          grandTotal,
          paidAmount,
          dueAmount,
          ...(rest.remarks !== undefined && {
            remarks: rest.remarks ? String(rest.remarks) : null,
          }),
          items: {
            create: items.map((it: Record<string, unknown>) => ({
              productId: it.productId ? String(it.productId) : null,
              brand: it.brand ? String(it.brand) : null,
              model: it.model ? String(it.model) : null,
              serial: it.serial ? String(it.serial) : null,
              condition: it.condition ? String(it.condition) : null,
              qty: Number(it.qty ?? 0),
              price: Number(it.price ?? 0),
              total: Number(it.total ?? 0),
              remarks: it.remarks ? String(it.remarks) : null,
            })),
          },
        },
        include: { customer: true, items: { include: { product: true } } },
      })

      // Decrement inventory stock for the new line items.
      for (const it of items) {
        const pid = it.productId ? String(it.productId) : null
        const qty = Number(it.qty ?? 0)
        if (!pid || qty <= 0) continue
        await decrementInventory(tx, pid, qty)
      }

      return sell
    })

    return NextResponse.json(updated)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

    await db.$transaction(async (tx) => {
      // Restore inventory for every line item before deleting the sell.
      const sell = await tx.sell.findUnique({
        where: { id },
        include: { items: true },
      })
      if (sell) {
        for (const it of sell.items) {
          if (!it.productId || (it.qty ?? 0) <= 0) continue
          let uomName: string | null = null
          if (it.productId) {
            const prod = await tx.product.findUnique({
              where: { id: it.productId },
              include: { uom: true },
            })
            uomName = prod?.uom?.name ?? null
          }
          await restoreInventory(
            tx,
            it.productId,
            it.qty,
            it.brand,
            it.model,
            it.serial,
            uomName,
            sell.invoiceNo,
            sell.sellDate,
          )
        }
      }
      await tx.sell.delete({ where: { id } })
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
