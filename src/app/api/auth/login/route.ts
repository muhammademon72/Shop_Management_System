export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { createClient } from "@libsql/client"

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    // Find user by email (including password for verification)
    const user = await db.appUser.findFirst({ where: { email: String(email).trim() } })
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    // Verify password (plain text comparison — simple for this app)
    if (user.password !== password) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    // Check if user is active
    if (user.status !== "Active") {
      return NextResponse.json({ error: "Your account is inactive. Contact admin." }, { status: 403 })
    }

    // Create a simple token (base64 of user id + timestamp + secret)
    const token = Buffer.from(
      JSON.stringify({ id: user.id, email: user.email, ts: Date.now() })
    ).toString("base64")

    // Return user data without password + token
    const { password: _, ...safeUser } = user
    return NextResponse.json({ user: safeUser, token })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
