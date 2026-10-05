"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Pencil, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import type { InventoryStock, Product, Uom } from "@/lib/types"
import { formatDate, toInputDate } from "@/lib/format"

interface FormState {
  id?: string
  date: string
  invoice: string
  productId: string | null
  brand: string
  model: string
  serial: string
  qty: string
  uom: string
  remarks: string
}

const empty = (): FormState => ({
  date: toInputDate(new Date()),
  invoice: "",
  productId: null,
  brand: "",
  model: "",
  serial: "",
  qty: "1",
  uom: "",
  remarks: "",
})

export function InventoryModule() {
  const qc = useQueryClient()
  const [search, setSearch] = React.useState("")
  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<FormState | null>(null)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  const { data, isLoading } = useQuery<InventoryStock[]>({
    queryKey: ["inventory"],
    queryFn: async () => {
      const res = await fetch("/api/inventory")
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

  const { data: uoms } = useQuery<Uom[]>({
    queryKey: ["uoms"],
    queryFn: async () => {
      const res = await fetch("/api/uoms")
      if (!res.ok) throw new Error("Failed")
      return res.json()
    },
  })

  const saveMutation = useMutation({
    mutationFn: async (data: FormState) => {
      const payload = {
        id: data.id,
        date: data.date,
        invoice: data.invoice,
        productId: data.productId || null,
        brand: data.brand,
        model: data.model,
        serial: data.serial,
        qty: Number(data.qty) || 0,
        uom: data.uom,
        remarks: data.remarks,
      }
      const isEdit = !!data.id
      const res = await fetch("/api/inventory", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("Save failed")
      return res.json()
    },
    onSuccess: () => {
      toast.success("Inventory record saved")
      qc.invalidateQueries({ queryKey: ["inventory"] })
      qc.invalidateQueries({ queryKey: ["stats"] })
      setOpen(false)
      setEditing(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/inventory?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Delete failed")
      return res.json()
    },
    onSuccess: () => {
      toast.success("Inventory record deleted")
      qc.invalidateQueries({ queryKey: ["inventory"] })
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
      (i) =>
        i.invoice.toLowerCase().includes(s) ||
        i.brand?.toLowerCase().includes(s) ||
        i.model?.toLowerCase().includes(s) ||
        i.serial?.toLowerCase().includes(s) ||
        i.product?.name.toLowerCase().includes(s)
    )
  }, [data, search])

  const handleAdd = () => {
    setEditing(empty())
    setOpen(true)
  }
  const handleEdit = (row: InventoryStock) => {
    setEditing({
      id: row.id,
      date: toInputDate(row.date),
      invoice: row.invoice,
      productId: row.productId,
      brand: row.brand ?? "",
      model: row.model ?? "",
      serial: row.serial ?? "",
      qty: String(row.qty),
      uom: row.uom ?? "",
      remarks: row.remarks ?? "",
    })
    setOpen(true)
  }
  const handleSubmit = () => {
    if (!editing) return
    if (!editing.invoice.trim()) {
      toast.error("Invoice is required")
      return
    }
    saveMutation.mutate(editing)
  }

  const handleProductChange = (pid: string) => {
    if (!editing) return
    const product = (products ?? []).find((p) => p.id === pid)
    setEditing({
      ...editing,
      productId: pid || null,
      brand: product?.brand?.name ?? editing.brand,
      model: product?.model ?? editing.model,
      serial: product?.serial ?? editing.serial,
      uom: product?.uom?.name ?? editing.uom,
    })
  }

  const columns: Column<InventoryStock>[] = [
    {
      key: "date",
      header: "Date",
      cell: (row) => (
        <span className="text-muted-foreground">{formatDate(row.date)}</span>
      ),
    },
    { key: "invoice", header: "Invoice", cell: (row) => row.invoice },
    {
      key: "product",
      header: "Product",
      cell: (row) => row.product?.name ?? "—",
    },
    { key: "brand", header: "Brand", cell: (row) => row.brand ?? "—" },
    { key: "model", header: "Model", cell: (row) => row.model ?? "—" },
    { key: "serial", header: "Serial", cell: (row) => row.serial ?? "—" },
    {
      key: "qty",
      header: "Qty",
      cell: (row) => (
        <span className="font-medium">{row.qty}</span>
      ),
    },
    { key: "uom", header: "UOM", cell: (row) => row.uom ?? row.product?.uom?.name ?? "—" },
    {
      key: "remarks",
      header: "Remarks",
      cell: (row) => (
        <span className="text-muted-foreground max-w-xs truncate">
          {row.remarks ?? "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row) => (
        <div className="flex items-center gap-1">
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
        title="Inventory Stock"
        description="Track stock movements and current inventory."
        actions={
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4" /> Add Stock
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
        searchPlaceholder="Search inventory..."
        headerRowClassName="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 hover:from-blue-700 hover:via-blue-800 hover:to-indigo-900 [&>th]:text-white [&>th]:font-bold"
      />

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing?.id ? "Edit Stock" : "Add Stock"}
        size="lg"
        onSubmit={handleSubmit}
        loading={saveMutation.isPending}
        submitLabel={editing?.id ? "Update" : "Create"}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={editing?.date ?? ""}
              onChange={(e) =>
                setEditing({ ...editing!, date: e.target.value })
              }
            />
          </div>
          <div className="grid gap-2">
            <Label>Invoice</Label>
            <Input
              value={editing?.invoice ?? ""}
              onChange={(e) =>
                setEditing({ ...editing!, invoice: e.target.value })
              }
              placeholder="INV-001"
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label>Product</Label>
            <Select
              value={editing?.productId ?? "none"}
              onValueChange={handleProductChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select product" />
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
          </div>
          <div className="grid gap-2">
            <Label>Brand</Label>
            <Input
              value={editing?.brand ?? ""}
              onChange={(e) =>
                setEditing({ ...editing!, brand: e.target.value })
              }
            />
          </div>
          <div className="grid gap-2">
            <Label>Model</Label>
            <Input
              value={editing?.model ?? ""}
              onChange={(e) =>
                setEditing({ ...editing!, model: e.target.value })
              }
            />
          </div>
          <div className="grid gap-2">
            <Label>Serial</Label>
            <Input
              value={editing?.serial ?? ""}
              onChange={(e) =>
                setEditing({ ...editing!, serial: e.target.value })
              }
            />
          </div>
          <div className="grid gap-2">
            <Label>Qty</Label>
            <Input
              type="number"
              value={editing?.qty ?? ""}
              onChange={(e) =>
                setEditing({ ...editing!, qty: e.target.value })
              }
            />
          </div>
          <div className="grid gap-2">
            <Label>UOM</Label>
            <Select
              value={editing?.uom || "none"}
              onValueChange={(v) =>
                setEditing({
                  ...editing!,
                  uom: v === "none" ? "" : v,
                })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select UOM" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— None —</SelectItem>
                {(uoms ?? []).map((u) => (
                  <SelectItem key={u.id} value={u.name}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label>Remarks</Label>
            <Textarea
              value={editing?.remarks ?? ""}
              onChange={(e) =>
                setEditing({ ...editing!, remarks: e.target.value })
              }
              rows={2}
            />
          </div>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={!!deletingId}
        onOpenChange={(o) => !o && setDeletingId(null)}
        title="Delete inventory record?"
        description="This will permanently delete the record."
        loading={deleteMutation.isPending}
        onConfirm={() => deletingId && deleteMutation.mutate(deletingId)}
      />
    </div>
  )
}
