"use client"

import * as React from "react"
import { Menu, Moon, Sun, Bell } from "lucide-react"
import { useTheme } from "next-themes"

import { useAppStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { SidebarContent } from "@/components/sidebar"

import { Dashboard } from "@/components/modules/dashboard"
import { CategoriesModule } from "@/components/modules/categories"
import { BrandsModule } from "@/components/modules/brands"
import { UomsModule } from "@/components/modules/uoms"
import { ProductsModule } from "@/components/modules/products"
import { ConditionsModule } from "@/components/modules/conditions"
import { WarrantiesModule } from "@/components/modules/warranties"
import { SuppliersModule } from "@/components/modules/suppliers"
import { PurchasesModule } from "@/components/modules/purchases"
import { InventoryModule } from "@/components/modules/inventory"
import { CustomersModule } from "@/components/modules/customers"
import { QuotationsModule } from "@/components/modules/quotations"
import { SellsModule } from "@/components/modules/sells"
import { PurchaseReportModule } from "@/components/modules/purchase-report"
import { DeliveryReportModule } from "@/components/modules/delivery-report"
import { CompanyProfileModule } from "@/components/modules/company-profile"
import { UsersModule } from "@/components/modules/users"
import { BackupRestoreModule } from "@/components/modules/backup-restore"

function ActiveModule() {
  const activeModule = useAppStore((s) => s.activeModule)
  switch (activeModule) {
    case "dashboard":
      return <Dashboard />
    case "categories":
      return <CategoriesModule />
    case "brands":
      return <BrandsModule />
    case "uoms":
      return <UomsModule />
    case "products":
      return <ProductsModule />
    case "conditions":
      return <ConditionsModule />
    case "warranties":
      return <WarrantiesModule />
    case "suppliers":
      return <SuppliersModule />
    case "purchases":
      return <PurchasesModule />
    case "inventory":
      return <InventoryModule />
    case "customers":
      return <CustomersModule />
    case "quotations":
      return <QuotationsModule />
    case "sells":
      return <SellsModule />
    case "purchaseReport":
      return <PurchaseReportModule />
    case "deliveryReport":
      return <DeliveryReportModule />
    case "company":
      return <CompanyProfileModule />
    case "users":
      return <UsersModule />
    case "backup":
      return <BackupRestoreModule />
    default:
      return <Dashboard />
  }
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  if (!mounted) return <div className="h-9 w-9" />
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      title="Toggle theme"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  )
}

export function AppShell() {
  const mobileSidebarOpen = useAppStore((s) => s.mobileSidebarOpen)
  const setMobileSidebarOpen = useAppStore((s) => s.setMobileSidebarOpen)
  const activeModule = useAppStore((s) => s.activeModule)

  const moduleLabel = React.useMemo(() => {
    const map: Record<string, string> = {
      dashboard: "Dashboard",
      categories: "Categories",
      brands: "Brands",
      uoms: "UOMs",
      products: "Products",
      conditions: "Conditions",
      warranties: "Warranties",
      suppliers: "Suppliers",
      purchases: "Purchases",
      inventory: "Inventory Stock",
      customers: "Customers",
      quotations: "Quotations",
      sells: "Sales",
      purchaseReport: "Purchase Report",
      deliveryReport: "Delivery Report",
      company: "Company Profile",
      users: "User Management",
      backup: "Backup & Restore",
    }
    return map[activeModule] || "Dashboard"
  }, [activeModule])

  return (
    <div className="flex min-h-screen w-full bg-muted/30">
      {/* Desktop sidebar — dark charcoal theme via sidebar CSS variables */}
      <aside className="hidden w-64 shrink-0 bg-sidebar text-sidebar-foreground lg:flex lg:flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      <Sheet
        open={mobileSidebarOpen}
        onOpenChange={setMobileSidebarOpen}
      >
        <SheetContent side="left" className="w-72 bg-sidebar text-sidebar-foreground p-0">
          <SidebarContent onNavigate={() => setMobileSidebarOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="bg-background sticky top-0 z-30 flex h-14 items-center gap-3 border-b px-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex flex-1 items-center gap-2">
            <span className="text-sm font-medium">{moduleLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" title="Notifications">
              <Bell className="h-4 w-4" />
            </Button>
            <ThemeToggle />
            <div className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold">
              AD
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">
          <div className="mx-auto w-full max-w-7xl">
            <ActiveModule />
          </div>
        </main>
      </div>
    </div>
  )
}
