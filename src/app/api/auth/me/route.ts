export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ user: null }, { status: 200 })
    }

    const token = authHeader.replace("Bearer ", "")
    try {
      const decoded = JSON.parse(Buffer.from(token, "base64").toString("utf-8"))
      const user = await db.appUser.findFirst({ where: { id: decoded.id } })
      if (!user) return NextResponse.json({ user: null }, { status: 200 })

      const { password, ...safeUser } = user
      return NextResponse.json({ user: safeUser }, { status: 200 })
    } catch {
      return NextResponse.json({ user: null }, { status: 200 })
    }
  } catch (e) {
    return NextResponse.json({ user: null }, { status: 200 })
  }
}
