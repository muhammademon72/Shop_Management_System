"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { Truck, Printer } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { DataTable, type Column } from "@/components/data-table"
import { PageHeader } from "@/components/page-header"
import type { Sell, Customer, SellItem } from "@/lib/types"
import { formatCurrency, formatDate } from "@/lib/format"

interface DeliveryRow {
  sellId: string
  invoiceNo: string
  sellDate: string
  customerName: string
  customerMobile: string
  customerAddress: string
  productName: string
  brand: string | null
  model: string | null
  serial: string | null
  condition: string | null
  qty: number
  price: number
  total: number
  paidAmount: number
  dueAmount: number
  deliveryStatus: string // "Delivered" | "Partial Payment" | "Paid & Delivered"
}

export function DeliveryReportModule() {
  const [search, setSearch] = React.useState("")
  const [fromDate, setFromDate] = React.useState("")
  const [toDate, setToDate] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")

  const { data: sells, isLoading } = useQuery<Sell[]>({
    queryKey: ["sells"],
    queryFn: async () => {
      const res = await fetch("/api/sells")
      if (!res.ok) throw new Error("Failed")
      return res.json()
    },
  })

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["customers"],
    queryFn: async () => {
      const res = await fetch("/api/customers")
      if (!res.ok) throw new Error("Failed")
      return res.json()
    },
  })

  // Flatten each SellItem into a delivery row (one row = one delivered product unit)
  const rows: DeliveryRow[] = React.useMemo(() => {
    const out: DeliveryRow[] = []
    for (const s of sells ?? []) {
      for (const it of s.items ?? []) {
        const due = s.dueAmount || 0
        const deliveryStatus = due > 0 ? "Partial Payment" : "Paid & Delivered"
        out.push({
          sellId: s.id,
          invoiceNo: s.invoiceNo,
          sellDate: s.sellDate,
          customerName: s.customer?.name ?? "—",
          customerMobile: s.customer?.mobile ?? "",
          customerAddress: s.customer?.address ?? "",
          productName: it.product?.name ?? "—",
          brand: it.brand,
          model: it.model,
          serial: it.serial,
          condition: it.condition,
          qty: it.qty || 0,
          price: it.price || 0,
          total: it.total || 0,
          paidAmount: s.paidAmount || 0,
          dueAmount: due,
          deliveryStatus,
        })
      }
    }
    return out
  }, [sells])

  // Apply filters
  const filtered = React.useMemo(() => {
    return rows.filter((r) => {
      if (fromDate && new Date(r.sellDate) < new Date(fromDate)) return false
      if (toDate && new Date(r.sellDate) > new Date(toDate + "T23:59:59")) return false
      if (statusFilter !== "all" && r.deliveryStatus !== statusFilter) return false
      if (search) {
        const s = search.toLowerCase()
        if (
          !r.invoiceNo.toLowerCase().includes(s) &&
          !r.customerName.toLowerCase().includes(s) &&
          !r.productName.toLowerCase().includes(s) &&
          !(r.serial ?? "").toLowerCase().includes(s)
        )
          return false
      }
      return true
    })
  }, [rows, search, fromDate, toDate, statusFilter])

  // Aggregate KPIs
  const kpis = React.useMemo(() => {
    const totalDeliveries = filtered.length
    const totalUnits = filtered.reduce((s, r) => s + r.qty, 0)
    const totalValue = filtered.reduce((s, r) => s + r.total, 0)
    const totalDue = filtered.reduce((s, r) => s + r.dueAmount, 0)
    const uniqueCustomers = new Set(filtered.map((r) => r.customerName)).size
    return { totalDeliveries, totalUnits, totalValue, totalDue, uniqueCustomers }
  }, [filtered])

  // Per-customer breakdown
  const customerBreakdown = React.useMemo(() => {
    const map = new Map<string, { name: string; deliveries: number; units: number; value: number; due: number }>()
    for (const r of filtered) {
      const entry = map.get(r.customerName) ?? { name: r.customerName, deliveries: 0, units: 0, value: 0, due: 0 }
      entry.deliveries += 1
      entry.units += r.qty
      entry.value += r.total
      entry.due += r.dueAmount
      map.set(r.customerName, entry)
    }
    return Array.from(map.values()).sort((a, b) => b.value - a.value)
  }, [filtered])

  // Per-product breakdown
  const productBreakdown = React.useMemo(() => {
    const map = new Map<string, { name: string; units: number; value: number }>()
    for (const r of filtered) {
      const entry = map.get(r.productName) ?? { name: r.productName, units: 0, value: 0 }
      entry.units += r.qty
      entry.value += r.total
      map.set(r.productName, entry)
    }
    return Array.from(map.values()).sort((a, b) => b.units - a.units).slice(0, 10)
  }, [filtered])

  const columns: Column<DeliveryRow>[] = [
    { key: "sellDate", header: "Date", cell: (row) => <span className="text-muted-foreground text-xs">{formatDate(row.sellDate)}</span> },
    { key: "invoiceNo", header: "Invoice", cell: (row) => <span className="text-xs font-medium">{row.invoiceNo}</span> },
    { key: "customerName", header: "Customer", cell: (row) => <span className="text-xs">{row.customerName}</span> },
    { key: "productName", header: "Product", cell: (row) => <span className="text-xs">{row.productName}</span> },
    { key: "serial", header: "Serial", cell: (row) => <span className="text-xs font-mono">{row.serial ?? "—"}</span> },
    { key: "qty", header: "Qty", cell: (row) => <span className="text-xs text-center">{row.qty}</span> },
    { key: "total", header: "Total", cell: (row) => <span className="text-xs font-semibold">{formatCurrency(row.total)}</span> },
    {
      key: "deliveryStatus",
      header: "Status",
      cell: (row) => (
        <span className={`text-xs font-semibold ${row.dueAmount > 0 ? "text-rose-600" : "text-emerald-600"}`}>
          {row.deliveryStatus}
        </span>
      ),
    },
  ]

  const handlePrint = () => {
    const html = renderPrintHtml(filtered, kpis, customerBreakdown, productBreakdown, fromDate, toDate, statusFilter)
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
      <PageHeader title="Delivery Report" description="Track products delivered to customers, payment status, and high-volume deliveries." />

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
            <Label className="text-xs">Status</Label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 w-44 rounded-md border border-input bg-background px-2 text-xs"
            >
              <option value="all">All Status</option>
              <option value="Paid & Delivered">Paid & Delivered</option>
              <option value="Partial Payment">Partial Payment</option>
            </select>
          </div>
          <div className="grid gap-1 flex-1">
            <Label className="text-xs">Search</Label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Invoice, customer, product, serial..." className="h-8 max-w-xs text-xs" />
          </div>
          <Button onClick={handlePrint} className="bg-emerald-600 text-white hover:bg-emerald-700">
            <Printer className="mr-2 h-4 w-4" /> Print Report
          </Button>
        </CardContent>
      </Card>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { label: "Total Deliveries", value: String(kpis.totalDeliveries), color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950" },
          { label: "Units Delivered", value: String(kpis.totalUnits), color: "text-cyan-600", bg: "bg-cyan-50 dark:bg-cyan-950" },
          { label: "Total Value", value: formatCurrency(kpis.totalValue), color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-950" },
          { label: "Total Due", value: formatCurrency(kpis.totalDue), color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950" },
          { label: "Customers", value: String(kpis.uniqueCustomers), color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950" },
        ].map((k) => (
          <Card key={k.label} className="py-2">
            <CardContent className="flex flex-col gap-1 p-3">
              <span className="text-[11px] font-medium leading-tight text-muted-foreground">{k.label}</span>
              {isLoading ? <Skeleton className="h-5 w-16" /> : <span className={`text-base font-bold ${k.color}`}>{k.value}</span>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Deliveries table */}
      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(r) => `${r.sellId}-${r.serial ?? r.productName}`}
        loading={isLoading}
        search={false}
        headerRowClassName="bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-700 hover:from-emerald-500 hover:via-emerald-600 hover:to-teal-700 [&>th]:text-white [&>th]:font-bold"
      />

      {/* Customer + product breakdown */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="py-3">
          <div className="px-4 pb-2 text-sm font-semibold">Top Customers by Delivery Value</div>
          <CardContent className="p-0">
            <table className="w-full text-xs">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">Customer</th>
                  <th className="px-4 py-2 text-right font-semibold">Deliveries</th>
                  <th className="px-4 py-2 text-right font-semibold">Units</th>
                  <th className="px-4 py-2 text-right font-semibold">Value</th>
                  <th className="px-4 py-2 text-right font-semibold">Due</th>
                </tr>
              </thead>
              <tbody>
                {customerBreakdown.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No data.</td></tr>
                ) : customerBreakdown.slice(0, 10).map((c) => (
                  <tr key={c.name} className="border-b border-muted/30">
                    <td className="px-4 py-2 font-medium">{c.name}</td>
                    <td className="px-4 py-2 text-right">{c.deliveries}</td>
                    <td className="px-4 py-2 text-right">{c.units}</td>
                    <td className="px-4 py-2 text-right font-semibold">{formatCurrency(c.value)}</td>
                    <td className="px-4 py-2 text-right text-rose-600">{formatCurrency(c.due)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card className="py-3">
          <div className="px-4 pb-2 text-sm font-semibold">Top 10 Delivered Products by Quantity</div>
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
                    <td className="px-4 py-2 text-right">{p.units}</td>
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
  deliveries: DeliveryRow[],
  kpis: { totalDeliveries: number; totalUnits: number; totalValue: number; totalDue: number; uniqueCustomers: number },
  customerBreakdown: Array<{ name: string; deliveries: number; units: number; value: number; due: number }>,
  productBreakdown: Array<{ name: string; units: number; value: number }>,
  fromDate: string,
  toDate: string,
  statusFilter: string
): string {
  const dateRange = `${fromDate || "Start"} → ${toDate || "End"}`
  const statusLabel = statusFilter === "all" ? "All Status" : statusFilter
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8" />
<title>Delivery Report</title>
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
  <h1>Delivery Report</h1>
  <div class="meta">Period: ${dateRange} • Status: ${statusLabel} • Generated: ${new Date().toLocaleString()}</div>
  <div class="kpis">
    <div class="kpi"><div class="label">Total Deliveries</div><div class="value">${kpis.totalDeliveries}</div></div>
    <div class="kpi"><div class="label">Units Delivered</div><div class="value">${kpis.totalUnits}</div></div>
    <div class="kpi"><div class="label">Total Value</div><div class="value">${formatCurrency(kpis.totalValue)}</div></div>
    <div class="kpi"><div class="label">Total Due</div><div class="value">${formatCurrency(kpis.totalDue)}</div></div>
    <div class="kpi"><div class="label">Customers</div><div class="value">${kpis.uniqueCustomers}</div></div>
  </div>
  <h2>Top Customers by Delivery Value</h2>
  <table><thead><tr><th>Customer</th><th>Deliveries</th><th>Units</th><th>Value</th><th>Due</th></tr></thead>
  <tbody>${customerBreakdown.slice(0, 10).map((c) => `<tr><td>${c.name}</td><td style="text-align:right">${c.deliveries}</td><td style="text-align:right">${c.units}</td><td style="text-align:right;font-weight:600">${formatCurrency(c.value)}</td><td style="text-align:right;color:#E11D48">${formatCurrency(c.due)}</td></tr>`).join("")}</tbody></table>
  <h2>Top 10 Delivered Products by Quantity</h2>
  <table><thead><tr><th>Product</th><th>Units</th><th>Value</th></tr></thead>
  <tbody>${productBreakdown.map((p) => `<tr><td>${p.name}</td><td style="text-align:right">${p.units}</td><td style="text-align:right;font-weight:600">${formatCurrency(p.value)}</td></tr>`).join("")}</tbody></table>
</body></html>`
}
