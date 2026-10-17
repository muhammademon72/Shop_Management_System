/**
 * Open an attachment URL in a new browser tab.
 *
 * Why this helper exists:
 * - Modern browsers (Chrome since ~2017, Firefox 58+) BLOCK top-level
 *   navigation to `data:` URLs (other than `data:image/*` and
 *   `data:application/pdf`). Clicking an `<a href="data:application/...">`
 *   link opens a blank tab. See https://www.ghacks.net/2017/11/28/firefox-58-to-block-top-level-data-url-navigation
 * - Our upload API stores files as base64 data URLs (because Vercel has no
 *   writable filesystem). So we MUST convert the data URL to a Blob URL on
 *   the client before opening it. Blob URLs created via
 *   `URL.createObjectURL` are NOT subject to the data-URL navigation block.
 *
 * Behaviour:
 * - If `url` is a regular http(s) URL → open directly in a new tab.
 * - If `url` is a `data:` URL → convert to Blob, then open the blob URL.
 *   Blob URLs are auto-revoked after the new tab opens (long delay so the
 *   new tab has time to start loading).
 * - If conversion fails for any reason, fall back to opening the data URL
 *   directly (browser may still allow it for some MIME types).
 */
export async function openAttachment(url: string | null | undefined): Promise<void> {
  if (!url) return

  // Regular URL — just open it directly.
  if (!url.startsWith("data:")) {
    window.open(url, "_blank", "noopener,noreferrer")
    return
  }

  // Data URL — convert to Blob URL so the browser doesn't block it.
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    window.open(blobUrl, "_blank", "noopener,noreferrer")
    // Revoke the blob URL after a delay — gives the new tab time to load it.
    // 60 seconds is a safe window for most PDF/Office viewers to initialize.
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000)
  } catch {
    // Last-ditch fallback: open the data URL directly. Some browsers will
    // still allow it (e.g., for `data:application/pdf`).
    window.open(url, "_blank", "noopener,noreferrer")
  }
}
