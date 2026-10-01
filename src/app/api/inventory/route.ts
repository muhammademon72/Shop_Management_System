import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const items = await db.inventoryStock.findMany({
      orderBy: { createdAt: "desc" },
      include: { product: { include: { uom: true } } },
    })
    return NextResponse.json(items)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const created = await db.inventoryStock.create({
      data: {
        date: body.date ? new Date(body.date) : new Date(),
        invoice: String(body.invoice ?? "").trim(),
        productId: body.productId ? String(body.productId) : null,
        brand: body.brand ? String(body.brand) : null,
        model: body.model ? String(body.model) : null,
        serial: body.serial ? String(body.serial) : null,
        qty: Number(body.qty ?? 0),
        uom: body.uom ? String(body.uom) : null,
        remarks: body.remarks ? String(body.remarks) : null,
      },
      include: { product: { include: { uom: true } } },
    })
    return NextResponse.json(created, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const { id, ...rest } = body
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
    const updated = await db.inventoryStock.update({
      where: { id: String(id) },
      data: {
        ...(rest.date !== undefined && { date: new Date(rest.date) }),
        ...(rest.invoice !== undefined && { invoice: String(rest.invoice) }),
        ...(rest.productId !== undefined && {
          productId: rest.productId ? String(rest.productId) : null,
        }),
        ...(rest.brand !== undefined && {
          brand: rest.brand ? String(rest.brand) : null,
        }),
        ...(rest.model !== undefined && {
          model: rest.model ? String(rest.model) : null,
        }),
        ...(rest.serial !== undefined && {
          serial: rest.serial ? String(rest.serial) : null,
        }),
        ...(rest.qty !== undefined && { qty: Number(rest.qty) }),
        ...(rest.uom !== undefined && {
          uom: rest.uom ? String(rest.uom) : null,
        }),
        ...(rest.remarks !== undefined && {
          remarks: rest.remarks ? String(rest.remarks) : null,
        }),
      },
      include: { product: { include: { uom: true } } },
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
    await db.inventoryStock.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
