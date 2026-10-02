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

  // === Image-matching Purchase List table ===
  // Format matches the user-uploaded reference photo:
  //  - Teal header with white text, dashed cell borders
  //  - Purchase id | Purchase Date | Supplier Name | Invoice Number |
  //    Total Amount | Attach Invoice | Actions
  //  - Date in DD-MM-YYYY format
  //  - Footer "Total Amount" row showing the sum of all grandTotals
  const fmtDMY = (iso: string) => {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return "—"
    const dd = String(d.getDate()).padStart(2, "0")
    const mm = String(d.getMonth() + 1).padStart(2, "0")
    const yyyy = d.getFullYear()
    return `${dd}-${mm}-${yyyy}`
  }
  const fmtPurchaseId = (row: Purchase) => {
    // Use the last 6 chars of the cuid (uppercased) prefixed with "Pur-".
    // Matches the image's "Pur-260001" sequential-looking style.
    const tail = row.id.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase()
    return `Pur-${tail}`
  }
  const fmtAmount = (n: number) =>
    new Intl.NumberFormat("en-US").format(Number(n) || 0)

  const totalAmountSum = (rows ?? []).reduce(
    (s, r) => s + (Number(r.grandTotal) || 0),
    0
  )

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

      {/* Search box (kept above the custom table) */}
      <div className="flex items-center gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search purchases..."
          className="max-w-sm"
        />
      </div>

      {/* Custom Purchase List table — matches the user-uploaded photo */}
      <div className="overflow-x-auto rounded-md border border-gray-300 bg-white">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr
              className="text-white"
              style={{
                background:
                  "linear-gradient(to bottom, #4DB6AC, #80CBC4)",
              }}
            >
              {[
                "Purchase id",
                "Purchase Date",
                "Supplier Name",
                "Invoice Number",
                "Total Amount",
                "Attach Invoice",
                "Actions",
              ].map((h) => (
                <th
                  key={h}
                  className="border border-white/60 px-3 py-2 text-center font-bold"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan={7}
                  className="border border-dashed border-gray-300 px-3 py-6 text-center text-muted-foreground"
                >
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="border border-dashed border-gray-300 px-3 py-6 text-center text-muted-foreground"
                >
                  No purchases found.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="bg-white">
                  <td className="border border-dashed border-gray-300 px-3 py-2 font-medium">
                    {fmtPurchaseId(row)}
                  </td>
                  <td className="border border-dashed border-gray-300 px-3 py-2 text-center">
                    {fmtDMY(row.purchaseDate)}
                  </td>
                  <td className="border border-dashed border-gray-300 px-3 py-2">
                    {row.supplier?.name ?? "—"}
                  </td>
                  <td className="border border-dashed border-gray-300 px-3 py-2">
                    {row.invoiceNo}
                  </td>
                  <td className="border border-dashed border-gray-300 px-3 py-2 text-right font-medium">
                    {fmtAmount(row.grandTotal)}
                  </td>
                  <td className="border border-dashed border-gray-300 px-3 py-2 text-center">
                    {row.attachment ? (
                      <a
                        href={row.attachment}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={row.attachment.split("/").pop()}
                        className="text-[#0066cc] hover:underline"
                        title={`Open / download ${row.attachment.split("/").pop()}`}
                      >
                        Attach Invoice
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleEdit(row)}
                        className="text-[#0066cc] hover:underline"
                        title="Edit to attach an invoice"
                      >
                        Attach Invoice
                      </button>
                    )}
                  </td>
                  <td className="border border-dashed border-gray-300 px-3 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => setViewing(row)}
                      className="text-[#0066cc] hover:underline"
                    >
                      View
                    </button>
                    ,{" "}
                    <button
                      type="button"
                      onClick={() => handleEdit(row)}
                      className="text-[#0066cc] hover:underline"
                    >
                      Edit
                    </button>
                    ,{" "}
                    <button
                      type="button"
                      onClick={() => setDeletingId(row.id)}
                      className="text-[#0066cc] hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {/* Footer — Total Amount row */}
          {rows.length > 0 && (
            <tfoot>
              <tr className="bg-gray-50">
                <td
                  colSpan={4}
                  className="border border-dashed border-gray-300 px-3 py-2 text-right font-bold"
                >
                  Total Amount
                </td>
                <td className="border-2 border-black px-3 py-2 text-right font-bold">
                  {fmtAmount(totalAmountSum)}
                </td>
                <td
                  colSpan={2}
                  className="border border-dashed border-gray-300 px-3 py-2"
                />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

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
