import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const items = await db.appUser.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        mobile: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
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
    const created = await db.appUser.create({
      data: {
        name: String(body.name ?? "").trim(),
        email: String(body.email ?? "").trim(),
        mobile: body.mobile ? String(body.mobile) : null,
        role: String(body.role ?? "Staff"),
        status: String(body.status ?? "Active"),
        password: String(body.password ?? "password"),
      },
      select: {
        id: true,
        name: true,
        email: true,
        mobile: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
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

    const data: Record<string, unknown> = {}
    if (rest.name !== undefined) data.name = String(rest.name).trim()
    if (rest.email !== undefined) data.email = String(rest.email).trim()
    if (rest.mobile !== undefined)
      data.mobile = rest.mobile ? String(rest.mobile) : null
    if (rest.role !== undefined) data.role = String(rest.role)
    if (rest.status !== undefined) data.status = String(rest.status)
    if (rest.password !== undefined && String(rest.password) !== "")
      data.password = String(rest.password)

    const updated = await db.appUser.update({
      where: { id: String(id) },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        mobile: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
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
    await db.appUser.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
