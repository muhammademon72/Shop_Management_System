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
import { Badge } from "@/components/ui/badge"
import type { AppUser } from "@/lib/types"

type UserRow = Omit<AppUser, "password">

interface FormState {
  id?: string
  name: string
  email: string
  mobile: string
  role: string
  status: string
  password: string
}

const empty = (): FormState => ({
  name: "",
  email: "",
  mobile: "",
  role: "Staff",
  status: "Active",
  password: "",
})

const roleVariant: Record<string, "default" | "secondary" | "outline"> = {
  Admin: "default",
  Manager: "secondary",
  Staff: "outline",
}

export function UsersModule() {
  const qc = useQueryClient()
  const [search, setSearch] = React.useState("")
  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<FormState | null>(null)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  const { data, isLoading } = useQuery<UserRow[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users")
      if (!res.ok) throw new Error("Failed")
      return res.json()
    },
  })

  const saveMutation = useMutation({
    mutationFn: async (data: FormState) => {
      const isEdit = !!data.id
      const payload: Record<string, unknown> = {
        name: data.name,
        email: data.email,
        mobile: data.mobile,
        role: data.role,
        status: data.status,
      }
      if (!isEdit) {
        payload.password = data.password || "password"
      } else if (data.password) {
        payload.password = data.password
      }
      const res = await fetch("/api/users", {
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
      toast.success("User saved successfully")
      qc.invalidateQueries({ queryKey: ["users"] })
      setOpen(false)
      setEditing(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/users?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Delete failed")
      return res.json()
    },
    onSuccess: () => {
      toast.success("User deleted")
      qc.invalidateQueries({ queryKey: ["users"] })
      setDeletingId(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const rows = React.useMemo(() => {
    const list = data ?? []
    if (!search) return list
    const s = search.toLowerCase()
    return list.filter(
      (u) =>
        u.name.toLowerCase().includes(s) ||
        u.email.toLowerCase().includes(s) ||
        u.role.toLowerCase().includes(s)
    )
  }, [data, search])

  const handleAdd = () => {
    setEditing(empty())
    setOpen(true)
  }
  const handleEdit = (row: UserRow) => {
    setEditing({
      id: row.id,
      name: row.name,
      email: row.email,
      mobile: row.mobile ?? "",
      role: row.role,
      status: row.status,
      password: "",
    })
    setOpen(true)
  }
  const handleSubmit = () => {
    if (!editing) return
    if (!editing.name.trim() || !editing.email.trim()) {
      toast.error("Name and email are required")
      return
    }
    if (!editing.id && !editing.password.trim()) {
      toast.error("Password is required for new users")
      return
    }
    saveMutation.mutate(editing)
  }

  const columns: Column<UserRow>[] = [
    {
      key: "name",
      header: "Name",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <div className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold">
            {row.name.slice(0, 2).toUpperCase()}
          </div>
          <span className="font-medium">{row.name}</span>
        </div>
      ),
    },
    { key: "email", header: "Email", cell: (row) => row.email },
    { key: "mobile", header: "Mobile", cell: (row) => row.mobile ?? "—" },
    {
      key: "role",
      header: "Role",
      cell: (row) => (
        <Badge variant={roleVariant[row.role] ?? "outline"}>{row.role}</Badge>
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
        title="User Management"
        description="Manage system users and their roles."
        actions={
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4" /> Add User
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
        searchPlaceholder="Search users..."
      />

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing?.id ? "Edit User" : "Add User"}
        size="lg"
        onSubmit={handleSubmit}
        loading={saveMutation.isPending}
        submitLabel={editing?.id ? "Update" : "Create"}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>Name</Label>
            <Input
              value={editing?.name ?? ""}
              onChange={(e) => setEditing({ ...editing!, name: e.target.value })}
              placeholder="Full name"
            />
          </div>
          <div className="grid gap-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={editing?.email ?? ""}
              onChange={(e) => setEditing({ ...editing!, email: e.target.value })}
              placeholder="user@example.com"
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
            <Label>Role</Label>
            <Select
              value={editing?.role ?? "Staff"}
              onValueChange={(v) => setEditing({ ...editing!, role: v })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Admin">Admin</SelectItem>
                <SelectItem value="Manager">Manager</SelectItem>
                <SelectItem value="Staff">Staff</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label>
              Password{" "}
              {editing?.id && (
                <span className="text-muted-foreground text-xs">
                  (leave blank to keep current password)
                </span>
              )}
            </Label>
            <Input
              type="password"
              value={editing?.password ?? ""}
              onChange={(e) => setEditing({ ...editing!, password: e.target.value })}
              placeholder={editing?.id ? "••••••••" : "Set password"}
            />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-md border p-3">
          <div className="flex flex-col">
            <Label className="text-sm font-medium">Status</Label>
            <span className="text-muted-foreground text-xs">
              Toggle to enable or disable this user
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
        title="Delete user?"
        description="This will permanently delete the user account."
        loading={deleteMutation.isPending}
        onConfirm={() => deletingId && deleteMutation.mutate(deletingId)}
      />
    </div>
  )
}
