import { NextResponse } from "next/server"
import { db } from "@/lib/db"

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

    const created = await db.sell.create({
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
            qty: Number(it.qty ?? 0),
            price: Number(it.price ?? 0),
            total: Number(it.total ?? 0),
            remarks: it.remarks ? String(it.remarks) : null,
          })),
        },
      },
      include: { customer: true, items: { include: { product: true } } },
    })

    // TODO: optionally decrement inventory when a Sell is saved

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
      await tx.sellItem.deleteMany({ where: { sellId: String(id) } })

      return tx.sell.update({
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
              qty: Number(it.qty ?? 0),
              price: Number(it.price ?? 0),
              total: Number(it.total ?? 0),
              remarks: it.remarks ? String(it.remarks) : null,
            })),
          },
        },
        include: { customer: true, items: { include: { product: true } } },
      })
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
    await db.sell.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
