"use client"

import * as React from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Download, Upload, DatabaseBackup, Loader2, FileJson } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/page-header"
import { ConfirmDialog } from "@/components/confirm-dialog"

export function BackupRestoreModule() {
  const qc = useQueryClient()
  const fileRef = React.useRef<HTMLInputElement>(null)
  const [pendingImport, setPendingImport] = React.useState<unknown>(null)
  const [confirmOpen, setConfirmOpen] = React.useState(false)

  const exportMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/backup")
      if (!res.ok) throw new Error("Export failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `shop-backup-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    },
    onSuccess: () => toast.success("Backup exported successfully"),
    onError: (e: Error) => toast.error(e.message),
  })

  const importMutation = useMutation({
    mutationFn: async (data: unknown) => {
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Import failed")
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success("Backup restored successfully")
      setConfirmOpen(false)
      setPendingImport(null)
      qc.invalidateQueries()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      setPendingImport(data)
      setConfirmOpen(true)
    } catch {
      toast.error("Invalid backup file")
    }
    // reset
    e.target.value = ""
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Backup & Restore"
        description="Export the full database as JSON, or restore from a backup file."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="py-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Download className="h-4 w-4" /> Export Backup
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-muted-foreground text-sm">
              Download a JSON file containing all tables (categories, brands,
              products, suppliers, purchases, inventory, customers, quotations,
              sells, company, users).
            </p>
            <Button
              onClick={() => exportMutation.mutate()}
              disabled={exportMutation.isPending}
            >
              {exportMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Export Backup
            </Button>
          </CardContent>
        </Card>

        <Card className="py-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="h-4 w-4" /> Import Backup
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-muted-foreground text-sm">
              Restore all tables from a previously exported JSON file. This will
              <span className="text-destructive font-medium"> overwrite</span>{" "}
              all current data.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleFile}
            />
            <Button
              variant="outline"
              onClick={() => fileRef.current?.click()}
              disabled={importMutation.isPending}
            >
              <Upload className="mr-2 h-4 w-4" /> Choose backup file
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 py-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <DatabaseBackup className="h-4 w-4" /> Backup Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground text-xs">Format</div>
                <div className="flex items-center gap-1 font-medium">
                  <FileJson className="h-4 w-4" /> JSON
                </div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground text-xs">Tables</div>
                <div className="font-medium">12</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground text-xs">Storage</div>
                <div className="font-medium">SQLite</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground text-xs">Mode</div>
                <div className="font-medium">Full Replace</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(o) => {
          setConfirmOpen(o)
          if (!o) setPendingImport(null)
        }}
        title="Restore from backup?"
        description="This will permanently overwrite all current data in the database with the contents of the backup file. Are you sure?"
        confirmLabel="Restore"
        loading={importMutation.isPending}
        onConfirm={() =>
          pendingImport !== null && importMutation.mutate(pendingImport)
        }
      />
    </div>
  )
}
