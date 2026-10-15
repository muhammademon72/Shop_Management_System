"use client"

import * as React from "react"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { Store, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuthStore } from "@/lib/auth-store"

export function LoginModule() {
  const login = useAuthStore((s) => s.login)
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")

  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || "Login failed")
      return result
    },
    onSuccess: (data) => {
      login(data.user, data.token)
      toast.success(`Welcome, ${data.user.name}!`)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      toast.error("Email and password are required")
      return
    }
    loginMutation.mutate({ email, password })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30">
      <div className="w-full max-w-md">
        <div className="rounded-lg border bg-card p-8 shadow-lg">
          {/* Logo */}
          <div className="mb-6 flex flex-col items-center gap-2">
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <Store className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Shop Management</h1>
            <p className="text-sm text-muted-foreground">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <Button
              type="submit"
              disabled={loginMutation.isPending}
              className="mt-2 bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="mt-6 rounded-md bg-muted/50 p-3 text-center text-xs text-muted-foreground">
            <p>Default admin: admin@shop.com / admin123</p>
          </div>
        </div>
      </div>
    </div>
  )
}
