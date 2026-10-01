import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const items = await db.product.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        category: true,
        brand: true,
        uom: true,
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
    const created = await db.product.create({
      data: {
        name: String(body.name ?? "").trim(),
        categoryId: body.categoryId ? String(body.categoryId) : null,
        brandId: body.brandId ? String(body.brandId) : null,
        uomId: body.uomId ? String(body.uomId) : null,
        model: body.model ? String(body.model) : null,
        serial: body.serial ? String(body.serial) : null,
        status: String(body.status ?? "Active"),
      },
      include: { category: true, brand: true, uom: true },
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
    const updated = await db.product.update({
      where: { id: String(id) },
      data: {
        ...(rest.name !== undefined && { name: String(rest.name).trim() }),
        ...(rest.categoryId !== undefined && {
          categoryId: rest.categoryId ? String(rest.categoryId) : null,
        }),
        ...(rest.brandId !== undefined && {
          brandId: rest.brandId ? String(rest.brandId) : null,
        }),
        ...(rest.uomId !== undefined && {
          uomId: rest.uomId ? String(rest.uomId) : null,
        }),
        ...(rest.model !== undefined && {
          model: rest.model ? String(rest.model) : null,
        }),
        ...(rest.serial !== undefined && {
          serial: rest.serial ? String(rest.serial) : null,
        }),
        ...(rest.status !== undefined && { status: String(rest.status) }),
      },
      include: { category: true, brand: true, uom: true },
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
    await db.product.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
