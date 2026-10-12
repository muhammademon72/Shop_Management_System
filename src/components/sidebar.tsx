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
  ChevronRight,
  BarChart3,
  Truck as DeliveryIcon,
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
    group: "Report Manage",
    items: [
      { id: "purchaseReport", label: "Purchase Report", icon: BarChart3 },
      { id: "deliveryReport", label: "Delivery Report", icon: DeliveryIcon },
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

  // Collapsible group state — keyed by group name. Only groups with more
  // than one item are collapsible (single-item groups like "Dashboard" stay
  // always visible). Default = expanded so first paint looks the same as
  // before.
  const [collapsedGroups, setCollapsedGroups] = React.useState<Record<string, boolean>>({})
  const toggleGroup = (group: string) =>
    setCollapsedGroups((prev) => ({ ...prev, [group]: !prev[group] }))

  const handleSelect = (id: ModuleId) => {
    setActiveModule(id)
    onNavigate?.()
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-600 text-white">
          <Store className="h-4 w-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold leading-tight text-white">Shop MS</span>
          <span className="text-[10px] leading-tight text-sidebar-foreground/60">
            Management System
          </span>
        </div>
      </div>

      <ScrollArea className="flex-1 px-2 py-3">
        <nav className="flex flex-col gap-4">
          {NAV.map((group) => {
            const isCollapsible = group.items.length > 1
            const isCollapsed = isCollapsible && collapsedGroups[group.group]
            return (
              <div key={group.group} className="flex flex-col gap-1">
                {isCollapsible ? (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.group)}
                    aria-expanded={!isCollapsed}
                    title={isCollapsed ? `Expand ${group.group}` : `Collapse ${group.group}`}
                    className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  >
                    <span className="truncate">{group.group}</span>
                    <ChevronRight
                      className={cn(
                        "h-3.5 w-3.5 shrink-0 transition-transform",
                        isCollapsed ? "rotate-0" : "rotate-90"
                      )}
                    />
                  </button>
                ) : (
                  <div className="px-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                    {group.group}
                  </div>
                )}
                {!isCollapsed && (
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
                              ? "bg-emerald-600 text-white"
                              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                          )}
                        >
                          <Icon
                            className={cn(
                              "h-4 w-4 shrink-0",
                              isActive
                                ? "text-white"
                                : "text-sidebar-foreground/60"
                            )}
                          />
                          <span className="truncate">{item.label}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>
      </ScrollArea>

      <div className="border-t border-sidebar-border p-3">
        <Button asChild variant="outline" size="sm" className="w-full border-sidebar-border bg-transparent text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground">
          <Link href={pathname}>
            <Package className="mr-2 h-4 w-4" />
            Shop Management v1.0
          </Link>
        </Button>
      </div>
    </div>
  )
}
