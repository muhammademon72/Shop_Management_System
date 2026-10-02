// Shared TypeScript types for the Shop Management System

export interface Category {
  id: string
  name: string
  type: string
  status: string
  createdAt: string
  updatedAt: string
}

export interface Brand {
  id: string
  name: string
  status: string
  createdAt: string
  updatedAt: string
}

export interface Uom {
  id: string
  name: string
  status: string
  createdAt: string
  updatedAt: string
}

export interface Condition {
  id: string
  name: string
  status: string
  createdAt: string
  updatedAt: string
}

export interface Warranty {
  id: string
  name: string
  status: string
  createdAt: string
  updatedAt: string
}

export interface Product {
  id: string
  name: string
  categoryId: string | null
  category?: Category | null
  brandId: string | null
  brand?: Brand | null
  uomId: string | null
  uom?: Uom | null
  model: string | null
  serial: string | null
  status: string
  createdAt: string
  updatedAt: string
}

export interface Supplier {
  id: string
  name: string
  mobile: string
  address: string | null
  status: string
  createdAt: string
  updatedAt: string
}

export interface PurchaseItem {
  id?: string
  purchaseId?: string
  productId: string | null
  product?: Product | null
  category: string | null
  brand: string | null
  model: string | null
  serial: string | null
  qty: number
  price: number
  total: number
  condition: string | null
  warrantyText: string | null
  warrantyDate: string | null
  warrantyDays: number | null
  remarks: string | null
}

export interface Purchase {
  id: string
  purchaseDate: string
  supplierId: string | null
  supplier?: Supplier | null
  invoiceNo: string
  totalPrice: number
  discount: number
  grandTotal: number
  attachment: string | null
  remarks: string | null
  items: PurchaseItem[]
  createdAt: string
  updatedAt: string
}

export interface InventoryStock {
  id: string
  date: string
  invoice: string
  productId: string | null
  product?: Product | null
  brand: string | null
  model: string | null
  serial: string | null
  qty: number
  uom: string | null
  remarks: string | null
  createdAt: string
  updatedAt: string
}

export interface Customer {
  id: string
  name: string
  mobile: string
  address: string | null
  status: string
  createdAt: string
  updatedAt: string
}

export interface QuotationItem {
  id?: string
  quotationId?: string
  productId: string | null
  product?: Product | null
  brand: string | null
  model: string | null
  serial: string | null
  condition: string | null
  warrantyText: string | null
  qty: number
  price: number
  total: number
  remarks: string | null
}

export interface Quotation {
  id: string
  quotationDate: string
  customerId: string | null
  customer?: Customer | null
  invoiceNo: string
  totalPrice: number
  discount: number
  grandTotal: number
  remarks: string | null
  items: QuotationItem[]
  createdAt: string
  updatedAt: string
}

export interface SellItem {
  id?: string
  sellId?: string
  productId: string | null
  product?: Product | null
  qty: number
  price: number
  total: number
  remarks: string | null
}

export interface Sell {
  id: string
  sellDate: string
  customerId: string | null
  customer?: Customer | null
  invoiceNo: string
  totalPrice: number
  discount: number
  grandTotal: number
  paidAmount: number
  dueAmount: number
  remarks: string | null
  items: SellItem[]
  createdAt: string
  updatedAt: string
}

export interface CompanyProfile {
  id: string
  name: string
  address: string | null
  phone: string | null
  email: string | null
  website: string | null
  vatNo: string | null
  logo: string | null
  createdAt: string
  updatedAt: string
}

export interface AppUser {
  id: string
  name: string
  email: string
  mobile: string | null
  role: string
  status: string
  password?: string
  createdAt: string
  updatedAt: string
}

// Helper to convert a value to a number, defaulting to 0
export const num = (v: unknown): number => {
  const n = typeof v === "string" ? parseFloat(v) : (v as number)
  return isNaN(n) || !isFinite(n) ? 0 : n
}
