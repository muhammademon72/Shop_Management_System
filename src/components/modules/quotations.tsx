"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Pencil, Plus, Trash2, Eye, FileText, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import { PageHeader } from "@/components/page-header"
import type { Quotation, QuotationItem, Customer, Product } from "@/lib/types"
import { formatCurrency, formatDate, toInputDate } from "@/lib/format"

interface ItemRow {
  id?: string
  productId: string | null
  qty: string
  price: string
  total: number
  remarks: string
}

interface QuotationForm {
  id?: string
  quotationDate: string
  customerId: string | null
  invoiceNo: string
  discount: string
  remarks: string
  items: ItemRow[]
}

const newItem = (): ItemRow => ({
  productId: null,
  qty: "1",
  price: "0",
  total: 0,
  remarks: "",
})

const emptyForm = (): QuotationForm => ({
  quotationDate: toInputDate(new Date()),
  customerId: null,
  invoiceNo: `QUO-${Date.now().toString().slice(-6)}`,
  discount: "0",
  remarks: "",
  items: [newItem()],
})

export function QuotationsModule() {
  const qc = useQueryClient()
  const [search, setSearch] = React.useState("")
  const [open, setOpen] = React.useState(false)
  const [viewing, setViewing] = React.useState<Quotation | null>(null)
  const [form, setForm] = React.useState<QuotationForm>(emptyForm())
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  const { data, isLoading } = useQuery<Quotation[]>({
    queryKey: ["quotations"],
    queryFn: async () => {
      const res = await fetch("/api/quotations")
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

  const saveMutation = useMutation({
    mutationFn: async (data: QuotationForm) => {
      const items = data.items
        .filter((it) => it.productId || it.qty !== "0")
        .map((it) => ({
          productId: it.productId || null,
          qty: Number(it.qty) || 0,
          price: Number(it.price) || 0,
          total: Number(it.qty || 0) * Number(it.price || 0),
          remarks: it.remarks || null,
        }))
      const totalPrice = items.reduce((s, it) => s + it.total, 0)
      const discount = Number(data.discount) || 0
      const grandTotal = totalPrice - discount
      const payload = {
        id: data.id,
        quotationDate: data.quotationDate,
        customerId: data.customerId || null,
        invoiceNo: data.invoiceNo,
        totalPrice,
        discount,
        grandTotal,
        remarks: data.remarks || null,
        items,
      }
      const isEdit = !!data.id
      const res = await fetch("/api/quotations", {
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
      toast.success("Quotation saved successfully")
      qc.invalidateQueries({ queryKey: ["quotations"] })
      qc.invalidateQueries({ queryKey: ["stats"] })
      setOpen(false)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/quotations?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Delete failed")
      return res.json()
    },
    onSuccess: () => {
      toast.success("Quotation deleted")
      qc.invalidateQueries({ queryKey: ["quotations"] })
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

  const handleAdd = () => {
    setForm(emptyForm())
    setOpen(true)
  }
  const handleEdit = (row: Quotation) => {
    setForm({
      id: row.id,
      quotationDate: toInputDate(row.quotationDate),
      customerId: row.customerId,
      invoiceNo: row.invoiceNo,
      discount: String(row.discount),
      remarks: row.remarks ?? "",
      items: (row.items ?? []).map((it: QuotationItem) => ({
        id: it.id,
        productId: it.productId,
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

  const columns: Column<Quotation>[] = [
    {
      key: "quotationDate",
      header: "Quotation Date",
      cell: (row) => (
        <span className="text-muted-foreground">
          {formatDate(row.quotationDate)}
        </span>
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
      key: "totalPrice",
      header: "Total Price",
      cell: (row) => formatCurrency(row.totalPrice),
    },
    {
      key: "discount",
      header: "Discount",
      cell: (row) => formatCurrency(row.discount),
    },
    {
      key: "grandTotal",
      header: "Grand Total",
      cell: (row) => (
        <span className="font-semibold">{formatCurrency(row.grandTotal)}</span>
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
        title="Quotations"
        description="Create quotations for customers with multiple line items."
        actions={
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4" /> New Quotation
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
        searchPlaceholder="Search quotations..."
      />

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={form.id ? "Edit Quotation" : "New Quotation"}
        size="xl"
        onSubmit={handleSubmit}
        loading={saveMutation.isPending}
        submitLabel={form.id ? "Update" : "Save Quotation"}
      >
        <div className="rounded-md border p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <FileText className="h-4 w-4" /> Header
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="grid gap-1">
              <Label className="text-xs">Quotation Date</Label>
              <Input
                type="date"
                value={form.quotationDate}
                onChange={(e) => setForm({ ...form, quotationDate: e.target.value })}
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
            <div className="grid gap-1 sm:col-span-3">
              <Label className="text-xs">Remarks</Label>
              <Input
                value={form.remarks}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="rounded-md border">
          <div className="flex items-center justify-between border-b p-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <FileText className="h-4 w-4" /> Line Items ({totalItems})
            </div>
            <Button type="button" size="sm" onClick={addItem} variant="outline">
              <Plus className="h-4 w-4" /> Add Row
            </Button>
          </div>
          <div className="max-h-80 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="min-w-[200px]">Product</TableHead>
                  <TableHead className="min-w-[80px]">Qty</TableHead>
                  <TableHead className="min-w-[100px]">Price</TableHead>
                  <TableHead className="min-w-[100px]">Total</TableHead>
                  <TableHead className="min-w-[160px]">Remarks</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {form.items.map((it, idx) => {
                  const total =
                    (Number(it.qty) || 0) * (Number(it.price) || 0)
                  return (
                    <TableRow key={idx}>
                      <TableCell>
                        <Select
                          value={it.productId ?? "none"}
                          onValueChange={(v) =>
                            updateItem(idx, { productId: v === "none" ? null : v })
                          }
                        >
                          <SelectTrigger className="w-full min-w-[200px]">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">— None —</SelectItem>
                            {(products ?? []).map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={it.qty}
                          onChange={(e) => updateItem(idx, { qty: e.target.value })}
                          className="min-w-[80px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={it.price}
                          onChange={(e) => updateItem(idx, { price: e.target.value })}
                          className="min-w-[100px]"
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(total)}
                      </TableCell>
                      <TableCell>
                        <Input
                          value={it.remarks}
                          onChange={(e) => updateItem(idx, { remarks: e.target.value })}
                          className="min-w-[160px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => removeItem(idx)}
                          className="text-destructive hover:text-destructive"
                          title="Remove"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 rounded-md border p-3 sm:grid-cols-3">
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
        </div>
      </FormDialog>

      <FormDialog
        open={!!viewing}
        onOpenChange={(o) => !o && setViewing(null)}
        title={`Quotation ${viewing?.invoiceNo ?? ""}`}
        size="lg"
        hideFooter
        footer={
          <Button variant="outline" onClick={() => setViewing(null)}>
            Close
          </Button>
        }
      >
        {viewing && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <div className="text-muted-foreground text-xs">Date</div>
                <div className="font-medium">
                  {formatDate(viewing.quotationDate)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Customer</div>
                <div className="font-medium">
                  {viewing.customer?.name ?? "—"}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Invoice No</div>
                <div className="font-medium">{viewing.invoiceNo}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Grand Total</div>
                <div className="text-emerald-600 font-bold">
                  {formatCurrency(viewing.grandTotal)}
                </div>
              </div>
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead>Product</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(viewing.items ?? []).map((it) => (
                    <TableRow key={it.id}>
                      <TableCell>{it.product?.name ?? "—"}</TableCell>
                      <TableCell>{it.qty}</TableCell>
                      <TableCell>{formatCurrency(it.price)}</TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(it.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </FormDialog>

      <ConfirmDialog
        open={!!deletingId}
        onOpenChange={(o) => !o && setDeletingId(null)}
        title="Delete quotation?"
        description="This will permanently delete the quotation and its line items."
        loading={deleteMutation.isPending}
        onConfirm={() => deletingId && deleteMutation.mutate(deletingId)}
      />
    </div>
  )
}
