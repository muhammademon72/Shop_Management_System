"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Pencil, Plus, Trash2, Eye, FileText, Paperclip, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DataTable, type Column } from "@/components/data-table"
import { FormDialog } from "@/components/form-dialog"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { PageHeader } from "@/components/page-header"
import type { Purchase, PurchaseItem, Supplier, Product } from "@/lib/types"
import { formatCurrency, formatDate, toInputDate } from "@/lib/format"

interface ItemRow {
  id?: string
  productId: string | null
  category: string
  brand: string
  model: string
  serial: string
  qty: string
  price: string
  total: number
  condition: string
  warrantyDate: string
  warrantyDays: string
  remarks: string
}

interface PurchaseForm {
  id?: string
  purchaseDate: string
  supplierId: string | null
  invoiceNo: string
  attachment: string
  remarks: string
  items: ItemRow[]
}

const newItem = (): ItemRow => ({
  productId: null,
  category: "",
  brand: "",
  model: "",
  serial: "",
  qty: "1",
  price: "0",
  total: 0,
  condition: "New",
  warrantyDate: "",
  warrantyDays: "",
  remarks: "",
})

const emptyForm = (): PurchaseForm => ({
  purchaseDate: toInputDate(new Date()),
  supplierId: null,
  invoiceNo: `PUR-${Date.now().toString().slice(-6)}`,
  attachment: "",
  remarks: "",
  items: [newItem()],
})

export function PurchasesModule() {
  const qc = useQueryClient()
  const [search, setSearch] = React.useState("")
  const [open, setOpen] = React.useState(false)
  const [viewing, setViewing] = React.useState<Purchase | null>(null)
  const [form, setForm] = React.useState<PurchaseForm>(emptyForm())
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

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

  const { data: products } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      const res = await fetch("/api/products")
      if (!res.ok) throw new Error("Failed")
      return res.json()
    },
  })

  const saveMutation = useMutation({
    mutationFn: async (data: PurchaseForm) => {
      const items = data.items
        .filter((it) => it.productId || it.qty !== "0" || it.price !== "0")
        .map((it) => ({
          productId: it.productId || null,
          category: it.category || null,
          brand: it.brand || null,
          model: it.model || null,
          serial: it.serial || null,
          qty: Number(it.qty) || 0,
          price: Number(it.price) || 0,
          total: Number(it.qty || 0) * Number(it.price || 0),
          condition: it.condition || null,
          warrantyDate: it.warrantyDate || null,
          warrantyDays: it.warrantyDays ? Number(it.warrantyDays) : null,
          remarks: it.remarks || null,
        }))
      const totalPrice = items.reduce((s, it) => s + it.total, 0)
      const discount = 0
      const grandTotal = totalPrice - discount
      const payload = {
        id: data.id,
        purchaseDate: data.purchaseDate,
        supplierId: data.supplierId || null,
        invoiceNo: data.invoiceNo,
        attachment: data.attachment || null,
        remarks: data.remarks || null,
        totalPrice,
        discount,
        grandTotal,
        items,
      }
      const isEdit = !!data.id
      const res = await fetch("/api/purchases", {
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
      toast.success("Purchase saved successfully")
      qc.invalidateQueries({ queryKey: ["purchases"] })
      qc.invalidateQueries({ queryKey: ["inventory"] })
      qc.invalidateQueries({ queryKey: ["stats"] })
      setOpen(false)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/purchases?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Delete failed")
      return res.json()
    },
    onSuccess: () => {
      toast.success("Purchase deleted")
      qc.invalidateQueries({ queryKey: ["purchases"] })
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
        (p.supplier?.name ?? "").toLowerCase().includes(s)
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
  const grandTotal = totalPrice

  const handleAdd = () => {
    setForm(emptyForm())
    setOpen(true)
  }
  const handleEdit = (row: Purchase) => {
    setForm({
      id: row.id,
      purchaseDate: toInputDate(row.purchaseDate),
      supplierId: row.supplierId,
      invoiceNo: row.invoiceNo,
      attachment: row.attachment ?? "",
      remarks: row.remarks ?? "",
      items: (row.items ?? []).map((it: PurchaseItem) => ({
        id: it.id,
        productId: it.productId,
        category: it.category ?? "",
        brand: it.brand ?? "",
        model: it.model ?? "",
        serial: it.serial ?? "",
        qty: String(it.qty),
        price: String(it.price),
        total: it.total,
        condition: it.condition ?? "New",
        warrantyDate: it.warrantyDate ? toInputDate(it.warrantyDate) : "",
        warrantyDays: it.warrantyDays ? String(it.warrantyDays) : "",
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
  const handleItemProductChange = (idx: number, pid: string) => {
    const product = (products ?? []).find((p) => p.id === pid)
    updateItem(idx, {
      productId: pid || null,
      category: product?.category?.name ?? "",
      brand: product?.brand?.name ?? "",
      model: product?.model ?? "",
      serial: product?.serial ?? "",
    })
  }

  const columns: Column<Purchase>[] = [
    {
      key: "purchaseDate",
      header: "Purchase Date",
      cell: (row) => (
        <span className="text-muted-foreground">
          {formatDate(row.purchaseDate)}
        </span>
      ),
    },
    {
      key: "supplier",
      header: "Supplier",
      cell: (row) => row.supplier?.name ?? "—",
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
      key: "attachment",
      header: "Attachment",
      cell: (row) =>
        row.attachment ? (
          <Badge variant="secondary" className="gap-1">
            <Paperclip className="h-3 w-3" />
            {row.attachment.split("/").pop()}
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setViewing(row)}
            title="View"
          >
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
        title="Purchases"
        description="Record purchases from suppliers with line items."
        actions={
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4" /> New Purchase
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
        searchPlaceholder="Search purchases..."
      />

      {/* Edit/Create form dialog */}
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={form.id ? "Edit Purchase" : "New Purchase"}
        size="xl"
        onSubmit={handleSubmit}
        loading={saveMutation.isPending}
        submitLabel={form.id ? "Update" : "Save Purchase"}
      >
        {/* Header section */}
        <div className="rounded-md border p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <FileText className="h-4 w-4" /> Header
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="grid gap-1">
              <Label className="text-xs">Purchase Date</Label>
              <Input
                type="date"
                value={form.purchaseDate}
                onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
              />
            </div>
            <div className="grid gap-1">
              <Label className="text-xs">Supplier</Label>
              <Select
                value={form.supplierId ?? "none"}
                onValueChange={(v) =>
                  setForm({ ...form, supplierId: v === "none" ? null : v })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {(suppliers ?? []).map((s) => (
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
            <div className="grid gap-1">
              <Label className="text-xs">Attachment (filename)</Label>
              <Input
                value={form.attachment}
                onChange={(e) => setForm({ ...form, attachment: e.target.value })}
                placeholder="invoice.pdf"
              />
            </div>
            <div className="grid gap-1 sm:col-span-2">
              <Label className="text-xs">Remarks</Label>
              <Input
                value={form.remarks}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Line items section */}
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
                  <TableHead className="min-w-[160px]">Product</TableHead>
                  <TableHead className="min-w-[100px]">Category</TableHead>
                  <TableHead className="min-w-[100px]">Brand</TableHead>
                  <TableHead className="min-w-[100px]">Model</TableHead>
                  <TableHead className="min-w-[100px]">Serial</TableHead>
                  <TableHead className="min-w-[70px]">Qty</TableHead>
                  <TableHead className="min-w-[90px]">Price</TableHead>
                  <TableHead className="min-w-[90px]">Total</TableHead>
                  <TableHead className="min-w-[110px]">Condition</TableHead>
                  <TableHead className="min-w-[120px]">W.Date</TableHead>
                  <TableHead className="min-w-[70px]">W.Days</TableHead>
                  <TableHead className="min-w-[100px]">Remarks</TableHead>
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
                          onValueChange={(v) => handleItemProductChange(idx, v)}
                        >
                          <SelectTrigger className="w-full min-w-[160px]">
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
                          value={it.category}
                          onChange={(e) => updateItem(idx, { category: e.target.value })}
                          className="min-w-[100px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={it.brand}
                          onChange={(e) => updateItem(idx, { brand: e.target.value })}
                          className="min-w-[100px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={it.model}
                          onChange={(e) => updateItem(idx, { model: e.target.value })}
                          className="min-w-[100px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={it.serial}
                          onChange={(e) => updateItem(idx, { serial: e.target.value })}
                          className="min-w-[100px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={it.qty}
                          onChange={(e) => updateItem(idx, { qty: e.target.value })}
                          className="min-w-[70px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={it.price}
                          onChange={(e) => updateItem(idx, { price: e.target.value })}
                          className="min-w-[90px]"
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(total)}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={it.condition || "New"}
                          onValueChange={(v) => updateItem(idx, { condition: v })}
                        >
                          <SelectTrigger className="w-full min-w-[110px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="New">New</SelectItem>
                            <SelectItem value="Used">Used</SelectItem>
                            <SelectItem value="Refurbished">Refurbished</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          value={it.warrantyDate}
                          onChange={(e) => updateItem(idx, { warrantyDate: e.target.value })}
                          className="min-w-[120px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={it.warrantyDays}
                          onChange={(e) => updateItem(idx, { warrantyDays: e.target.value })}
                          className="min-w-[70px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={it.remarks}
                          onChange={(e) => updateItem(idx, { remarks: e.target.value })}
                          className="min-w-[100px]"
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

        {/* Footer section */}
        <div className="grid grid-cols-1 gap-3 rounded-md border p-3 sm:grid-cols-3">
          <div className="grid gap-1">
            <Label className="text-xs">Total Price</Label>
            <div className="text-lg font-bold">{formatCurrency(totalPrice)}</div>
          </div>
          <div className="grid gap-1">
            <Label className="text-xs">Discount</Label>
            <Input
              type="number"
              value={0}
              disabled
              title="Discount is auto-calculated as 0 for new purchases; edit on demand"
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

      {/* View dialog */}
      <FormDialog
        open={!!viewing}
        onOpenChange={(o) => !o && setViewing(null)}
        title={`Purchase ${viewing?.invoiceNo ?? ""}`}
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
                  {formatDate(viewing.purchaseDate)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Supplier</div>
                <div className="font-medium">
                  {viewing.supplier?.name ?? "—"}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Invoice No</div>
                <div className="font-medium">{viewing.invoiceNo}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Attachment</div>
                <div className="font-medium">
                  {viewing.attachment ?? "—"}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Total</div>
                <div className="font-medium">
                  {formatCurrency(viewing.totalPrice)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Discount</div>
                <div className="font-medium">
                  {formatCurrency(viewing.discount)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Grand Total</div>
                <div className="text-emerald-600 font-bold">
                  {formatCurrency(viewing.grandTotal)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Remarks</div>
                <div className="font-medium">{viewing.remarks ?? "—"}</div>
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
                    <TableHead>Condition</TableHead>
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
                      <TableCell>{it.condition ?? "—"}</TableCell>
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
        title="Delete purchase?"
        description="This will permanently delete the purchase and its line items."
        loading={deleteMutation.isPending}
        onConfirm={() => deletingId && deleteMutation.mutate(deletingId)}
      />
    </div>
  )
}
