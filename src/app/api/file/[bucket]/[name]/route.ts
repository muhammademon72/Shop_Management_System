export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { readFile } from "fs/promises"
import path from "path"
import os from "os"

export async function GET(
  req: Request,
  { params }: { params: { bucket: string; name: string } }
) {
  try {
    const { bucket, name } = params
    // Prevent path traversal
    const safeBucket = bucket.replace(/[^a-zA-Z0-9-]/g, "")
    const safeName = name.replace(/[^a-zA-Z0-9._-]/g, "")
    const filePath = path.join(os.tmpdir(), "uploads", safeBucket, safeName)

    const buffer = await readFile(filePath)
    // Guess content type from extension
    const ext = safeName.split(".").pop()?.toLowerCase() ?? ""
    const contentType =
      ext === "pdf" ? "application/pdf" :
      ext === "jpg" || ext === "jpeg" ? "image/jpeg" :
      ext === "png" ? "image/png" :
      ext === "gif" ? "image/gif" :
      ext === "webp" ? "image/webp" :
      ext === "svg" ? "image/svg+xml" :
      "application/octet-stream"

    return new NextResponse(buffer, {
      headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=3600" },
    })
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 })
  }
}
