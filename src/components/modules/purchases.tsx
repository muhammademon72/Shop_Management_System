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
  condition: string
  warranty: string
  qty: string
  price: string
  total: number
  remarks: string
}

interface PurchaseForm {
  id?: string
  purchaseDate: string
  supplierId: string | null
  invoiceNo: string
  attachment: string
  discount: string
  remarks: string
  status: "Draft" | "Confirmed"
  items: ItemRow[]
}

const newItem = (): ItemRow => ({
  productId: null,
  category: "",
  brand: "",
  model: "",
  serial: "",
  condition: "",
  warranty: "",
  qty: "1",
  price: "0",
  total: 0,
  remarks: "",
})

const emptyForm = (): PurchaseForm => ({
  purchaseDate: toInputDate(new Date()),
  supplierId: null,
  invoiceNo: `PUR-${Date.now().toString().slice(-6)}`,
  attachment: "",
  discount: "0",
  remarks: "",
  status: "Draft",
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
          // "Condition" column (New/Used/Refurbished) → existing `condition` schema column.
          condition: it.condition || null,
          // "Warranty" free-text column (e.g. "30 Days", "1 Year") → new `warrantyText` schema column.
          warrantyText: it.warranty || null,
          warrantyDate: null,
          warrantyDays: null,
          remarks: it.remarks || null,
        }))
      const totalPrice = items.reduce((s, it) => s + it.total, 0)
      const discount = Number(data.discount) || 0
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

  const totalPrice = React.useMemo(
    () =>
      form.items.reduce(
        (s, it) => s + (Number(it.qty) || 0) * (Number(it.price) || 0),
        0
      ),
    [form.items]
  )

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
      discount: String(row.discount ?? 0),
      remarks: row.remarks ?? "",
      status: "Draft",
      items: (row.items ?? []).map((it: PurchaseItem) => ({
        id: it.id,
        productId: it.productId,
        category: it.category ?? "",
        brand: it.brand ?? "",
        model: it.model ?? "",
        serial: it.serial ?? "",
        // Load Condition from `condition` schema column.
        condition: it.condition ?? "",
        // Load Warranty text from `warrantyText` schema column.
        warranty: it.warrantyText ?? "",
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
        {/* === Header section — 2-column grid matching the image === */}
        <div className="rounded-md border border-gray-300 bg-white">
          <table className="w-full border-collapse text-sm">
            <tbody>
              {/* Row 1: Purchase Date | Invoice Number */}
              <tr>
                <td className="border border-gray-300 bg-gray-100 px-3 py-1.5 font-semibold whitespace-nowrap">
                  Purchase Date:
                </td>
                <td className="border border-gray-300 px-2 py-1.5">
                  <Input
                    type="date"
                    value={form.purchaseDate}
                    onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
                    className="h-8 border-0 bg-transparent px-1 outline-none focus-visible:ring-0"
                  />
                </td>
                <td className="border border-gray-300 bg-gray-100 px-3 py-1.5 font-semibold whitespace-nowrap">
                  Invoice Number:
                </td>
                <td className="border border-gray-300 px-2 py-1.5">
                  <Input
                    value={form.invoiceNo}
                    onChange={(e) => setForm({ ...form, invoiceNo: e.target.value })}
                    className="h-8 border-0 bg-transparent px-1 outline-none focus-visible:ring-0"
                  />
                </td>
              </tr>
              {/* Row 2: Supplier Name | Discount Amount */}
              <tr>
                <td className="border border-gray-300 bg-gray-100 px-3 py-1.5 font-semibold whitespace-nowrap">
                  Supplier Name:
                </td>
                <td className="border border-gray-300 px-2 py-1.5">
                  <Select
                    value={form.supplierId ?? "none"}
                    onValueChange={(v) =>
                      setForm({ ...form, supplierId: v === "none" ? null : v })
                    }
                  >
                    <SelectTrigger className="h-8 border-0 bg-transparent px-1 focus:ring-0">
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
                </td>
                <td className="border border-gray-300 bg-gray-100 px-3 py-1.5 font-semibold whitespace-nowrap">
                  Discount Amount:
                </td>
                <td className="border border-gray-300 px-2 py-1.5">
                  <Input
                    type="number"
                    value={form.discount}
                    onChange={(e) => setForm({ ...form, discount: e.target.value })}
                    className="h-8 border-0 bg-transparent px-1 outline-none focus-visible:ring-0"
                  />
                </td>
              </tr>
              {/* Row 3: Supplier Address | File Attach */}
              <tr>
                <td className="border border-gray-300 bg-gray-100 px-3 py-1.5 font-semibold whitespace-nowrap align-top">
                  Supplier Address:
                </td>
                <td className="border border-gray-300 px-2 py-1.5 align-top">
                  <textarea
                    rows={3}
                    readOnly
                    value={
                      (() => {
                        const s = (suppliers ?? []).find((x) => x.id === form.supplierId)
                        return s?.address?.trim() ? s.address : "—"
                      })()
                    }
                    className="w-full resize-none border-0 bg-transparent px-1 py-1 text-sm outline-none focus:ring-0"
                  />
                </td>
                <td className="border border-gray-300 bg-gray-100 px-3 py-1.5 font-semibold whitespace-nowrap align-top">
                  File Attach:
                </td>
                <td className="border border-gray-300 px-2 py-1.5 align-top">
                  <input
                    type="file"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      setForm({ ...form, attachment: f ? f.name : "" })
                    }}
                    className="block w-full text-xs file:mr-2 file:rounded file:border-0 file:bg-gray-100 file:px-2 file:py-1 file:text-xs file:font-medium hover:file:bg-gray-200"
                  />
                  {form.attachment && (
                    <span className="text-muted-foreground mt-1 block text-[10px]">
                      Selected: {form.attachment}
                    </span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* === Line items table — 12 columns with light-blue header === */}
        <div className="overflow-auto rounded-md border border-gray-300 bg-white">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr style={{ background: "#9DC3E6" }} className="text-black">
                {[
                  "Product Name",
                  "Category",
                  "Brand Name",
                  "Product Model",
                  "Serial Number",
                  "Condition",
                  "Warranty",
                  "Qty",
                  "Price",
                  "Total Amount",
                  "Remarks",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="border border-gray-400 px-2 py-1.5 text-center font-bold whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {form.items.map((it, idx) => {
                const total = (Number(it.qty) || 0) * (Number(it.price) || 0)
                return (
                  <tr key={idx} className="bg-white hover:bg-gray-50">
                    <td className="border border-gray-300 p-1">
                      <Select
                        value={it.productId ?? "none"}
                        onValueChange={(v) => handleItemProductChange(idx, v)}
                      >
                        <SelectTrigger className="h-8 min-w-[140px] border-0 bg-transparent px-1 focus:ring-0">
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
                    </td>
                    <td className="border border-gray-300 p-1">
                      <Input
                        value={it.category}
                        onChange={(e) => updateItem(idx, { category: e.target.value })}
                        className="h-8 min-w-[100px] border-0 bg-transparent px-1 text-xs focus-visible:ring-0"
                      />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <Input
                        value={it.brand}
                        onChange={(e) => updateItem(idx, { brand: e.target.value })}
                        className="h-8 min-w-[100px] border-0 bg-transparent px-1 text-xs focus-visible:ring-0"
                      />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <Input
                        value={it.model}
                        onChange={(e) => updateItem(idx, { model: e.target.value })}
                        className="h-8 min-w-[100px] border-0 bg-transparent px-1 text-xs focus-visible:ring-0"
                      />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <Input
                        value={it.serial}
                        onChange={(e) => updateItem(idx, { serial: e.target.value })}
                        className="h-8 min-w-[100px] border-0 bg-transparent px-1 text-xs focus-visible:ring-0"
                      />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <Select
                        value={it.condition || "none"}
                        onValueChange={(v) =>
                          updateItem(idx, { condition: v === "none" ? "" : v })
                        }
                      >
                        <SelectTrigger className="h-8 min-w-[100px] border-0 bg-transparent px-1 text-xs focus:ring-0">
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">—</SelectItem>
                          <SelectItem value="New">New</SelectItem>
                          <SelectItem value="Used">Used</SelectItem>
                          <SelectItem value="Refurbished">Refurbished</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="border border-gray-300 p-1">
                      <Input
                        value={it.warranty}
                        onChange={(e) => updateItem(idx, { warranty: e.target.value })}
                        placeholder="e.g. 30 Days"
                        className="h-8 min-w-[90px] border-0 bg-transparent px-1 text-xs focus-visible:ring-0"
                      />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <Input
                        type="number"
                        value={it.qty}
                        onChange={(e) => updateItem(idx, { qty: e.target.value })}
                        className="h-8 min-w-[60px] border-0 bg-transparent px-1 text-xs focus-visible:ring-0"
                      />
                    </td>
                    <td className="border border-gray-300 p-1">
                      <Input
                        type="number"
                        value={it.price}
                        onChange={(e) => updateItem(idx, { price: e.target.value })}
                        className="h-8 min-w-[80px] border-0 bg-transparent px-1 text-xs focus-visible:ring-0"
                      />
                    </td>
                    <td className="border border-gray-300 px-2 py-1 text-right font-medium">
                      {formatCurrency(total)}
                    </td>
                    <td className="border border-gray-300 p-1">
                      <Input
                        value={it.remarks}
                        onChange={(e) => updateItem(idx, { remarks: e.target.value })}
                        className="h-8 min-w-[100px] border-0 bg-transparent px-1 text-xs focus-visible:ring-0"
                      />
                    </td>
                    <td className="border border-gray-300 p-1 text-center">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => removeItem(idx)}
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        title="Delete row"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            {/* Footer — Total Amount row + Add Row button */}
            <tfoot>
              <tr className="bg-gray-50">
                <td colSpan={9} className="border border-gray-300 px-3 py-2 text-right font-bold">
                  Total Amount:
                </td>
                <td className="border-2 border-black px-2 py-2 text-right font-bold">
                  {formatCurrency(totalPrice)}
                </td>
                <td colSpan={2} className="border border-gray-300 px-2 py-2 text-center">
                  <Button
                    type="button"
                    size="sm"
                    onClick={addItem}
                    variant="outline"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Row
                  </Button>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* === Bottom section — Note (left) + Status panel (right) === */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Left: Note */}
          <div className="rounded-md border border-gray-300 bg-white p-2">
            <Label className="text-xs font-bold">Note</Label>
            <textarea
              rows={3}
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              placeholder="Optional notes / additional info"
              className="mt-1 w-full resize-none rounded border border-gray-200 px-2 py-1 text-xs outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
            />
          </div>
          {/* Right: Status panel */}
          <div className="rounded-md border border-gray-300 bg-white p-2">
            <Label className="text-xs font-bold">Status</Label>
            <table className="mt-1 w-full border-collapse text-xs">
              <tbody>
                <tr className="bg-gray-100">
                  <td className="border border-gray-300 px-2 py-1 text-center font-semibold">
                    Status
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-center font-semibold">
                    Saved
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-2 py-1.5 text-center">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, status: "Draft" })}
                      className={
                        form.status === "Draft"
                          ? "font-bold text-emerald-700"
                          : "text-gray-600 hover:text-emerald-700"
                      }
                    >
                      ● Draft
                    </button>
                  </td>
                  <td className="border border-gray-300 px-2 py-1.5 text-center text-gray-400">
                    {saveMutation.isPending ? "Saving…" : "—"}
                  </td>
                </tr>
                <tr>
                  <td className="border border-gray-300 px-2 py-1.5 text-center">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, status: "Confirmed" })}
                      className={
                        form.status === "Confirmed"
                          ? "font-bold text-emerald-700"
                          : "text-gray-600 hover:text-emerald-700"
                      }
                    >
                      ● Confirmed
                    </button>
                  </td>
                  <td className="border border-gray-300 px-2 py-1.5 text-center text-gray-400">
                    —
                  </td>
                </tr>
              </tbody>
            </table>
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
