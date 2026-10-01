import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const items = await db.category.findMany({
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(items)
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const created = await db.category.create({
      data: {
        name: String(body.name ?? "").trim(),
        type: String(body.type ?? "Goods"),
        status: String(body.status ?? "Active"),
      },
    })
    return NextResponse.json(created, { status: 201 })
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    )
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const { id, ...rest } = body
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
    const updated = await db.category.update({
      where: { id: String(id) },
      data: {
        ...(rest.name !== undefined && { name: String(rest.name).trim() }),
        ...(rest.type !== undefined && { type: String(rest.type) }),
        ...(rest.status !== undefined && { status: String(rest.status) }),
      },
    })
    return NextResponse.json(updated)
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    )
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
    await db.category.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    )
  }
}
