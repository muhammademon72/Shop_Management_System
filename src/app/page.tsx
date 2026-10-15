"use client"

import { useAuthStore } from "@/lib/auth-store"
import { LoginModule } from "@/components/modules/login"
import { AppShell } from "@/components/app-shell"

export default function Home() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  if (!isAuthenticated) {
    return <LoginModule />
  }

  return <AppShell />
}
