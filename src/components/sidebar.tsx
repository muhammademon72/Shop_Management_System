"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  ShoppingCart,
  Settings,
  Boxes,
  Tag,
  Ruler,
  PackageSearch,
  Truck,
  ClipboardList,
  Warehouse,
  FileText,
  ReceiptText,
  Users,
  Building2,
  UserCog,
  DatabaseBackup,
  Store,
  ShieldCheck,
  Clock,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { useAppStore, type ModuleId } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

interface NavItem {
  id: ModuleId
  label: string
  icon: React.ComponentType<{ className?: string }>
}

interface NavGroup {
  group: string
  items: NavItem[]
}

const NAV: NavGroup[] = [
  {
    group: "Dashboard",
    items: [{ id: "dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    group: "Product Manage",
    items: [
      { id: "categories", label: "Categories List", icon: Tag },
      { id: "brands", label: "Brand List", icon: Boxes },
      { id: "uoms", label: "UOM List", icon: Ruler },
      { id: "products", label: "Product List", icon: PackageSearch },
      { id: "conditions", label: "Condition List", icon: ShieldCheck },
      { id: "warranties", label: "Warranty List", icon: Clock },
    ],
  },
  {
    group: "Purchase Manage",
    items: [
      { id: "purchases", label: "Purchase List", icon: ShoppingCart },
      { id: "suppliers", label: "Suppliers List", icon: Truck },
      { id: "inventory", label: "Inventory Stock", icon: Warehouse },
    ],
  },
  {
    group: "Sell Manage",
    items: [
      { id: "quotations", label: "Quotation List", icon: FileText },
      { id: "sells", label: "Sell List", icon: ReceiptText },
      { id: "customers", label: "Customer List", icon: Users },
    ],
  },
  {
    group: "Settings Manage",
    items: [
      { id: "company", label: "Company Profile", icon: Building2 },
      { id: "users", label: "User Manage", icon: UserCog },
      { id: "backup", label: "Backup & Restore", icon: DatabaseBackup },
    ],
  },
]

interface SidebarContentProps {
  onNavigate?: () => void
}

export function SidebarContent({ onNavigate }: SidebarContentProps) {
  const activeModule = useAppStore((s) => s.activeModule)
  const setActiveModule = useAppStore((s) => s.setActiveModule)
  const pathname = usePathname()

  const handleSelect = (id: ModuleId) => {
    setActiveModule(id)
    onNavigate?.()
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-600 text-white">
          <Store className="h-4 w-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold leading-tight">Shop MS</span>
          <span className="text-muted-foreground text-[10px] leading-tight">
            Management System
          </span>
        </div>
      </div>

      <ScrollArea className="flex-1 px-2 py-3">
        <nav className="flex flex-col gap-4">
          {NAV.map((group) => (
            <div key={group.group} className="flex flex-col gap-1">
              <div className="text-muted-foreground px-2 text-[11px] font-semibold uppercase tracking-wider">
                {group.group}
              </div>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon
                  const isActive = activeModule === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.id)}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                          : "text-foreground/70 hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          isActive
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-muted-foreground"
                        )}
                      />
                      <span className="truncate">{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>

      <div className="border-t p-3">
        <Button asChild variant="outline" size="sm" className="w-full">
          <Link href={pathname}>
            <Package className="mr-2 h-4 w-4" />
            Shop Management v1.0
          </Link>
        </Button>
      </div>
    </div>
  )
}
