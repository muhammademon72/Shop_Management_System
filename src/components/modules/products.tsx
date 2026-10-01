"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Pencil, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
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
import { StatusBadge } from "@/components/status-badge"
import { PageHeader } from "@/components/page-header"
import type { Product, Category, Brand, Uom } from "@/lib/types"

const empty = (): Partial<Product> => ({
  name: "",
  categoryId: null,
  brandId: null,
  uomId: null,
  model: "",
  serial: "",
  status: "Active",
})

export function ProductsModule() {
  const qc = useQueryClient()
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Partial<Product> | null>(null)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  const { data, isLoading } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      const res = await fetch("/api/products")
      if (!res.ok) throw new Error("Failed")
      return res.json()
    },
  })

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories")
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

  const { data: uoms } = useQuery<Uom[]>({
    queryKey: ["uoms"],
    queryFn: async () => {
      const res = await fetch("/api/uoms")
      if (!res.ok) throw new Error("Failed")
      return res.json()
    },
  })

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<Product>) => {
      const isEdit = !!data.id
      const res = await fetch("/api/products", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error("Save failed")
      return res.json()
    },
    onSuccess: () => {
      toast.success("Product saved successfully")
      qc.invalidateQueries({ queryKey: ["products"] })
      qc.invalidateQueries({ queryKey: ["stats"] })
      setOpen(false)
      setEditing(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/products?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Delete failed")
      return res.json()
    },
    onSuccess: () => {
      toast.success("Product deleted")
      qc.invalidateQueries({ queryKey: ["products"] })
      qc.invalidateQueries({ queryKey: ["stats"] })
      setDeletingId(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const rows = React.useMemo(() => {
    const list = data ?? []
    const s = search.toLowerCase()
    return list.filter((p) => {
      const matchSearch =
        !s ||
        p.name.toLowerCase().includes(s) ||
        (p.model ?? "").toLowerCase().includes(s) ||
        (p.serial ?? "").toLowerCase().includes(s)
      const matchStatus =
        statusFilter === "all" || p.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [data, search, statusFilter])

  const handleAdd = () => {
    setEditing(empty())
    setOpen(true)
  }
  const handleEdit = (row: Product) => {
    setEditing({ ...row })
    setOpen(true)
  }
  const handleSubmit = () => {
    if (!editing) return
    if (!editing.name?.trim()) {
      toast.error("Product name is required")
      return
    }
    saveMutation.mutate(editing)
  }

  const columns: Column<Product>[] = [
    {
      key: "name",
      header: "Product Name",
      cell: (row) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.name}</span>
          {row.model && (
            <span className="text-muted-foreground text-xs">
              Model: {row.model}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      cell: (row) => row.category?.name ?? "—",
    },
    {
      key: "brand",
      header: "Brand",
      cell: (row) => row.brand?.name ?? "—",
    },
    {
      key: "uom",
      header: "UOM",
      cell: (row) => row.uom?.name ?? "—",
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
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
        title="Products"
        description="Manage your product catalog with categories, brands, and UOMs."
        actions={
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4" /> Add Product
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
        searchPlaceholder="Search products..."
        toolbar={
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing?.id ? "Edit Product" : "Add Product"}
        size="lg"
        onSubmit={handleSubmit}
        loading={saveMutation.isPending}
        submitLabel={editing?.id ? "Update" : "Create"}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>Product Name</Label>
            <Input
              value={editing?.name ?? ""}
              onChange={(e) => setEditing({ ...editing!, name: e.target.value })}
              placeholder="e.g. Samsung TV 55"
            />
          </div>
          <div className="grid gap-2">
            <Label>Category</Label>
            <Select
              value={editing?.categoryId ?? "none"}
              onValueChange={(v) =>
                setEditing({ ...editing!, categoryId: v === "none" ? null : v })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— None —</SelectItem>
                {(categories ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Brand</Label>
            <Select
              value={editing?.brandId ?? "none"}
              onValueChange={(v) =>
                setEditing({ ...editing!, brandId: v === "none" ? null : v })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select brand" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— None —</SelectItem>
                {(brands ?? []).map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>UOM</Label>
            <Select
              value={editing?.uomId ?? "none"}
              onValueChange={(v) =>
                setEditing({ ...editing!, uomId: v === "none" ? null : v })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select UOM" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— None —</SelectItem>
                {(uoms ?? []).map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Model</Label>
            <Input
              value={editing?.model ?? ""}
              onChange={(e) => setEditing({ ...editing!, model: e.target.value })}
              placeholder="e.g. UA55TU8000"
            />
          </div>
          <div className="grid gap-2">
            <Label>Serial</Label>
            <Input
              value={editing?.serial ?? ""}
              onChange={(e) => setEditing({ ...editing!, serial: e.target.value })}
              placeholder="Serial number"
            />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-md border p-3">
          <div className="flex flex-col">
            <Label className="text-sm font-medium">Status</Label>
            <span className="text-muted-foreground text-xs">
              Toggle to enable or disable this product
            </span>
          </div>
          <Switch
            checked={(editing?.status ?? "Active") === "Active"}
            onCheckedChange={(c) =>
              setEditing({ ...editing!, status: c ? "Active" : "Inactive" })
            }
          />
        </div>
      </FormDialog>

      <ConfirmDialog
        open={!!deletingId}
        onOpenChange={(o) => !o && setDeletingId(null)}
        title="Delete product?"
        description="This will permanently delete the product."
        loading={deleteMutation.isPending}
        onConfirm={() => deletingId && deleteMutation.mutate(deletingId)}
      />
    </div>
  )
}
