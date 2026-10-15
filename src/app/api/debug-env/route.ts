import { NextResponse } from "next/server"
export const dynamic = "force-dynamic"


export async function GET() {
  return NextResponse.json({
    DATABASE_URL: process.env.DATABASE_URL ? process.env.DATABASE_URL.slice(0, 40) + "..." : "NOT SET",
    TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN ? "(set, " + process.env.TURSO_AUTH_TOKEN.length + " chars)" : "NOT SET",
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL,
    VERCEL_ENV: process.env.VERCEL_ENV,
  })
}
