import { NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { existsSync } from "fs"

/**
 * POST /api/upload
 * Accepts a single file upload via multipart/form-data (field name: "file").
 * Saves the file under /public/uploads/<bucket>/<timestamp>_<filename> and
 * returns { url, name, size, type } on success.
 *
 * Query param `bucket` (optional, default "purchases") selects the upload
 * subfolder — e.g. /api/upload?bucket=logos saves to /public/uploads/logos/.
 *
 * Used by the FileUpload component (Purchases attachments) and the LogoAttach
 * button in Company Profile.
 */

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
      return NextResponse.json({ error: "No file provided (expected field 'file')" }, { status: 400 })
    }
    if (file.size === 0) {
      return NextResponse.json({ error: "File is empty" }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 413 })
    }

    const uploadRoot = path.join(process.cwd(), "public", "uploads", bucket)
    if (!existsSync(uploadRoot)) {
      await mkdir(uploadRoot, { recursive: true })
    }

    const safeName = String(file.name).replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 200)
    const timestamp = Date.now()
    const filename = `${timestamp}_${safeName}`
    const filePath = path.join(uploadRoot, filename)

    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filePath, buffer)

    const publicUrl = `/uploads/${bucket}/${filename}`
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

// Reject GET so it doesn't get auto-routed as a server action
export async function GET() {
  return NextResponse.json({ error: "Method Not Allowed — use POST" }, { status: 405 })
}
