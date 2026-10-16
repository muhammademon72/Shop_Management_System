export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB (data URLs are larger than raw files)
const ALLOWED_BUCKETS = new Set(["purchases", "logos", "company", "misc"])

export async function POST(req: Request) {
  try {
    const url = new URL(req.url)
    const bucketRaw = (url.searchParams.get("bucket") || "purchases").toLowerCase()
    const bucket = ALLOWED_BUCKETS.has(bucketRaw) ? bucketRaw : "purchases"

    const formData = await req.formData()
    const file = formData.get("file")
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }
    if (file.size === 0) {
      return NextResponse.json({ error: "File is empty" }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large (max 5MB for data URL storage)" }, { status: 413 })
    }

    // Convert file to base64 data URL — this works on Vercel because the data
    // is stored as a string in the database, not as a file on the filesystem.
    const buffer = Buffer.from(await file.arrayBuffer())
    const base64 = buffer.toString("base64")
    const mimeType = file.type || "application/octet-stream"
    const dataUrl = `data:${mimeType};base64,${base64}`

    return NextResponse.json({
      url: dataUrl,
      name: file.name,
      size: file.size,
      type: file.type,
    })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ error: "Use POST to upload files" }, { status: 405 })
}
