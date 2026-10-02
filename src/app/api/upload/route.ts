import { NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { existsSync } from "fs"
import path from "path"

const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/bmp": ".bmp",
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "text/csv": ".csv",
  "text/plain": ".txt",
}

const MAX_BYTES = 10 * 1024 * 1024
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "purchases")

function sanitizeFilename(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_+|_+$/g, "")
  return base || "file"
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get("file")
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 })
    }

    const ext = ALLOWED_MIME[file.type]
    if (!ext) {
      return NextResponse.json(
        { error: `File type '${file.type || "unknown"}' is not allowed.` },
        { status: 415 }
      )
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large. Max 10MB." }, { status: 413 })
    }

    const timestamp = Date.now()
    const safeName = sanitizeFilename(file.name.replace(/\.[^.]+$/, ""))
    const fileName = `${timestamp}_${safeName}${ext}`

    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true })
    }

    const filePath = path.join(UPLOAD_DIR, fileName)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    const url = `/uploads/purchases/${fileName}`

    return NextResponse.json({ url, name: file.name, size: file.size, type: file.type }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message || "Upload failed" }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, maxSize: "10MB", allowedTypes: Object.keys(ALLOWED_MIME) })
}
