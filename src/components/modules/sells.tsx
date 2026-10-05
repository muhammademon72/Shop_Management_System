"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Pencil, Plus, Trash2, Eye, FileText, X, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DataTable, type Column } from "@/components/data-table"
import { FormDialog } from "@/components/form-dialog"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { SearchableSelect } from "@/components/searchable-select"
import { PageHeader } from "@/components/page-header"
import type { Sell, SellItem, Customer, Product, Brand, Condition } from "@/lib/types"
import { formatCurrency, formatDate, toInputDate } from "@/lib/format"

interface ItemRow {
  id?: string
  productId: string | null
  brand: string
  model: string
  serial: string
  condition: string
  qty: string
  price: string
  total: number
  remarks: string
}

interface SellForm {
  id?: string
  sellDate: string
  customerId: string | null
  invoiceNo: string
  discount: string
  paidAmount: string
  remarks: string
  items: ItemRow[]
}

const newItem = (): ItemRow => ({
  productId: null,
  brand: "",
  model: "",
  serial: "",
  condition: "",
  qty: "1",
  price: "0",
  total: 0,
  remarks: "",
})

const emptyForm = (): SellForm => ({
  sellDate: toInputDate(new Date()),
  customerId: null,
  invoiceNo: `SAL-${Date.now().toString().slice(-6)}`,
  discount: "0",
  paidAmount: "0",
  remarks: "",
  items: [newItem()],
})

export function SellsModule() {
  const qc = useQueryClient()
  const [search, setSearch] = React.useState("")
  const [open, setOpen] = React.useState(false)
  const [viewing, setViewing] = React.useState<Sell | null>(null)
  const [form, setForm] = React.useState<SellForm>(emptyForm())
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  const { data, isLoading } = useQuery<Sell[]>({
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

  const { data: products } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      const res = await fetch("/api/products")
      if (!res.ok) throw new Error("Failed")
      return res.json()
    },
  })

  const { data: brands } = useQuery<Brand[]>({
    queryKey: ["brands"],
    queryFn: async () => {
      const res = await fetch("/api/brands")
      if (!res.ok) throw new Error("Failed")
      return res.json()
    },
  })

  const { data: conditions } = useQuery<Condition[]>({
    queryKey: ["conditions"],
    queryFn: async () => {
      const res = await fetch("/api/conditions")
      if (!res.ok) throw new Error("Failed")
      return res.json()
    },
  })

  const saveMutation = useMutation({
    mutationFn: async (data: SellForm) => {
      const items = data.items
        .filter((it) => it.productId || it.qty !== "0" || it.price !== "0")
        .map((it) => ({
          productId: it.productId || null,
          brand: it.brand || null,
          model: it.model || null,
          serial: it.serial || null,
          condition: it.condition || null,
          qty: Number(it.qty) || 0,
          price: Number(it.price) || 0,
          total: Number(it.qty || 0) * Number(it.price || 0),
          remarks: it.remarks || null,
        }))
      const totalPrice = items.reduce((s, it) => s + it.total, 0)
      const discount = Number(data.discount) || 0
      const grandTotal = totalPrice - discount
      const paidAmount = Number(data.paidAmount) || 0
      const payload = {
        id: data.id,
        sellDate: data.sellDate,
        customerId: data.customerId || null,
        invoiceNo: data.invoiceNo,
        totalPrice,
        discount,
        grandTotal,
        paidAmount,
        remarks: data.remarks || null,
        items,
      }
      const isEdit = !!data.id
      const res = await fetch("/api/sells", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Save failed")
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success("Sale saved successfully")
      qc.invalidateQueries({ queryKey: ["sells"] })
      qc.invalidateQueries({ queryKey: ["stats"] })
      setOpen(false)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/sells?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Delete failed")
      return res.json()
    },
    onSuccess: () => {
      toast.success("Sale deleted")
      qc.invalidateQueries({ queryKey: ["sells"] })
      qc.invalidateQueries({ queryKey: ["stats"] })
      setDeletingId(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const rows = React.useMemo(() => {
    const list = data ?? []
    if (!search) return list
    const s = search.toLowerCase()
    return list.filter(
      (p) =>
        p.invoiceNo.toLowerCase().includes(s) ||
        (p.customer?.name ?? "").toLowerCase().includes(s)
    )
  }, [data, search])

  const totalItems = form.items.length
  const totalPrice = React.useMemo(
    () =>
      form.items.reduce(
        (s, it) => s + (Number(it.qty) || 0) * (Number(it.price) || 0),
        0
      ),
    [form.items]
  )
  const discount = Number(form.discount) || 0
  const grandTotal = totalPrice - discount
  const paidAmount = Number(form.paidAmount) || 0
  const dueAmount = Math.max(0, grandTotal - paidAmount)

  const handleAdd = () => {
    setForm(emptyForm())
    setOpen(true)
  }
  const handleEdit = (row: Sell) => {
    setForm({
      id: row.id,
      sellDate: toInputDate(row.sellDate),
      customerId: row.customerId,
      invoiceNo: row.invoiceNo,
      discount: String(row.discount),
      paidAmount: String(row.paidAmount),
      remarks: row.remarks ?? "",
      items: (row.items ?? []).map((it: SellItem) => ({
        id: it.id,
        productId: it.productId,
        brand: it.brand ?? "",
        model: it.model ?? "",
        serial: it.serial ?? "",
        condition: it.condition ?? "",
        qty: String(it.qty),
        price: String(it.price),
        total: it.total,
        remarks: it.remarks ?? "",
      })),
    })
    setOpen(true)
  }
  const handleSubmit = () => {
    if (!form.invoiceNo.trim()) {
      toast.error("Invoice No is required")
      return
    }
    if (form.items.length === 0) {
      toast.error("At least one item is required")
      return
    }
    saveMutation.mutate(form)
  }

  const addItem = () => setForm({ ...form, items: [...form.items, newItem()] })
  const removeItem = (idx: number) =>
    setForm({
      ...form,
      items: form.items.filter((_, i) => i !== idx),
    })
  const updateItem = (idx: number, patch: Partial<ItemRow>) => {
    const next = form.items.map((it, i) => (i === idx ? { ...it, ...patch } : it))
    setForm({ ...form, items: next })
  }

  const columns: Column<Sell>[] = [
    {
      key: "sellDate",
      header: "Sell Date",
      cell: (row) => (
        <span className="text-muted-foreground">{formatDate(row.sellDate)}</span>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      cell: (row) => row.customer?.name ?? "—",
    },
    {
      key: "invoiceNo",
      header: "Invoice No",
      cell: (row) => <span className="font-medium">{row.invoiceNo}</span>,
    },
    {
      key: "grandTotal",
      header: "Grand Total",
      cell: (row) => (
        <span className="font-semibold">{formatCurrency(row.grandTotal)}</span>
      ),
    },
    {
      key: "paidAmount",
      header: "Paid",
      cell: (row) => formatCurrency(row.paidAmount),
    },
    {
      key: "dueAmount",
      header: "Due",
      cell: (row) => (
        <Badge
          variant="outline"
          className={
            row.dueAmount > 0
              ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300"
              : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
          }
        >
          {formatCurrency(row.dueAmount)}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" onClick={() => setViewing(row)} title="View">
            <Eye className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => handleEdit(row)} title="Edit">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setDeletingId(row.id)}
            title="Delete"
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Sales"
        description="Record sales to customers with line items, paid and due amounts."
        actions={
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4" /> New Sale
          </Button>
        }
      />

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        loading={isLoading}
        search
        searchText={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search sales..."
        headerRowClassName="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 hover:from-blue-700 hover:via-blue-800 hover:to-indigo-900 [&>th]:text-white [&>th]:font-bold"
      />

      {/* === New Sale form — same layout pattern as New Quotation === */}
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={form.id ? "Edit Sale" : "New Sale"}
        size="wide"
        maxHeight="80vh"
        onSubmit={handleSubmit}
        loading={saveMutation.isPending}
        submitLabel={form.id ? "Update" : "Save Sale"}
      >
        {/* === Header section === */}
        <div className="rounded-md border border-gray-300 bg-white p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <FileText className="h-4 w-4" /> Header
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="grid gap-1">
              <Label className="text-xs">Sell Date</Label>
              <Input
                type="date"
                value={form.sellDate}
                onChange={(e) => setForm({ ...form, sellDate: e.target.value })}
              />
            </div>
            <div className="grid gap-1">
              <Label className="text-xs">Customer</Label>
              <Select
                value={form.customerId ?? "none"}
                onValueChange={(v) =>
                  setForm({ ...form, customerId: v === "none" ? null : v })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {(customers ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label className="text-xs">Invoice No</Label>
              <Input
                value={form.invoiceNo}
                onChange={(e) => setForm({ ...form, invoiceNo: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* === Line items table — 8 columns + Actions === */}
        <div className="rounded-md border border-gray-300 bg-white p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <FileText className="h-4 w-4" /> Line Items ({totalItems})
            </div>
          </div>
          <div className="overflow-auto rounded-md border border-gray-300">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr style={{ background: "#9DC3E6" }} className="text-black">
                  {["Product", "Brand", "Model", "Serial", "Condition", "Qty", "Price", "Total", "Actions"].map((h) => (
                    <th key={h} className="border border-gray-400 px-2 py-1.5 text-center font-bold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {form.items.map((it, idx) => {
                  const total = (Number(it.qty) || 0) * (Number(it.price) || 0)
                  return (
                    <tr key={idx} className="bg-white hover:bg-gray-50">
                      <td className="border border-gray-300 p-1">
                        <SearchableSelect
                          value={it.productId}
                          onValueChange={(v) => updateItem(idx, { productId: v ?? "" })}
                          options={(products ?? []).map((p) => ({ value: p.id, label: p.name, hint: p.category?.name }))}
                          placeholder="Select"
                          searchPlaceholder="Search product..."
                          emptyText="No product found."
                          allowNone
                          noneLabel="— None —"
                          compact
                          triggerClassName="min-w-[140px]"
                        />
                      </td>
                      <td className="border border-gray-300 p-1">
                        <SearchableSelect
                          value={it.brand || null}
                          onValueChange={(v) => updateItem(idx, { brand: v ?? "" })}
                          options={(brands ?? []).map((b) => ({ value: b.name, label: b.name }))}
                          placeholder="—"
                          searchPlaceholder="Search brand..."
                          emptyText="No brand found."
                          allowNone
                          noneLabel="—"
                          compact
                          triggerClassName="min-w-[100px]"
                        />
                      </td>
                      <td className="border border-gray-300 p-1">
                        <Input value={it.model} onChange={(e) => updateItem(idx, { model: e.target.value })} className="h-8 min-w-[100px] border-0 bg-transparent px-1 text-xs focus-visible:ring-0" />
                      </td>
                      <td className="border border-gray-300 p-1">
                        <Input value={it.serial} onChange={(e) => updateItem(idx, { serial: e.target.value })} className="h-8 min-w-[100px] border-0 bg-transparent px-1 text-xs focus-visible:ring-0" />
                      </td>
                      <td className="border border-gray-300 p-1">
                        <Select
                          value={it.condition || "none"}
                          onValueChange={(v) => updateItem(idx, { condition: v === "none" ? "" : v })}
                        >
                          <SelectTrigger className="h-8 min-w-[100px] border-0 bg-transparent px-1 text-xs focus:ring-0">
                            <SelectValue placeholder="—" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">—</SelectItem>
                            {(conditions ?? []).map((c) => (
                              <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="border border-gray-300 p-1">
                        <Input type="number" min="0" step="any" value={it.qty} onChange={(e) => updateItem(idx, { qty: e.target.value })} className="h-8 min-w-[60px] border-0 bg-transparent px-1 text-xs text-center focus-visible:ring-0" />
                      </td>
                      <td className="border border-gray-300 p-1">
                        <Input type="number" value={it.price} onChange={(e) => updateItem(idx, { price: e.target.value })} className="h-8 min-w-[80px] border-0 bg-transparent px-1 text-xs focus-visible:ring-0" />
                      </td>
                      <td className="border border-gray-300 px-2 py-1 text-right font-medium">
                        {formatCurrency(total)}
                      </td>
                      <td className="border border-gray-300 p-1 text-center">
                        <Button type="button" size="icon" variant="ghost" onClick={() => removeItem(idx)} className="h-7 w-7 text-destructive hover:text-destructive" title="Delete row">
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50">
                  <td colSpan={7} className="border border-gray-300 px-3 py-2 text-right font-bold">Total Amount:</td>
                  <td className="border-2 border-black px-2 py-2 text-right font-bold">{formatCurrency(totalPrice)}</td>
                  <td className="border border-gray-300 px-2 py-2 text-center">
                    <Button type="button" size="sm" onClick={addItem} variant="outline">
                      <Plus className="h-3.5 w-3.5" /> Add Row
                    </Button>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* === Totals section === */}
        <div className="grid grid-cols-2 gap-3 rounded-md border border-gray-300 bg-white p-3 sm:grid-cols-3">
          <div className="grid gap-1">
            <Label className="text-xs">Total Price</Label>
            <div className="text-lg font-bold">{formatCurrency(totalPrice)}</div>
          </div>
          <div className="grid gap-1">
            <Label className="text-xs">Discount</Label>
            <Input
              type="number"
              value={form.discount}
              onChange={(e) => setForm({ ...form, discount: e.target.value })}
            />
          </div>
          <div className="grid gap-1">
            <Label className="text-xs">Grand Total</Label>
            <div className="text-lg font-bold text-emerald-600">
              {formatCurrency(grandTotal)}
            </div>
          </div>
          <div className="grid gap-1">
            <Label className="text-xs">Paid Amount</Label>
            <Input
              type="number"
              value={form.paidAmount}
              onChange={(e) => setForm({ ...form, paidAmount: e.target.value })}
            />
          </div>
          <div className="grid gap-1">
            <Label className="text-xs">Due Amount</Label>
            <div className="text-lg font-bold text-rose-600">
              {formatCurrency(dueAmount)}
            </div>
          </div>
        </div>
      </FormDialog>

      {/* === View dialog === */}
      <FormDialog
        open={!!viewing}
        onOpenChange={(o) => !o && setViewing(null)}
        title={`Sale ${viewing?.invoiceNo ?? ""}`}
        size="wide"
        maxHeight="80vh"
        hideFooter
        footer={<Button variant="outline" onClick={() => setViewing(null)}>Close</Button>}
      >
        {viewing && (
          <div className="flex flex-col gap-3">
            <div className="rounded-md border border-gray-300 bg-white">
              <table className="w-full border-collapse text-sm">
                <tbody>
                  <tr>
                    <td className="border border-gray-300 bg-gray-100 px-3 py-1.5 font-semibold whitespace-nowrap">Sell Date:</td>
                    <td className="border border-gray-300 px-2 py-1.5">{formatDate(viewing.sellDate)}</td>
                    <td className="border border-gray-300 bg-gray-100 px-3 py-1.5 font-semibold whitespace-nowrap">Invoice Number:</td>
                    <td className="border border-gray-300 px-2 py-1.5 font-medium">{viewing.invoiceNo}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 bg-gray-100 px-3 py-1.5 font-semibold whitespace-nowrap">Customer Name:</td>
                    <td className="border border-gray-300 px-2 py-1.5">{viewing.customer?.name ?? "—"}</td>
                    <td className="border border-gray-300 bg-gray-100 px-3 py-1.5 font-semibold whitespace-nowrap">Discount Amount:</td>
                    <td className="border border-gray-300 px-2 py-1.5">{formatCurrency(viewing.discount)}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 bg-gray-100 px-3 py-1.5 font-semibold whitespace-nowrap">Paid Amount:</td>
                    <td className="border border-gray-300 px-2 py-1.5">{formatCurrency(viewing.paidAmount)}</td>
                    <td className="border border-gray-300 bg-gray-100 px-3 py-1.5 font-semibold whitespace-nowrap">Due Amount:</td>
                    <td className="border border-gray-300 px-2 py-1.5 text-rose-600 font-medium">{formatCurrency(viewing.dueAmount)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="overflow-auto rounded-md border border-gray-300 bg-white">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr style={{ background: "#9DC3E6" }} className="text-black">
                    {["Product", "Brand", "Model", "Serial", "Condition", "Qty", "Price", "Total"].map((h) => (
                      <th key={h} className="border border-gray-400 px-2 py-1.5 text-center font-bold whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(viewing.items ?? []).length === 0 ? (
                    <tr><td colSpan={8} className="border border-gray-300 px-3 py-6 text-center text-muted-foreground">No line items.</td></tr>
                  ) : (
                    (viewing.items ?? []).map((it, idx) => (
                      <tr key={it.id ?? idx} className="bg-white">
                        <td className="border border-gray-300 px-2 py-1 font-medium">{it.product?.name ?? "—"}</td>
                        <td className="border border-gray-300 px-2 py-1">{it.brand ?? "—"}</td>
                        <td className="border border-gray-300 px-2 py-1">{it.model ?? "—"}</td>
                        <td className="border border-gray-300 px-2 py-1 font-mono">{it.serial ?? "—"}</td>
                        <td className="border border-gray-300 px-2 py-1 text-center">{it.condition ?? "—"}</td>
                        <td className="border border-gray-300 px-2 py-1 text-center">{it.qty ?? "—"}</td>
                        <td className="border border-gray-300 px-2 py-1 text-right">{formatCurrency(it.price)}</td>
                        <td className="border border-gray-300 px-2 py-1 text-right font-medium">{formatCurrency(it.total)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {viewing.items && viewing.items.length > 0 && (
                  <tfoot>
                    <tr className="bg-gray-50">
                      <td colSpan={7} className="border border-gray-300 px-3 py-2 text-right font-bold">Total Amount:</td>
                      <td className="border-2 border-black px-2 py-2 text-right font-bold">{formatCurrency(viewing.grandTotal)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}
      </FormDialog>

      <ConfirmDialog
        open={!!deletingId}
        onOpenChange={(o) => !o && setDeletingId(null)}
        title="Delete sale?"
        description="This will permanently delete the sale and its line items."
        loading={deleteMutation.isPending}
        onConfirm={() => deletingId && deleteMutation.mutate(deletingId)}
      />
    </div>
  )
}
