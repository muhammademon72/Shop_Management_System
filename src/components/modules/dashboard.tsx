"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import {
  Package,
  Truck,
  Users,
  DollarSign,
  TrendingUp,
  ShoppingCart,
  AlertTriangle,
} from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDate, formatCurrency } from "@/lib/format"
import { useAppStore } from "@/lib/store"

interface Stats {
  totalProducts: number
  totalSuppliers: number
  totalCustomers: number
  totalSales: number
  totalPurchases: number
  totalInventory: number
  lowStockCount: number
  recentPurchases: Array<{
    id: string
    invoiceNo: string
    grandTotal: number
    purchaseDate: string
    supplier?: { name: string } | null
  }>
  recentSells: Array<{
    id: string
    invoiceNo: string
    grandTotal: number
    sellDate: string
    customer?: { name: string } | null
  }>
}

export function Dashboard() {
  const setActiveModule = useAppStore((s) => s.setActiveModule)
  const { data, isLoading } = useQuery<Stats>({
    queryKey: ["stats"],
    queryFn: async () => {
      const res = await fetch("/api/stats", { cache: "no-store" })
      if (!res.ok) throw new Error("Failed to load stats")
      return res.json()
    },
  })

  const kpis = [
    { label: "Total Products", value: data?.totalProducts ?? 0, icon: Package, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950", onClick: () => setActiveModule("products") },
    { label: "Total Suppliers", value: data?.totalSuppliers ?? 0, icon: Truck, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950", onClick: () => setActiveModule("suppliers") },
    { label: "Total Customers", value: data?.totalCustomers ?? 0, icon: Users, color: "text-teal-600", bg: "bg-teal-50 dark:bg-teal-950", onClick: () => setActiveModule("customers") },
    { label: "Total Sales", value: formatCurrency(data?.totalSales ?? 0), icon: DollarSign, color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-950", onClick: () => setActiveModule("sells") },
    { label: "Total Purchases", value: formatCurrency(data?.totalPurchases ?? 0), icon: ShoppingCart, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950", onClick: () => setActiveModule("purchases") },
    { label: "Inventory Rows", value: data?.totalInventory ?? 0, icon: TrendingUp, color: "text-cyan-600", bg: "bg-cyan-50 dark:bg-cyan-950", onClick: () => setActiveModule("inventory") },
    { label: "Low Stock", value: data?.lowStockCount ?? 0, icon: AlertTriangle, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950", onClick: () => setActiveModule("inventory") },
  ]

  return (
    // Fill the available viewport height (main area is 100vh - 5.5rem
    // accounting for the 3.5rem header + 2rem padding). `overflow-hidden`
    // prevents the dashboard itself from scrolling — only the inner
    // table cards scroll if they overflow. The sidebar already scrolls
    // independently via ScrollArea.
    <div className="flex h-[calc(100vh-5.5rem)] flex-col gap-3 overflow-hidden">
      {/* Compact header row: title + quick-action buttons inline */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-xs text-muted-foreground">
            Overview of your shop&apos;s key metrics and recent activity.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => setActiveModule("purchases")}>
            <ShoppingCart className="h-3.5 w-3.5" /> New Purchase
          </Button>
          <Button size="sm" variant="outline" onClick={() => setActiveModule("sells")}>
            <DollarSign className="h-3.5 w-3.5" /> New Sale
          </Button>
          <Button size="sm" variant="outline" onClick={() => setActiveModule("products")}>
            <Package className="h-3.5 w-3.5" /> Add Product
          </Button>
          <Button size="sm" variant="outline" onClick={() => setActiveModule("inventory")}>
            <TrendingUp className="h-3.5 w-3.5" /> Inventory
          </Button>
          <Badge variant="secondary" className="self-center">
            Live • SQLite
          </Badge>
        </div>
      </div>

      {/* KPI grid — compact cards */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
        {kpis.map((k) => (
          <Card key={k.label} className="py-2">
            <CardContent className="flex flex-col gap-1 p-3">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-medium leading-tight text-muted-foreground">
                  {k.label}
                </span>
                <div className={`${k.bg} ${k.color} flex h-6 w-6 items-center justify-center rounded`}>
                  <k.icon className="h-3 w-3" />
                </div>
              </div>
              {isLoading ? (
                <Skeleton className="h-5 w-16" />
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto justify-start px-0 py-0 text-left text-base font-bold tracking-tight"
                  onClick={k.onClick}
                >
                  {k.value}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent activity — fills remaining height, each card scrolls internally */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 lg:grid-cols-2">
        <Card className="flex min-h-0 flex-col py-2">
          <div className="flex items-center justify-between px-4 pb-1">
            <span className="text-sm font-semibold">Recent Purchases</span>
            <Button variant="ghost" size="sm" className="h-7" onClick={() => setActiveModule("purchases")}>
              View all
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto px-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="pl-4 text-xs">Invoice</TableHead>
                  <TableHead className="text-xs">Supplier</TableHead>
                  <TableHead className="text-right text-xs">Total</TableHead>
                  <TableHead className="pr-4 text-xs">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={`ps-${i}`}>
                      <TableCell colSpan={4} className="pl-4">
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : data?.recentPurchases?.length ? (
                  data.recentPurchases.map((p) => (
                    <TableRow key={p.id} className="py-1">
                      <TableCell className="pl-4 py-1.5 text-xs font-medium">
                        {p.invoiceNo}
                      </TableCell>
                      <TableCell className="py-1.5 text-xs text-muted-foreground">
                        {p.supplier?.name ?? "—"}
                      </TableCell>
                      <TableCell className="py-1.5 text-right text-xs font-medium">
                        {formatCurrency(p.grandTotal)}
                      </TableCell>
                      <TableCell className="py-1.5 pr-4 text-xs text-muted-foreground">
                        {formatDate(p.purchaseDate)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground py-4 text-center text-xs">
                      No purchases yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        <Card className="flex min-h-0 flex-col py-2">
          <div className="flex items-center justify-between px-4 pb-1">
            <span className="text-sm font-semibold">Recent Sales</span>
            <Button variant="ghost" size="sm" className="h-7" onClick={() => setActiveModule("sells")}>
              View all
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto px-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="pl-4 text-xs">Invoice</TableHead>
                  <TableHead className="text-xs">Customer</TableHead>
                  <TableHead className="text-right text-xs">Total</TableHead>
                  <TableHead className="pr-4 text-xs">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={`sl-${i}`}>
                      <TableCell colSpan={4} className="pl-4">
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : data?.recentSells?.length ? (
                  data.recentSells.map((s) => (
                    <TableRow key={s.id} className="py-1">
                      <TableCell className="pl-4 py-1.5 text-xs font-medium">
                        {s.invoiceNo}
                      </TableCell>
                      <TableCell className="py-1.5 text-xs text-muted-foreground">
                        {s.customer?.name ?? "—"}
                      </TableCell>
                      <TableCell className="py-1.5 text-right text-xs font-medium">
                        {formatCurrency(s.grandTotal)}
                      </TableCell>
                      <TableCell className="py-1.5 pr-4 text-xs text-muted-foreground">
                        {formatDate(s.sellDate)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground py-4 text-center text-xs">
                      No sales yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  )
}
