import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const items = await db.purchase.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        supplier: true,
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

    const created = await db.$transaction(async (tx) => {
      const purchase = await tx.purchase.create({
        data: {
          purchaseDate: body.purchaseDate
            ? new Date(body.purchaseDate)
            : new Date(),
          supplierId: body.supplierId ? String(body.supplierId) : null,
          invoiceNo: String(body.invoiceNo ?? "").trim(),
          totalPrice,
          discount,
          grandTotal,
          attachment: body.attachment ? String(body.attachment) : null,
          remarks: body.remarks ? String(body.remarks) : null,
          items: {
            create: items.map((it: Record<string, unknown>) => ({
              productId: it.productId ? String(it.productId) : null,
              category: it.category ? String(it.category) : null,
              brand: it.brand ? String(it.brand) : null,
              model: it.model ? String(it.model) : null,
              serial: it.serial ? String(it.serial) : null,
              qty: Number(it.qty ?? 0),
              price: Number(it.price ?? 0),
              total: Number(it.total ?? 0),
              condition: it.condition ? String(it.condition) : null,
              warrantyText: it.warrantyText ? String(it.warrantyText) : null,
              warrantyDate: it.warrantyDate
                ? new Date(String(it.warrantyDate))
                : null,
              warrantyDays: it.warrantyDays
                ? Number(it.warrantyDays)
                : null,
              remarks: it.remarks ? String(it.remarks) : null,
            })),
          },
        },
        include: {
          supplier: true,
          items: { include: { product: true } },
        },
      })

      // Auto-populate inventory stock rows from purchase items
      for (const it of items) {
        if (!it.productId) continue
        await tx.inventoryStock.create({
          data: {
            date: purchase.purchaseDate,
            invoice: purchase.invoiceNo,
            productId: String(it.productId),
            brand: it.brand ? String(it.brand) : null,
            model: it.model ? String(it.model) : null,
            serial: it.serial ? String(it.serial) : null,
            qty: Number(it.qty ?? 0),
            uom: null,
            remarks: `From purchase ${purchase.invoiceNo}`,
          },
        })
      }

      return purchase
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
    const items = Array.isArray(rawItems) ? rawItems : []

    const updated = await db.$transaction(async (tx) => {
      // Delete existing items
      await tx.purchaseItem.deleteMany({ where: { purchaseId: String(id) } })

      const purchase = await tx.purchase.update({
        where: { id: String(id) },
        data: {
          ...(rest.purchaseDate !== undefined && {
            purchaseDate: new Date(rest.purchaseDate),
          }),
          ...(rest.supplierId !== undefined && {
            supplierId: rest.supplierId ? String(rest.supplierId) : null,
          }),
          ...(rest.invoiceNo !== undefined && {
            invoiceNo: String(rest.invoiceNo),
          }),
          totalPrice,
          discount,
          grandTotal,
          ...(rest.attachment !== undefined && {
            attachment: rest.attachment ? String(rest.attachment) : null,
          }),
          ...(rest.remarks !== undefined && {
            remarks: rest.remarks ? String(rest.remarks) : null,
          }),
          items: {
            create: items.map((it: Record<string, unknown>) => ({
              productId: it.productId ? String(it.productId) : null,
              category: it.category ? String(it.category) : null,
              brand: it.brand ? String(it.brand) : null,
              model: it.model ? String(it.model) : null,
              serial: it.serial ? String(it.serial) : null,
              qty: Number(it.qty ?? 0),
              price: Number(it.price ?? 0),
              total: Number(it.total ?? 0),
              condition: it.condition ? String(it.condition) : null,
              warrantyText: it.warrantyText ? String(it.warrantyText) : null,
              warrantyDate: it.warrantyDate
                ? new Date(String(it.warrantyDate))
                : null,
              warrantyDays: it.warrantyDays
                ? Number(it.warrantyDays)
                : null,
              remarks: it.remarks ? String(it.remarks) : null,
            })),
          },
        },
        include: { supplier: true, items: { include: { product: true } } },
      })
      return purchase
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
    await db.purchase.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
