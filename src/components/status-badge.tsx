"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface StatusBadgeProps {
  status?: string | null
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const active = (status || "Active").toLowerCase() === "active"
  return (
    <Badge
      variant="outline"
      className={cn(
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
          : "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300",
        className
      )}
    >
      <span
        className={cn(
          "mr-1 inline-block h-1.5 w-1.5 rounded-full",
          active ? "bg-emerald-500" : "bg-zinc-400"
        )}
      />
      {active ? "Active" : "Inactive"}
    </Badge>
  )
}
