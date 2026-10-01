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
  ArrowRight,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { PageHeader } from "@/components/page-header"
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
    {
      label: "Total Products",
      value: data?.totalProducts ?? 0,
      icon: Package,
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-950",
      onClick: () => setActiveModule("products"),
    },
    {
      label: "Total Suppliers",
      value: data?.totalSuppliers ?? 0,
      icon: Truck,
      color: "text-amber-600",
      bg: "bg-amber-50 dark:bg-amber-950",
      onClick: () => setActiveModule("suppliers"),
    },
    {
      label: "Total Customers",
      value: data?.totalCustomers ?? 0,
      icon: Users,
      color: "text-teal-600",
      bg: "bg-teal-50 dark:bg-teal-950",
      onClick: () => setActiveModule("customers"),
    },
    {
      label: "Total Sales",
      value: formatCurrency(data?.totalSales ?? 0),
      icon: DollarSign,
      color: "text-rose-600",
      bg: "bg-rose-50 dark:bg-rose-950",
      onClick: () => setActiveModule("sells"),
    },
    {
      label: "Total Purchases",
      value: formatCurrency(data?.totalPurchases ?? 0),
      icon: ShoppingCart,
      color: "text-purple-600",
      bg: "bg-purple-50 dark:bg-purple-950",
      onClick: () => setActiveModule("purchases"),
    },
    {
      label: "Inventory Rows",
      value: data?.totalInventory ?? 0,
      icon: TrendingUp,
      color: "text-cyan-600",
      bg: "bg-cyan-50 dark:bg-cyan-950",
      onClick: () => setActiveModule("inventory"),
    },
    {
      label: "Low Stock",
      value: data?.lowStockCount ?? 0,
      icon: AlertTriangle,
      color: "text-orange-600",
      bg: "bg-orange-50 dark:bg-orange-950",
      onClick: () => setActiveModule("inventory"),
    },
    {
      label: "Total KPIs",
      value: "Live",
      icon: ArrowRight,
      color: "text-zinc-600",
      bg: "bg-zinc-50 dark:bg-zinc-900",
      onClick: () => setActiveModule("dashboard"),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description="Overview of your shop's key metrics and recent activity."
      />

      {/* KPI grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="py-4">
            <CardHeader className="flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                {k.label}
              </CardTitle>
              <div className={`${k.bg} ${k.color} flex h-9 w-9 items-center justify-center rounded-md`}>
                <k.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-7 w-24" />
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto px-0 text-left text-2xl font-bold tracking-tight"
                  onClick={k.onClick}
                >
                  {k.value}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="py-4">
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Recent Purchases</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveModule("purchases")}
            >
              View all
            </Button>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="pl-6">Invoice</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="text-right pr-6">Total</TableHead>
                  <TableHead className="pr-6">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={`ps-${i}`}>
                      <TableCell colSpan={4} className="pl-6">
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : data?.recentPurchases?.length ? (
                  data.recentPurchases.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="pl-6 font-medium">
                        {p.invoiceNo}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {p.supplier?.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-right pr-6 font-medium">
                        {formatCurrency(p.grandTotal)}
                      </TableCell>
                      <TableCell className="pr-6 text-muted-foreground">
                        {formatDate(p.purchaseDate)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground py-6 text-center">
                      No purchases yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="py-4">
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Recent Sales</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveModule("sells")}
            >
              View all
            </Button>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="pl-6">Invoice</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right pr-6">Total</TableHead>
                  <TableHead className="pr-6">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={`sl-${i}`}>
                      <TableCell colSpan={4} className="pl-6">
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : data?.recentSells?.length ? (
                  data.recentSells.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="pl-6 font-medium">
                        {s.invoiceNo}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {s.customer?.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-right pr-6 font-medium">
                        {formatCurrency(s.grandTotal)}
                      </TableCell>
                      <TableCell className="pr-6 text-muted-foreground">
                        {formatDate(s.sellDate)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground py-6 text-center">
                      No sales yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card className="py-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={() => setActiveModule("purchases")}>
            <ShoppingCart className="h-4 w-4" /> New Purchase
          </Button>
          <Button variant="outline" onClick={() => setActiveModule("sells")}>
            <DollarSign className="h-4 w-4" /> New Sale
          </Button>
          <Button variant="outline" onClick={() => setActiveModule("products")}>
            <Package className="h-4 w-4" /> Add Product
          </Button>
          <Button variant="outline" onClick={() => setActiveModule("inventory")}>
            <TrendingUp className="h-4 w-4" /> View Inventory
          </Button>
          <Badge variant="secondary" className="ml-auto self-center">
            Live data from local SQLite
          </Badge>
        </CardContent>
      </Card>
    </div>
  )
}
