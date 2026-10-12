import { create } from "zustand"

export type ModuleId =
  | "dashboard"
  | "categories"
  | "brands"
  | "uoms"
  | "products"
  | "conditions"
  | "warranties"
  | "purchases"
  | "suppliers"
  | "inventory"
  | "quotations"
  | "sells"
  | "customers"
  | "purchaseReport"
  | "deliveryReport"
  | "company"
  | "users"
  | "backup"

interface AppState {
  activeModule: ModuleId
  setActiveModule: (m: ModuleId) => void
  mobileSidebarOpen: boolean
  setMobileSidebarOpen: (open: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  activeModule: "dashboard",
  setActiveModule: (m) => set({ activeModule: m }),
  mobileSidebarOpen: false,
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
}))
