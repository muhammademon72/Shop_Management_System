"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { BarChart3, Plus, Trash2, Eye, Printer } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { DataTable, type Column } from "@/components/data-table"
import { PageHeader } from "@/components/page-header"
import type { Purchase, Supplier } from "@/lib/types"
import { formatCurrency, formatDate } from "@/lib/format"

interface SupplierFilter {
  value: string | null
  label: string
}

export function PurchaseReportModule() {
  const [search, setSearch] = React.useState("")
  const [supplierFilter, setSupplierFilter] = React.useState<string>("all")
  const [fromDate, setFromDate] = React.useState("")
  const [toDate, setToDate] = React.useState("")

  const { data, isLoading } = useQuery<Purchase[]>({
    queryKey: ["purchases"],
    queryFn: async () => {
      const res = await fetch("/api/purchases")
      if (!res.ok) throw new Error("Failed")
      return res.json()
    },
  })

  const { data: suppliers } = useQuery<Supplier[]>({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const res = await fetch("/api/suppliers")
      if (!res.ok) throw new Error("Failed")
      return res.json()
    },
  })

  const supplierOptions: SupplierFilter[] = React.useMemo(
    () => [
      { value: null, label: "All Suppliers" },
      ...(suppliers ?? []).map((s) => ({ value: s.id, label: s.name })),
    ],
    [suppliers]
  )

  // Apply filters: supplier, date range, search (invoice or supplier name)
  const filtered = React.useMemo(() => {
    const list = data ?? []
    return list.filter((p) => {
      if (supplierFilter !== "all" && p.supplierId !== supplierFilter) return false
      if (fromDate && new Date(p.purchaseDate) < new Date(fromDate)) return false
      if (toDate && new Date(p.purchaseDate) > new Date(toDate + "T23:59:59")) return false
      if (search) {
        const s = search.toLowerCase()
        if (
          !p.invoiceNo.toLowerCase().includes(s) &&
          !(p.supplier?.name ?? "").toLowerCase().includes(s)
        )
          return false
      }
      return true
    })
  }, [data, supplierFilter, fromDate, toDate, search])

  // Aggregate KPIs
  const kpis = React.useMemo(() => {
    const totalPurchases = filtered.length
    const totalValue = filtered.reduce((s, p) => s + (p.grandTotal || 0), 0)
    const totalItems = filtered.reduce(
      (s, p) => s + (p.items ?? []).reduce((ss, it) => ss + (it.qty || 0), 0),
      0
    )
    const supplierCount = new Set(filtered.map((p) => p.supplierId).filter(Boolean)).size
    const avgOrder = totalPurchases > 0 ? totalValue / totalPurchases : 0
    return { totalPurchases, totalValue, totalItems, supplierCount, avgOrder }
  }, [filtered])

  // Per-supplier breakdown
  const supplierBreakdown = React.useMemo(() => {
    const map = new Map<string, { name: string; orders: number; value: number; items: number }>()
    for (const p of filtered) {
      const key = p.supplierId ?? "—"
      const name = p.supplier?.name ?? "Unknown"
      const entry = map.get(key) ?? { name, orders: 0, value: 0, items: 0 }
      entry.orders += 1
      entry.value += p.grandTotal || 0
      entry.items += (p.items ?? []).reduce((s, it) => s + (it.qty || 0), 0)
      map.set(key, entry)
    }
    return Array.from(map.values()).sort((a, b) => b.value - a.value)
  }, [filtered])

  // Per-product breakdown (top purchased items)
  const productBreakdown = React.useMemo(() => {
    const map = new Map<string, { name: string; qty: number; value: number }>()
    for (const p of filtered) {
      for (const it of p.items ?? []) {
        const name = it.product?.name ?? "Unknown Product"
        const entry = map.get(name) ?? { name, qty: 0, value: 0 }
        entry.qty += it.qty || 0
        entry.value += it.total || 0
        map.set(name, entry)
      }
    }
    return Array.from(map.values()).sort((a, b) => b.qty - a.qty).slice(0, 10)
  }, [filtered])

  const columns: Column<Purchase>[] = [
    { key: "purchaseDate", header: "Date", cell: (row) => <span className="text-muted-foreground text-xs">{formatDate(row.purchaseDate)}</span> },
    { key: "invoiceNo", header: "Invoice", cell: (row) => <span className="text-xs font-medium">{row.invoiceNo}</span> },
    { key: "supplier", header: "Supplier", cell: (row) => <span className="text-xs">{row.supplier?.name ?? "—"}</span> },
    { key: "items", header: "Items", cell: (row) => <span className="text-xs text-muted-foreground">{(row.items ?? []).reduce((s, it) => s + (it.qty || 0), 0)} units</span> },
    { key: "grandTotal", header: "Grand Total", cell: (row) => <span className="text-xs font-semibold">{formatCurrency(row.grandTotal)}</span> },
  ]

  const handlePrint = () => {
    const html = renderPrintHtml(filtered, kpis, supplierBreakdown, productBreakdown, fromDate, toDate, supplierFilter === "all" ? "All Suppliers" : (suppliers?.find((s) => s.id === supplierFilter)?.name ?? "—"))
    const win = window.open("", "_blank", "width=900,height=1100")
    if (!win) {
      alert("Please allow pop-ups to print the report.")
      return
    }
    win.document.open()
    win.document.write(html)
    win.document.close()
    win.onload = () => setTimeout(() => { win.focus(); win.print() }, 250)
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Purchase Report" description="Analyze purchase trends, top suppliers, and high-volume products." />

      {/* Filters */}
      <Card className="py-3">
        <CardContent className="flex flex-col flex-wrap gap-3 p-4 sm:flex-row sm:items-end">
          <div className="grid gap-1">
            <Label className="text-xs">From Date</Label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-8 w-40 text-xs" />
          </div>
          <div className="grid gap-1">
            <Label className="text-xs">To Date</Label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-8 w-40 text-xs" />
          </div>
          <div className="grid gap-1">
            <Label className="text-xs">Supplier</Label>
            <select
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              className="h-8 w-48 rounded-md border border-input bg-background px-2 text-xs"
            >
              {supplierOptions.map((o) => (
                <option key={o.label} value={o.value ?? "all"}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-1 flex-1">
            <Label className="text-xs">Search</Label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Invoice or supplier..." className="h-8 max-w-xs text-xs" />
          </div>
          <Button onClick={handlePrint} className="bg-emerald-600 text-white hover:bg-emerald-700">
            <Printer className="mr-2 h-4 w-4" /> Print Report
          </Button>
        </CardContent>
      </Card>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { label: "Total Purchases", value: String(kpis.totalPurchases), color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950" },
          { label: "Total Value", value: formatCurrency(kpis.totalValue), color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-950" },
          { label: "Units Purchased", value: String(kpis.totalItems), color: "text-cyan-600", bg: "bg-cyan-50 dark:bg-cyan-950" },
          { label: "Suppliers", value: String(kpis.supplierCount), color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950" },
          { label: "Avg Order", value: formatCurrency(kpis.avgOrder), color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950" },
        ].map((k) => (
          <Card key={k.label} className="py-2">
            <CardContent className="flex flex-col gap-1 p-3">
              <span className="text-[11px] font-medium leading-tight text-muted-foreground">{k.label}</span>
              {isLoading ? <Skeleton className="h-5 w-16" /> : <span className={`text-base font-bold ${k.color}`}>{k.value}</span>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Purchases table */}
      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(r) => r.id}
        loading={isLoading}
        search={false}
        headerRowClassName="bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-700 hover:from-emerald-500 hover:via-emerald-600 hover:to-teal-700 [&>th]:text-white [&>th]:font-bold"
      />

      {/* Supplier + product breakdown */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="py-3">
          <div className="px-4 pb-2 text-sm font-semibold">Top Suppliers</div>
          <CardContent className="p-0">
            <table className="w-full text-xs">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">Supplier</th>
                  <th className="px-4 py-2 text-right font-semibold">Orders</th>
                  <th className="px-4 py-2 text-right font-semibold">Units</th>
                  <th className="px-4 py-2 text-right font-semibold">Value</th>
                </tr>
              </thead>
              <tbody>
                {supplierBreakdown.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">No data.</td></tr>
                ) : supplierBreakdown.map((s) => (
                  <tr key={s.name} className="border-b border-muted/30">
                    <td className="px-4 py-2 font-medium">{s.name}</td>
                    <td className="px-4 py-2 text-right">{s.orders}</td>
                    <td className="px-4 py-2 text-right">{s.items}</td>
                    <td className="px-4 py-2 text-right font-semibold">{formatCurrency(s.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card className="py-3">
          <div className="px-4 pb-2 text-sm font-semibold">Top 10 Products by Quantity</div>
          <CardContent className="p-0">
            <table className="w-full text-xs">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">Product</th>
                  <th className="px-4 py-2 text-right font-semibold">Units</th>
                  <th className="px-4 py-2 text-right font-semibold">Value</th>
                </tr>
              </thead>
              <tbody>
                {productBreakdown.length === 0 ? (
                  <tr><td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">No data.</td></tr>
                ) : productBreakdown.map((p) => (
                  <tr key={p.name} className="border-b border-muted/30">
                    <td className="px-4 py-2 font-medium">{p.name}</td>
                    <td className="px-4 py-2 text-right">{p.qty}</td>
                    <td className="px-4 py-2 text-right font-semibold">{formatCurrency(p.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function renderPrintHtml(
  purchases: Purchase[],
  kpis: { totalPurchases: number; totalValue: number; totalItems: number; supplierCount: number; avgOrder: number },
  supplierBreakdown: Array<{ name: string; orders: number; value: number; items: number }>,
  productBreakdown: Array<{ name: string; qty: number; value: number }>,
  fromDate: string,
  toDate: string,
  supplierFilter: string
): string {
  const dateRange = `${fromDate || "Start"} → ${toDate || "End"}`
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8" />
<title>Purchase Report</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, Arial, sans-serif; padding: 28px; color: #111827; }
  h1 { font-size: 20px; margin: 0 0 4px 0; }
  .meta { color: #6b7280; font-size: 12px; margin-bottom: 20px; }
  h2 { font-size: 14px; margin: 24px 0 8px 0; color: #065F46; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #F3F4F6; text-align: left; padding: 8px; border-bottom: 2px solid #E5E7EB; font-weight: 700; }
  td { padding: 6px 8px; border-bottom: 1px solid #F3F4F6; }
  .kpis { display: flex; gap: 16px; flex-wrap: wrap; margin: 12px 0 24px 0; }
  .kpi { padding: 10px 14px; background: #F3F4F6; border-radius: 8px; min-width: 140px; }
  .kpi .label { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
  .kpi .value { font-size: 16px; font-weight: 700; color: #047857; margin-top: 2px; }
  @media print { @page { margin: 12mm; size: A4; } body { padding: 0; } }
</style></head><body>
  <h1>Purchase Report</h1>
  <div class="meta">Period: ${dateRange} • Supplier: ${supplierFilter} • Generated: ${new Date().toLocaleString()}</div>
  <div class="kpis">
    <div class="kpi"><div class="label">Total Purchases</div><div class="value">${kpis.totalPurchases}</div></div>
    <div class="kpi"><div class="label">Total Value</div><div class="value">${formatCurrency(kpis.totalValue)}</div></div>
    <div class="kpi"><div class="label">Units</div><div class="value">${kpis.totalItems}</div></div>
    <div class="kpi"><div class="label">Suppliers</div><div class="value">${kpis.supplierCount}</div></div>
    <div class="kpi"><div class="label">Avg Order</div><div class="value">${formatCurrency(kpis.avgOrder)}</div></div>
  </div>
  <h2>Top Suppliers</h2>
  <table><thead><tr><th>Supplier</th><th>Orders</th><th>Units</th><th>Value</th></tr></thead>
  <tbody>${supplierBreakdown.map((s) => `<tr><td>${s.name}</td><td style="text-align:right">${s.orders}</td><td style="text-align:right">${s.items}</td><td style="text-align:right;font-weight:600">${formatCurrency(s.value)}</td></tr>`).join("")}</tbody></table>
  <h2>Top 10 Products by Quantity</h2>
  <table><thead><tr><th>Product</th><th>Units</th><th>Value</th></tr></thead>
  <tbody>${productBreakdown.map((p) => `<tr><td>${p.name}</td><td style="text-align:right">${p.qty}</td><td style="text-align:right;font-weight:600">${formatCurrency(p.value)}</td></tr>`).join("")}</tbody></table>
</body></html>`
}
