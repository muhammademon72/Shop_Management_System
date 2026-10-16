"use client"

import * as React from "react"
import { Upload, X, FileText, Image as ImageIcon, Loader2, Download } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { openAttachment } from "@/lib/open-attachment"

interface FileUploadProps {
  value: string | null
  onChange: (url: string | null) => void
  compact?: boolean
  disabled?: boolean
}

const DEFAULT_ACCEPT =
  ".jpg,.jpeg,.png,.gif,.webp,.bmp,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt," +
  "image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/plain"

// MIME type → human label + extension mapping (for data URLs we use this)
const MIME_LABELS: Record<string, { ext: string; kind: "pdf" | "doc" | "sheet" | "image" | "file" }> = {
  "application/pdf": { ext: "pdf", kind: "pdf" },
  "application/msword": { ext: "doc", kind: "doc" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { ext: "docx", kind: "doc" },
  "application/vnd.ms-excel": { ext: "xls", kind: "sheet" },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": { ext: "xlsx", kind: "sheet" },
  "text/csv": { ext: "csv", kind: "sheet" },
  "text/plain": { ext: "txt", kind: "file" },
  "image/jpeg": { ext: "jpg", kind: "image" },
  "image/png": { ext: "png", kind: "image" },
  "image/gif": { ext: "gif", kind: "image" },
  "image/webp": { ext: "webp", kind: "image" },
  "image/bmp": { ext: "bmp", kind: "image" },
}

function parseDataUrl(url: string): { mime: string; kind: string } | null {
  const m = url.match(/^data:([^;,]+)(;base64)?,/)
  if (!m) return null
  return { mime: m[1], kind: MIME_LABELS[m[1]]?.kind ?? "file" }
}

function isImage(url: string | null): boolean {
  if (!url) return false
  if (url.startsWith("data:")) {
    return parseDataUrl(url)?.kind === "image"
  }
  return /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(url)
}

function getFileKind(url: string | null): "pdf" | "doc" | "sheet" | "image" | "file" {
  if (!url) return "file"
  if (url.startsWith("data:")) {
    return (parseDataUrl(url)?.kind as "pdf" | "doc" | "sheet" | "image" | "file") ?? "file"
  }
  const ext = getFileExt(url)
  if (ext === "pdf") return "pdf"
  if (ext.match(/^(doc|docx)$/)) return "doc"
  if (ext.match(/^(xls|xlsx|csv)$/)) return "sheet"
  if (ext.match(/^(jpg|jpeg|png|gif|webp|bmp)$/)) return "image"
  return "file"
}

function getFileExt(url: string | null): string {
  if (!url) return ""
  if (url.startsWith("data:")) {
    const mime = parseDataUrl(url)?.mime
    return mime ? (MIME_LABELS[mime]?.ext ?? "") : ""
  }
  const m = url.match(/\.([a-z0-9]+)$/i)
  return m ? m[1].toLowerCase() : ""
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

export function FileUpload({
  value,
  onChange,
  compact = false,
  disabled = false,
}: FileUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = React.useState(false)
  const [progress, setProgress] = React.useState(0)
  const [lastUpload, setLastUpload] = React.useState<{ name: string; size: number } | null>(null)

  const handleFileSelect = async (file: File | null) => {
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File is too large. Max 10MB.")
      return
    }

    setUploading(true)
    setProgress(0)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const result = await new Promise<{ url: string; name: string; size: number } | { error: string }>(
        (resolve, reject) => {
          const xhr = new XMLHttpRequest()
          xhr.open("POST", "/api/upload")
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
          }
          xhr.onload = () => {
            try {
              const data = JSON.parse(xhr.responseText)
              if (xhr.status >= 200 && xhr.status < 300) resolve(data)
              else resolve({ error: data.error || `Upload failed (HTTP ${xhr.status})` })
            } catch {
              reject(new Error("Invalid response from upload endpoint"))
            }
          }
          xhr.onerror = () => reject(new Error("Network error during upload"))
          xhr.send(formData)
        }
      )

      if ("error" in result) {
        toast.error(result.error)
        return
      }

      setLastUpload({ name: result.name, size: result.size })
      onChange(result.url)
      toast.success(`Uploaded ${result.name}`)
    } catch (e) {
      toast.error((e as Error).message || "Upload failed")
    } finally {
      setUploading(false)
      setProgress(0)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  const handleRemove = () => {
    onChange(null)
    setLastUpload(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  // For data URLs we don't have a real filename — fall back to a friendly
  // label like "PDF Document" or just the extension. For regular URLs we
  // take the last path segment.
  function getDisplayLabel(url: string | null): string | null {
    if (!url) return null
    if (lastUpload?.name) return lastUpload.name
    if (url.startsWith("data:")) {
      const mime = parseDataUrl(url)?.mime
      if (!mime) return "Attachment"
      const ext = MIME_LABELS[mime]?.ext ?? ""
      if (ext === "pdf") return "PDF Document"
      if (ext === "doc" || ext === "docx") return "Word Document"
      if (ext === "xls" || ext === "xlsx" || ext === "csv") return "Spreadsheet"
      if (ext === "txt") return "Text File"
      if (ext) return `${ext.toUpperCase()} File`
      return "Attachment"
    }
    return url.split("/").pop() ?? null
  }

  const showFilename = getDisplayLabel(value)

  return (
    <div className="flex flex-col gap-2">
      {!value && !uploading && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-input bg-muted/30 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            compact ? "h-8 px-2" : "h-10 px-3",
            disabled && "cursor-not-allowed opacity-50"
          )}
        >
          <Upload className="h-4 w-4" />
          <span>Click to upload</span>
        </button>
      )}

      {uploading && (
        <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/30 px-3 py-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
          <div className="flex-1">
            <div className="text-xs font-medium">Uploading… {progress}%</div>
            <div className="bg-muted mt-1 h-1.5 w-full overflow-hidden rounded-full">
              <div className="h-full bg-emerald-600 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      )}

      {value && !uploading && (
        <div className="flex items-center gap-3 rounded-md border bg-muted/30 px-3 py-2">
          {isImage(value) ? (
            <button
              type="button"
              onClick={() => openAttachment(value)}
              className="block"
              title={`View ${showFilename}`}
            >
              <img src={value} alt={showFilename ?? "attachment"} className="h-12 w-12 rounded-md border object-cover" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => openAttachment(value)}
              className="flex items-center gap-2 text-sm hover:underline"
              title={`View ${showFilename}`}
            >
              {(() => {
                const kind = getFileKind(value)
                if (kind === "pdf") return <FileText className="h-8 w-8 text-rose-600" />
                if (kind === "doc") return <FileText className="h-8 w-8 text-blue-600" />
                if (kind === "sheet") return <FileText className="h-8 w-8 text-emerald-600" />
                if (kind === "image") return <ImageIcon className="h-8 w-8 text-muted-foreground" />
                return <FileText className="h-8 w-8 text-muted-foreground" />
              })()}
              <span className="flex flex-col">
                <span className="font-medium">{showFilename}</span>
                {lastUpload && <span className="text-xs text-muted-foreground">{formatSize(lastUpload.size)}</span>}
              </span>
            </button>
          )}
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="ml-auto h-7 w-7 text-destructive hover:text-destructive"
            onClick={handleRemove}
            disabled={disabled}
            title="Remove attachment"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={DEFAULT_ACCEPT}
        className="hidden"
        disabled={disabled || uploading}
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null
          handleFileSelect(f)
        }}
      />
    </div>
  )
}
