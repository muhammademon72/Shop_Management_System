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
import type { Category } from "@/lib/types"

const empty = (): Partial<Category> => ({
  name: "",
  type: "Goods",
  status: "Active",
})

export function CategoriesModule() {
  const qc = useQueryClient()
  const [search, setSearch] = React.useState("")
  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Partial<Category> | null>(null)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  const { data, isLoading } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories")
      if (!res.ok) throw new Error("Failed")
      return res.json()
    },
  })

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<Category>) => {
      const isEdit = !!data.id
      const res = await fetch("/api/categories", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error("Save failed")
      return res.json()
    },
    onSuccess: () => {
      toast.success("Category saved successfully")
      qc.invalidateQueries({ queryKey: ["categories"] })
      qc.invalidateQueries({ queryKey: ["stats"] })
      setOpen(false)
      setEditing(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/categories?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Delete failed")
      return res.json()
    },
    onSuccess: () => {
      toast.success("Category deleted")
      qc.invalidateQueries({ queryKey: ["categories"] })
      qc.invalidateQueries({ queryKey: ["stats"] })
      setDeletingId(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const rows = React.useMemo(() => {
    const list = data ?? []
    if (!search) return list
    const s = search.toLowerCase()
    return list.filter((c) => c.name.toLowerCase().includes(s) || c.type.toLowerCase().includes(s))
  }, [data, search])

  const handleAdd = () => {
    setEditing(empty())
    setOpen(true)
  }
  const handleEdit = (row: Category) => {
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

  const columns: Column<Category>[] = [
    {
      key: "name",
      header: "Name",
      cell: (row) => <span className="font-medium">{row.name}</span>,
    },
    { key: "type", header: "Type", cell: (row) => row.type },
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
          <Button
            size="icon"
            variant="ghost"
            onClick={() => handleEdit(row)}
            title="Edit"
          >
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
        title="Categories"
        description="Manage product categories and their types."
        actions={
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4" /> Add Category
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
        searchPlaceholder="Search categories..."
        headerRowClassName="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 hover:from-blue-700 hover:via-blue-800 hover:to-indigo-900 [&>th]:text-white [&>th]:font-bold"
      />

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing?.id ? "Edit Category" : "Add Category"}
        description="Set a name, type and status for the category."
        onSubmit={handleSubmit}
        loading={saveMutation.isPending}
        submitLabel={editing?.id ? "Update" : "Create"}
      >
        <div className="grid gap-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={editing?.name ?? ""}
            onChange={(e) => setEditing({ ...editing!, name: e.target.value })}
            placeholder="e.g. Electronics"
          />
        </div>
        <div className="grid gap-2">
          <Label>Type</Label>
          <Select
            value={editing?.type ?? "Goods"}
            onValueChange={(v) => setEditing({ ...editing!, type: v })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Goods">Goods</SelectItem>
              <SelectItem value="Service">Service</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between rounded-md border p-3">
          <div className="flex flex-col">
            <Label className="text-sm font-medium">Status</Label>
            <span className="text-muted-foreground text-xs">
              Toggle to enable or disable this category
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
        title="Delete category?"
        description="This will permanently delete the category. Products linked to it will keep their reference but lose relation data."
        loading={deleteMutation.isPending}
        onConfirm={() => deletingId && deleteMutation.mutate(deletingId)}
      />
    </div>
  )
}
