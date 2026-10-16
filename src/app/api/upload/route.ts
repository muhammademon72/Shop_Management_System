export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { existsSync } from "fs"
import os from "os"

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB
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
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 413 })
    }

    const safeName = String(file.name).replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 200)
    const timestamp = Date.now()
    const filename = `${timestamp}_${safeName}`

    // On Vercel, the filesystem is read-only except for /tmp.
    // Save to /tmp/uploads/<bucket>/ for the current request lifetime.
    // For local dev, save to public/uploads/ which is persistent.
    const isVercel = !!process.env.VERCEL
    let filePath: string
    let publicUrl: string

    if (isVercel) {
      // Vercel: save to /tmp (ephemeral, but works for the session)
      const tmpDir = path.join(os.tmpdir(), "uploads", bucket)
      if (!existsSync(tmpDir)) {
        await mkdir(tmpDir, { recursive: true })
      }
      filePath = path.join(tmpDir, filename)
      publicUrl = `/api/file/${bucket}/${filename}` // serve via a file API
    } else {
      // Local: save to public/uploads/ (persistent)
      const uploadRoot = path.join(process.cwd(), "public", "uploads", bucket)
      if (!existsSync(uploadRoot)) {
        await mkdir(uploadRoot, { recursive: true })
      }
      filePath = path.join(uploadRoot, filename)
      publicUrl = `/uploads/${bucket}/${filename}`
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filePath, buffer)

    return NextResponse.json({
      url: publicUrl,
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
