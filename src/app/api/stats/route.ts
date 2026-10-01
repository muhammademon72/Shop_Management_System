import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const [
      totalProducts,
      totalSuppliers,
      totalCustomers,
      totalSellsAgg,
      totalPurchasesAgg,
      totalInventory,
    ] = await Promise.all([
      db.product.count(),
      db.supplier.count(),
      db.customer.count(),
      db.sell.aggregate({ _sum: { grandTotal: true } }),
      db.purchase.aggregate({ _sum: { grandTotal: true } }),
      db.inventoryStock.count(),
    ])

    const recentPurchases = await db.purchase.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { supplier: true },
    })

    const recentSells = await db.sell.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { customer: true },
    })

    return NextResponse.json({
      totalProducts,
      totalSuppliers,
      totalCustomers,
      totalSales: totalSellsAgg._sum.grandTotal ?? 0,
      totalPurchases: totalPurchasesAgg._sum.grandTotal ?? 0,
      totalInventory,
      lowStockCount: 0,
      recentPurchases,
      recentSells,
    })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
