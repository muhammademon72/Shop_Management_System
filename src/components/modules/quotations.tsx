"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Pencil, Plus, Trash2, Eye, FileText, X, Loader2 } from "lucide-react"

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
import { SearchableSelect } from "@/components/searchable-select"
import { PageHeader } from "@/components/page-header"
import type { Quotation, QuotationItem, Customer, Product, Brand, Condition, Warranty, CompanyProfile } from "@/lib/types"
import { formatCurrency, formatDate, toInputDate } from "@/lib/format"

interface ItemRow {
  id?: string
  productId: string | null
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

interface QuotationForm {
  id?: string
  quotationDate: string
  validity: string
  customerId: string | null
  invoiceNo: string
  discount: string
  remarks: string
  status: "Draft" | "Confirmed"
  items: ItemRow[]
}

const newItem = (): ItemRow => ({
  productId: null,
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

const emptyForm = (): QuotationForm => ({
  quotationDate: toInputDate(new Date()),
  validity: "",
  customerId: null,
  invoiceNo: `QTN-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`,
  discount: "0",
  remarks: "",
  status: "Draft",
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

  const { data: warranties } = useQuery<Warranty[]>({
    queryKey: ["warranties"],
    queryFn: async () => {
      const res = await fetch("/api/warranties")
      if (!res.ok) throw new Error("Failed")
      return res.json()
    },
  })

  const { data: company } = useQuery<CompanyProfile | null>({
    queryKey: ["company"],
    queryFn: async () => {
      const res = await fetch("/api/company")
      if (!res.ok) throw new Error("Failed")
      const data = await res.json()
      return Array.isArray(data) ? data[0] ?? null : data
    },
  })

  const saveMutation = useMutation({
    mutationFn: async (data: QuotationForm) => {
      const items = data.items
        .filter((it) => it.productId || it.qty !== "0" || it.price !== "0")
        .map((it) => ({
          productId: it.productId || null,
          brand: it.brand || null,
          model: it.model || null,
          serial: it.serial || null,
          condition: it.condition || null,
          warrantyText: it.warranty || null,
          qty: Number(it.qty) || 1,
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

  const totalPrice = React.useMemo(
    () => form.items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.price) || 0), 0),
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
      validity: "",
      customerId: row.customerId,
      invoiceNo: row.invoiceNo,
      discount: String(row.discount),
      remarks: row.remarks ?? "",
      status: "Draft",
      items: (row.items ?? []).map((it: QuotationItem) => ({
        id: it.id,
        productId: it.productId,
        brand: it.brand ?? "",
        model: it.model ?? "",
        serial: it.serial ?? "",
        condition: it.condition ?? "",
        warranty: it.warrantyText ?? "",
        qty: String(it.qty ?? 1),
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
    setForm({ ...form, items: form.items.filter((_, i) => i !== idx) })
  const updateItem = (idx: number, patch: Partial<ItemRow>) => {
    const next = form.items.map((it, i) => (i === idx ? { ...it, ...patch } : it))
    setForm({ ...form, items: next })
  }
  const handleItemProductChange = (idx: number, pid: string) => {
    const product = (products ?? []).find((p) => p.id === pid)
    updateItem(idx, {
      productId: pid || null,
      brand: product?.brand?.name ?? "",
      model: product?.model ?? "",
      serial: product?.serial ?? "",
    })
  }

  const fmtDMY = (iso: string) => {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return "—"
    const dd = String(d.getDate()).padStart(2, "0")
    const mm = String(d.getMonth() + 1).padStart(2, "0")
    const yyyy = d.getFullYear()
    return `${dd}-${mm}-${yyyy}`
  }

  const columns: Column<Quotation>[] = [
    {
      key: "quotationDate",
      header: "Quotation Date",
      cell: (row) => (
        <span className="text-muted-foreground">{formatDate(row.quotationDate)}</span>
      ),
    },
    { key: "customer", header: "Customer", cell: (row) => row.customer?.name ?? "—" },
    { key: "invoiceNo", header: "Invoice No", cell: (row) => <span className="font-medium">{row.invoiceNo}</span> },
    { key: "grandTotal", header: "Grand Total", cell: (row) => <span className="font-semibold">{formatCurrency(row.grandTotal)}</span> },
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
          <Button size="icon" variant="ghost" onClick={() => setDeletingId(row.id)} title="Delete" className="text-destructive hover:text-destructive">
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

      {/* === New Quotation form — same format as New Purchase === */}
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={form.id ? "Edit Quotation" : "New Quotation"}
        size="full"
        onSubmit={handleSubmit}
        loading={saveMutation.isPending}
        submitLabel={form.id ? "Update" : "Save Quotation"}
        hideFooter
        footer={
          <>
            <div className="mr-auto flex items-center gap-2">
              <Label className="text-xs font-bold text-muted-foreground">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v as "Draft" | "Confirmed" })}
              >
                <SelectTrigger className="h-9 w-40">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Confirmed">Confirmed</SelectItem>
                </SelectContent>
              </Select>
              {saveMutation.isPending && <span className="text-xs text-muted-foreground">Saving…</span>}
            </div>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saveMutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {form.id ? "Update" : "Save Quotation"}
            </Button>
          </>
        }
      >
        {/* === Header section — Company info (left) + Quotation metadata (right) === */}
        <div className="flex items-start justify-between gap-6 rounded-md border border-gray-300 bg-white p-4">
          {/* Left: Company info */}
          <div className="flex-1">
            <div className="text-xl font-bold tracking-tight">
              {company?.name ?? "Company Name"}
            </div>
            {company?.address && (
              <div className="text-xs text-gray-600 mt-1">{company.address}</div>
            )}
            {company?.phone && (
              <div className="text-xs text-gray-600">Phone: {company.phone}</div>
            )}
            {company?.email && (
              <div className="text-xs text-gray-600">Email: {company.email}</div>
            )}
            {company?.website && (
              <div className="text-xs text-gray-600">Website: {company.website}</div>
            )}
          </div>
          {/* Right: Quotation title + metadata */}
          <div className="text-right">
            <div className="text-2xl font-bold uppercase tracking-wider mb-2">
              Quotation
            </div>
            <table className="text-sm">
              <tbody>
                <tr>
                  <td className="text-right pr-2 font-semibold whitespace-nowrap">Quotation No:</td>
                  <td className="text-left">
                    <Input
                      value={form.invoiceNo}
                      onChange={(e) => setForm({ ...form, invoiceNo: e.target.value })}
                      className="h-8 border-0 bg-transparent px-1 text-sm outline-none focus-visible:ring-0"
                    />
                  </td>
                </tr>
                <tr>
                  <td className="text-right pr-2 font-semibold whitespace-nowrap">Date:</td>
                  <td className="text-left">
                    <Input
                      type="date"
                      value={form.quotationDate}
                      onChange={(e) => setForm({ ...form, quotationDate: e.target.value })}
                      className="h-8 border-0 bg-transparent px-1 text-sm outline-none focus-visible:ring-0"
                    />
                  </td>
                </tr>
                <tr>
                  <td className="text-right pr-2 font-semibold whitespace-nowrap">Validity:</td>
                  <td className="text-left">
                    <Input
                      type="date"
                      value={form.validity}
                      onChange={(e) => setForm({ ...form, validity: e.target.value })}
                      className="h-8 border-0 bg-transparent px-1 text-sm outline-none focus-visible:ring-0"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* === Client Details section === */}
        <div className="rounded-md border border-gray-300 bg-white p-3">
          <div className="mb-2 text-sm font-bold uppercase tracking-wide text-purple-700">
            Client Details
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="grid gap-0.5">
              <Label className="text-xs font-semibold">Client Name:</Label>
              <SearchableSelect
                value={form.customerId}
                onValueChange={(v) => setForm({ ...form, customerId: v })}
                options={(customers ?? []).map((s) => ({ value: s.id, label: s.name, hint: s.mobile }))}
                placeholder="Select customer"
                searchPlaceholder="Search customer..."
                emptyText="No customer found."
                allowNone
                noneLabel="— None —"
                compact
              />
            </div>
            <div className="grid gap-0.5">
              <Label className="text-xs font-semibold">Contact:</Label>
              <div className="flex min-h-8 items-center rounded-md border border-dashed bg-muted/30 px-3 py-1 text-sm">
                {(() => {
                  const c = (customers ?? []).find((x) => x.id === form.customerId)
                  return c?.mobile?.trim() ? c.mobile : "—"
                })()}
              </div>
            </div>
            <div className="grid gap-0.5 sm:col-span-2">
              <Label className="text-xs font-semibold">Client Address:</Label>
              <textarea
                rows={2}
                readOnly
                value={(() => {
                  const c = (customers ?? []).find((x) => x.id === form.customerId)
                  return c?.address?.trim() ? c.address : "—"
                })()}
                className="w-full resize-none rounded-md border border-dashed bg-muted/30 px-3 py-1 text-sm outline-none focus:ring-0"
              />
            </div>
          </div>
          {/* Discount + Note inline */}
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="grid gap-0.5">
              <Label className="text-xs font-semibold">Discount Amount:</Label>
              <Input
                type="number"
                value={form.discount}
                onChange={(e) => setForm({ ...form, discount: e.target.value })}
                className="h-8 text-sm"
              />
            </div>
            <div className="grid gap-0.5">
              <Label className="text-xs font-semibold">Note:</Label>
              <Input
                value={form.remarks}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                placeholder="Optional notes"
                className="h-8 text-sm"
              />
            </div>
          </div>
        </div>

        {/* === Line items table — 9 columns + Actions === */}
        <div className="overflow-auto rounded-md border border-gray-300 bg-white">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr style={{ background: "#9DC3E6" }} className="text-black">
                {["Product Name", "Brand", "Model", "Serial", "Condition", "Warranty", "Qty", "Price", "Total", "Actions"].map((h) => (
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
                        onValueChange={(v) => handleItemProductChange(idx, v ?? "")}
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
                      <Select
                        value={it.warranty || "none"}
                        onValueChange={(v) => updateItem(idx, { warranty: v === "none" ? "" : v })}
                      >
                        <SelectTrigger className="h-8 min-w-[90px] border-0 bg-transparent px-1 text-xs focus:ring-0">
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">—</SelectItem>
                          {(warranties ?? []).map((w) => (
                            <SelectItem key={w.id} value={w.name}>{w.name}</SelectItem>
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
                <td colSpan={8} className="border border-gray-300 px-3 py-2 text-right font-bold">Total Amount:</td>
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
      </FormDialog>

      {/* === View dialog === */}
      <FormDialog
        open={!!viewing}
        onOpenChange={(o) => !o && setViewing(null)}
        title={`Quotation ${viewing?.invoiceNo ?? ""}`}
        size="full"
        hideFooter
        footer={<Button variant="outline" onClick={() => setViewing(null)}>Close</Button>}
      >
        {viewing && (
          <div className="flex flex-col gap-3">
            <div className="rounded-md border border-gray-300 bg-white">
              <table className="w-full border-collapse text-sm">
                <tbody>
                  <tr>
                    <td className="border border-gray-300 bg-gray-100 px-3 py-1.5 font-semibold whitespace-nowrap">Quotation Date:</td>
                    <td className="border border-gray-300 px-2 py-1.5">{fmtDMY(viewing.quotationDate)}</td>
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
                    <td className="border border-gray-300 bg-gray-100 px-3 py-1.5 font-semibold whitespace-nowrap align-top">Customer Address:</td>
                    <td className="border border-gray-300 px-2 py-1.5 align-top">{viewing.customer?.address?.trim() ? viewing.customer.address : "—"}</td>
                    <td className="border border-gray-300 bg-gray-100 px-3 py-1.5 font-semibold whitespace-nowrap align-top">Note:</td>
                    <td className="border border-gray-300 px-2 py-1.5 align-top">{viewing.remarks ?? "—"}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="overflow-auto rounded-md border border-gray-300 bg-white">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr style={{ background: "#9DC3E6" }} className="text-black">
                    {["Product Name", "Brand", "Model", "Serial", "Condition", "Warranty", "Qty", "Price", "Total"].map((h) => (
                      <th key={h} className="border border-gray-400 px-2 py-1.5 text-center font-bold whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(viewing.items ?? []).length === 0 ? (
                    <tr><td colSpan={9} className="border border-gray-300 px-3 py-6 text-center text-muted-foreground">No line items.</td></tr>
                  ) : (
                    (viewing.items ?? []).map((it, idx) => (
                      <tr key={it.id ?? idx} className="bg-white">
                        <td className="border border-gray-300 px-2 py-1 font-medium">{it.product?.name ?? "—"}</td>
                        <td className="border border-gray-300 px-2 py-1">{it.brand ?? "—"}</td>
                        <td className="border border-gray-300 px-2 py-1">{it.model ?? "—"}</td>
                        <td className="border border-gray-300 px-2 py-1 font-mono">{it.serial ?? "—"}</td>
                        <td className="border border-gray-300 px-2 py-1 text-center">{it.condition ?? "—"}</td>
                        <td className="border border-gray-300 px-2 py-1 text-center">{it.warrantyText ?? "—"}</td>
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
                      <td colSpan={8} className="border border-gray-300 px-3 py-2 text-right font-bold">Total Amount:</td>
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
        title="Delete quotation?"
        description="This will permanently delete the quotation and its line items."
        loading={deleteMutation.isPending}
        onConfirm={() => deletingId && deleteMutation.mutate(deletingId)}
      />
    </div>
  )
}
