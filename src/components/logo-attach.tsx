"use client"

import * as React from "react"
import { Paperclip, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface LogoAttachProps {
  /** Current logo URL value (read-only here; the parent controls the field). */
  value: string
  /** Called when a new file has been uploaded with the resulting URL. */
  onChange: (url: string) => void
  /** Maximum file size in bytes (default 2 MB — small logos). */
  maxSizeBytes?: number
  /** Disable the button (e.g. while parent form is submitting). */
  disabled?: boolean
}

const ACCEPTED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
])

/**
 * A compact "Attach" button that opens a file picker, validates the
 * selected image, uploads it to /api/upload?bucket=logos, and calls
 * onChange with the resulting URL. Designed to sit next to a Logo URL
 * text input in the Company Profile form.
 */
export function LogoAttach({
  value: _value,
  onChange,
  maxSizeBytes = 2 * 1024 * 1024,
  disabled = false,
}: LogoAttachProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = React.useState(false)
  const [progress, setProgress] = React.useState(0)

  const handleFileSelect = async (file: File | null) => {
    if (!file) return
    if (!ACCEPTED_IMAGE_TYPES.has(file.type) && !/\.(png|jpe?g|webp|gif|svg)$/i.test(file.name)) {
      toast.error("Only image files (PNG, JPG, WebP, GIF, SVG) are allowed.")
      return
    }
    if (file.size > maxSizeBytes) {
      const mb = (maxSizeBytes / 1024 / 1024).toFixed(0)
      toast.error(`Logo is too large. Max ${mb} MB.`)
      return
    }

    setUploading(true)
    setProgress(0)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const result = await new Promise<{ url: string; name: string } | { error: string }>(
        (resolve, reject) => {
          const xhr = new XMLHttpRequest()
          xhr.open("POST", "/api/upload?bucket=logos")
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
      onChange(result.url)
      toast.success(`Logo uploaded (${file.name})`)
    } catch (e) {
      toast.error((e as Error).message || "Upload failed")
    } finally {
      setUploading(false)
      setProgress(0)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
        title="Attach a logo image (PNG/JPG/WebP/SVG, max 2MB)"
        className="shrink-0"
      >
        {uploading ? (
          <>
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            {progress}%
          </>
        ) : (
          <>
            <Paperclip className="mr-1 h-3.5 w-3.5" />
            Attach
          </>
        )}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,.png,.jpg,.jpeg,.webp,.gif,.svg"
        className="hidden"
        disabled={disabled || uploading}
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null
          handleFileSelect(f)
        }}
      />
    </>
  )
}
