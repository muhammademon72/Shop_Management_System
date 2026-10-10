export function formatCurrency(n: number | undefined | null): string {
  const v = typeof n === "number" ? n : 0
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "BDT",
    minimumFractionDigits: 2,
  }).format(v)
}

export function formatNumber(n: number | undefined | null): string {
  const v = typeof n === "number" ? n : 0
  return new Intl.NumberFormat("en-US").format(v)
}

export function formatDate(d: string | Date | undefined | null): string {
  if (!d) return "—"
  const date = typeof d === "string" ? new Date(d) : d
  if (isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  })
}

export function toInputDate(d: string | Date | undefined | null): string {
  if (!d) return new Date().toISOString().slice(0, 10)
  const date = typeof d === "string" ? new Date(d) : d
  if (isNaN(date.getTime())) return new Date().toISOString().slice(0, 10)
  return date.toISOString().slice(0, 10)
}
