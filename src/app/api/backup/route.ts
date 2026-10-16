export const dynamic = "force-dynamic"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const data = {
      exportedAt: new Date().toISOString(),
      categories: await db.category.findMany(),
      brands: await db.brand.findMany(),
      uoms: await db.uom.findMany(),
      products: await db.product.findMany(),
      suppliers: await db.supplier.findMany(),
      inventory: await db.inventoryStock.findMany(),
      customers: await db.customer.findMany(),
      company: await db.companyProfile.findMany(),
      users: await db.appUser.findMany(),
    }
    return NextResponse.json(data, {
      headers: {
        "Content-Disposition": `attachment; filename="shop-backup-${Date.now()}.json"`,
      },
    })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    // Delete all data from all tables (in dependency order)
    // Keep AppUser (don't delete admin accounts)
    const tables = [
      "SellItem", "QuotationItem", "PurchaseItem",
      "InventoryStock", "Sell", "Quotation", "Purchase",
      "Product", "Customer", "Supplier",
      "Uom", "Brand", "Category",
      "CompanyProfile",
    ]
    for (const table of tables) {
      await db.execute(`DELETE FROM ${table}`)
    }
    return NextResponse.json({ success: true, message: "All data deleted (except user accounts)" })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
