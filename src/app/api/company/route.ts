import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const items = await db.companyProfile.findMany({
      orderBy: { createdAt: "asc" },
    })
    return NextResponse.json(items[0] ?? null)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const { id, ...rest } = body

    const data = {
      name: String(rest.name ?? "").trim(),
      address: rest.address ? String(rest.address) : null,
      phone: rest.phone ? String(rest.phone) : null,
      email: rest.email ? String(rest.email) : null,
      website: rest.website ? String(rest.website) : null,
      vatNo: rest.vatNo ? String(rest.vatNo) : null,
      logo: rest.logo ? String(rest.logo) : null,
    }

    if (id) {
      const updated = await db.companyProfile.update({
        where: { id: String(id) },
        data,
      })
      return NextResponse.json(updated)
    }

    // No id — find existing first
    const existing = await db.companyProfile.findFirst()
    if (existing) {
      const updated = await db.companyProfile.update({
        where: { id: existing.id },
        data,
      })
      return NextResponse.json(updated)
    }

    const created = await db.companyProfile.create({ data })
    return NextResponse.json(created, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
