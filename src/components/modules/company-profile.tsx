"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Save, Building2, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/page-header"
import { LogoAttach } from "@/components/logo-attach"
import type { CompanyProfile } from "@/lib/types"

interface FormState {
  id?: string
  name: string
  address: string
  phone: string
  email: string
  website: string
  vatNo: string
  logo: string
}

const emptyForm = (): FormState => ({
  name: "",
  address: "",
  phone: "",
  email: "",
  website: "",
  vatNo: "",
  logo: "",
})

export function CompanyProfileModule() {
  const qc = useQueryClient()
  const [form, setForm] = React.useState<FormState>(emptyForm())

  const { data, isLoading } = useQuery<CompanyProfile | null>({
    queryKey: ["company"],
    queryFn: async () => {
      const res = await fetch("/api/company", { cache: "no-store" })
      if (!res.ok) throw new Error("Failed")
      return res.json()
    },
  })

  React.useEffect(() => {
    if (data) {
      setForm({
        id: data.id,
        name: data.name ?? "",
        address: data.address ?? "",
        phone: data.phone ?? "",
        email: data.email ?? "",
        website: data.website ?? "",
        vatNo: data.vatNo ?? "",
        logo: data.logo ?? "",
      })
    }
  }, [data])

  const saveMutation = useMutation({
    mutationFn: async (data: FormState) => {
      const res = await fetch("/api/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error("Save failed")
      return res.json()
    },
    onSuccess: () => {
      toast.success("Company profile saved")
      qc.invalidateQueries({ queryKey: ["company"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast.error("Company name is required")
      return
    }
    saveMutation.mutate(form)
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Company Profile"
        description="Update your business information used across documents."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 py-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Business Details</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="grid gap-2 sm:col-span-2">
                  <Label>Company Name</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Acme Electronics LLC"
                  />
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <Label>Address</Label>
                  <Textarea
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    rows={2}
                    placeholder="Full address"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Phone</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+1..."
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="info@company.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Website</Label>
                  <Input
                    value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                    placeholder="https://company.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>VAT No</Label>
                  <Input
                    value={form.vatNo}
                    onChange={(e) => setForm({ ...form, vatNo: e.target.value })}
                    placeholder="VAT12345"
                  />
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <Label>Logo URL</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={form.logo}
                      onChange={(e) => setForm({ ...form, logo: e.target.value })}
                      placeholder="https://.../logo.png — or click Attach to upload"
                      className="flex-1"
                    />
                    <LogoAttach
                      value={form.logo}
                      onChange={(url) => setForm({ ...form, logo: url })}
                      maxSizeBytes={2 * 1024 * 1024}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    PNG / JPG / WebP / GIF / SVG — max 2 MB.
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <Button type="submit" disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save Profile
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <Card className="py-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex h-16 w-16 items-center justify-center rounded-full">
                {form.logo ? (
                  <img
                    src={form.logo}
                    alt="logo"
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <Building2 className="h-8 w-8" />
                )}
              </div>
              <div>
                <div className="text-base font-semibold">
                  {form.name || "Your Company Name"}
                </div>
                <div className="text-muted-foreground text-xs">
                  {form.address || "Company address goes here"}
                </div>
              </div>
              <div className="text-muted-foreground text-xs">
                {form.phone && <div>Tel: {form.phone}</div>}
                {form.email && <div>Email: {form.email}</div>}
                {form.website && <div>Web: {form.website}</div>}
                {form.vatNo && <div>VAT: {form.vatNo}</div>}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
