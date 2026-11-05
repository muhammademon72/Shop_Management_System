"use client"

import { useAuthStore } from "@/lib/auth-store"
import { LoginModule } from "@/components/modules/login"
import { AppShell } from "@/components/app-shell"

// Deploy marker — forces z.ai to rebuild when this changes
export const DEPLOY_VERSION = "2026-11-01-v1"

export default function Home() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  if (!isAuthenticated) {
    return <LoginModule />
  }

  return <AppShell />
}
