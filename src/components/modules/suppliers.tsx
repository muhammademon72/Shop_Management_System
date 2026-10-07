"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Pencil, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { DataTable, type Column } from "@/components/data-table"
import { FormDialog } from "@/components/form-dialog"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { StatusBadge } from "@/components/status-badge"
import { PageHeader } from "@/components/page-header"
import type { Supplier } from "@/lib/types"

const empty = (): Partial<Supplier> => ({
  name: "",
  mobile: "",
  address: "",
  status: "Active",
})

export function SuppliersModule() {
  const qc = useQueryClient()
  const [search, setSearch] = React.useState("")
  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Partial<Supplier> | null>(null)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  const { data, isLoading } = useQuery<Supplier[]>({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const res = await fetch("/api/suppliers")
      if (!res.ok) throw new Error("Failed")
      return res.json()
    },
  })

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<Supplier>) => {
      const isEdit = !!data.id
      const res = await fetch("/api/suppliers", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error("Save failed")
      return res.json()
    },
    onSuccess: () => {
      toast.success("Supplier saved successfully")
      qc.invalidateQueries({ queryKey: ["suppliers"] })
      qc.invalidateQueries({ queryKey: ["stats"] })
      setOpen(false)
      setEditing(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/suppliers?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Delete failed")
      return res.json()
    },
    onSuccess: () => {
      toast.success("Supplier deleted")
      qc.invalidateQueries({ queryKey: ["suppliers"] })
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
      (c) =>
        c.name.toLowerCase().includes(s) ||
        c.mobile.toLowerCase().includes(s) ||
        (c.address ?? "").toLowerCase().includes(s)
    )
  }, [data, search])

  const handleAdd = () => {
    setEditing(empty())
    setOpen(true)
  }
  const handleEdit = (row: Supplier) => {
    setEditing({ ...row })
    setOpen(true)
  }
  const handleSubmit = () => {
    if (!editing) return
    if (!editing.name?.trim()) {
      toast.error("Name is required")
      return
    }
    saveMutation.mutate(editing)
  }

  const columns: Column<Supplier>[] = [
    {
      key: "name",
      header: "Name",
      cell: (row) => <span className="font-medium">{row.name}</span>,
    },
    { key: "mobile", header: "Mobile", cell: (row) => row.mobile },
    {
      key: "address",
      header: "Address",
      cell: (row) => (
        <span className="text-muted-foreground max-w-xs truncate">
          {row.address ?? "—"}
        </span>
      ),
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
        title="Suppliers"
        description="Manage supplier information."
        actions={
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4" /> Add Supplier
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
        searchPlaceholder="Search suppliers..."
        headerRowClassName="bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-700 hover:from-emerald-500 hover:via-emerald-600 hover:to-teal-700 [&>th]:text-white [&>th]:font-bold"
      />

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing?.id ? "Edit Supplier" : "Add Supplier"}
        onSubmit={handleSubmit}
        loading={saveMutation.isPending}
        submitLabel={editing?.id ? "Update" : "Create"}
      >
        <div className="grid gap-2">
          <Label>Name</Label>
          <Input
            value={editing?.name ?? ""}
            onChange={(e) => setEditing({ ...editing!, name: e.target.value })}
            placeholder="Supplier name"
          />
        </div>
        <div className="grid gap-2">
          <Label>Mobile</Label>
          <Input
            value={editing?.mobile ?? ""}
            onChange={(e) => setEditing({ ...editing!, mobile: e.target.value })}
            placeholder="+1..."
          />
        </div>
        <div className="grid gap-2">
          <Label>Address</Label>
          <Textarea
            value={editing?.address ?? ""}
            onChange={(e) => setEditing({ ...editing!, address: e.target.value })}
            placeholder="Full address"
            rows={2}
          />
        </div>
        <div className="flex items-center justify-between rounded-md border p-3">
          <div className="flex flex-col">
            <Label className="text-sm font-medium">Status</Label>
            <span className="text-muted-foreground text-xs">
              Toggle to enable or disable this supplier
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
        title="Delete supplier?"
        description="This will permanently delete the supplier."
        loading={deleteMutation.isPending}
        onConfirm={() => deletingId && deleteMutation.mutate(deletingId)}
      />
    </div>
  )
}
