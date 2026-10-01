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
      purchases: await db.purchase.findMany({
        include: { items: true },
      }),
      inventory: await db.inventoryStock.findMany(),
      customers: await db.customer.findMany(),
      quotations: await db.quotation.findMany({
        include: { items: true },
      }),
      sells: await db.sell.findMany({
        include: { items: true },
      }),
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

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const toStr = (v: unknown): string | null =>
      v === null || v === undefined || v === "" ? null : String(v)
    const toNum = (v: unknown): number =>
      typeof v === "number" ? v : Number(v ?? 0) || 0
    const toDate = (v: unknown): Date =>
      v ? new Date(String(v)) : new Date()
    const toInt = (v: unknown): number | null =>
      v === null || v === undefined || v === "" ? null : Math.round(Number(v))

    // Clear all tables in dependency order
    await db.sellItem.deleteMany()
    await db.quotationItem.deleteMany()
    await db.purchaseItem.deleteMany()
    await db.inventoryStock.deleteMany()
    await db.sell.deleteMany()
    await db.quotation.deleteMany()
    await db.purchase.deleteMany()
    await db.product.deleteMany()
    await db.customer.deleteMany()
    await db.supplier.deleteMany()
    await db.uom.deleteMany()
    await db.brand.deleteMany()
    await db.category.deleteMany()
    await db.appUser.deleteMany()
    await db.companyProfile.deleteMany()

    const idMap: Record<string, Record<string, string>> = {}

    // Categories
    idMap.category = {}
    for (const c of body.categories ?? []) {
      const newRec = await db.category.create({
        data: {
          name: String(c.name),
          type: String(c.type ?? "Goods"),
          status: String(c.status ?? "Active"),
          createdAt: c.createdAt ? toDate(c.createdAt) : new Date(),
          updatedAt: c.updatedAt ? toDate(c.updatedAt) : new Date(),
        },
      })
      idMap.category[c.id] = newRec.id
    }

    idMap.brand = {}
    for (const b of body.brands ?? []) {
      const newRec = await db.brand.create({
        data: {
          name: String(b.name),
          status: String(b.status ?? "Active"),
          createdAt: b.createdAt ? toDate(b.createdAt) : new Date(),
          updatedAt: b.updatedAt ? toDate(b.updatedAt) : new Date(),
        },
      })
      idMap.brand[b.id] = newRec.id
    }

    idMap.uom = {}
    for (const u of body.uoms ?? []) {
      const newRec = await db.uom.create({
        data: {
          name: String(u.name),
          status: String(u.status ?? "Active"),
          createdAt: u.createdAt ? toDate(u.createdAt) : new Date(),
          updatedAt: u.updatedAt ? toDate(u.updatedAt) : new Date(),
        },
      })
      idMap.uom[u.id] = newRec.id
    }

    idMap.product = {}
    for (const p of body.products ?? []) {
      const newRec = await db.product.create({
        data: {
          name: String(p.name),
          categoryId: p.categoryId && idMap.category[p.categoryId] ? idMap.category[p.categoryId] : null,
          brandId: p.brandId && idMap.brand[p.brandId] ? idMap.brand[p.brandId] : null,
          uomId: p.uomId && idMap.uom[p.uomId] ? idMap.uom[p.uomId] : null,
          model: toStr(p.model),
          serial: toStr(p.serial),
          status: String(p.status ?? "Active"),
          createdAt: p.createdAt ? toDate(p.createdAt) : new Date(),
          updatedAt: p.updatedAt ? toDate(p.updatedAt) : new Date(),
        },
      })
      idMap.product[p.id] = newRec.id
    }

    idMap.supplier = {}
    for (const s of body.suppliers ?? []) {
      const newRec = await db.supplier.create({
        data: {
          name: String(s.name),
          mobile: String(s.mobile ?? ""),
          address: toStr(s.address),
          status: String(s.status ?? "Active"),
          createdAt: s.createdAt ? toDate(s.createdAt) : new Date(),
          updatedAt: s.updatedAt ? toDate(s.updatedAt) : new Date(),
        },
      })
      idMap.supplier[s.id] = newRec.id
    }

    idMap.purchase = {}
    for (const p of body.purchases ?? []) {
      const supplierId = p.supplierId && idMap.supplier[p.supplierId] ? idMap.supplier[p.supplierId] : null
      const totalPrice = toNum(p.totalPrice)
      const discount = toNum(p.discount)
      const grandTotal = toNum(p.grandTotal)
      const newRec = await db.purchase.create({
        data: {
          purchaseDate: p.purchaseDate ? toDate(p.purchaseDate) : new Date(),
          supplierId,
          invoiceNo: String(p.invoiceNo ?? ""),
          totalPrice,
          discount,
          grandTotal,
          attachment: toStr(p.attachment),
          remarks: toStr(p.remarks),
          createdAt: p.createdAt ? toDate(p.createdAt) : new Date(),
          updatedAt: p.updatedAt ? toDate(p.updatedAt) : new Date(),
          items: {
            create: (p.items ?? []).map((it: Record<string, unknown>) => ({
              productId: it.productId && idMap.product[it.productId as string] ? idMap.product[it.productId as string] : null,
              category: toStr(it.category),
              brand: toStr(it.brand),
              model: toStr(it.model),
              serial: toStr(it.serial),
              qty: toNum(it.qty),
              price: toNum(it.price),
              total: toNum(it.total),
              condition: toStr(it.condition),
              warrantyDate: it.warrantyDate ? toDate(it.warrantyDate) : null,
              warrantyDays: toInt(it.warrantyDays),
              remarks: toStr(it.remarks),
            })),
          },
        },
      })
      idMap.purchase[p.id] = newRec.id
    }

    for (const i of body.inventory ?? []) {
      await db.inventoryStock.create({
        data: {
          date: i.date ? toDate(i.date) : new Date(),
          invoice: String(i.invoice ?? ""),
          productId: i.productId && idMap.product[i.productId] ? idMap.product[i.productId] : null,
          brand: toStr(i.brand),
          model: toStr(i.model),
          serial: toStr(i.serial),
          qty: toNum(i.qty),
          uom: toStr(i.uom),
          remarks: toStr(i.remarks),
        },
      })
    }

    idMap.customer = {}
    for (const c of body.customers ?? []) {
      const newRec = await db.customer.create({
        data: {
          name: String(c.name),
          mobile: String(c.mobile ?? ""),
          address: toStr(c.address),
          status: String(c.status ?? "Active"),
          createdAt: c.createdAt ? toDate(c.createdAt) : new Date(),
          updatedAt: c.updatedAt ? toDate(c.updatedAt) : new Date(),
        },
      })
      idMap.customer[c.id] = newRec.id
    }

    for (const q of body.quotations ?? []) {
      const customerId = q.customerId && idMap.customer[q.customerId] ? idMap.customer[q.customerId] : null
      await db.quotation.create({
        data: {
          quotationDate: q.quotationDate ? toDate(q.quotationDate) : new Date(),
          customerId,
          invoiceNo: String(q.invoiceNo ?? ""),
          totalPrice: toNum(q.totalPrice),
          discount: toNum(q.discount),
          grandTotal: toNum(q.grandTotal),
          remarks: toStr(q.remarks),
          createdAt: q.createdAt ? toDate(q.createdAt) : new Date(),
          updatedAt: q.updatedAt ? toDate(q.updatedAt) : new Date(),
          items: {
            create: (q.items ?? []).map((it: Record<string, unknown>) => ({
              productId: it.productId && idMap.product[it.productId as string] ? idMap.product[it.productId as string] : null,
              qty: toNum(it.qty),
              price: toNum(it.price),
              total: toNum(it.total),
              remarks: toStr(it.remarks),
            })),
          },
        },
      })
    }

    for (const s of body.sells ?? []) {
      const customerId = s.customerId && idMap.customer[s.customerId] ? idMap.customer[s.customerId] : null
      await db.sell.create({
        data: {
          sellDate: s.sellDate ? toDate(s.sellDate) : new Date(),
          customerId,
          invoiceNo: String(s.invoiceNo ?? ""),
          totalPrice: toNum(s.totalPrice),
          discount: toNum(s.discount),
          grandTotal: toNum(s.grandTotal),
          paidAmount: toNum(s.paidAmount),
          dueAmount: toNum(s.dueAmount),
          remarks: toStr(s.remarks),
          createdAt: s.createdAt ? toDate(s.createdAt) : new Date(),
          updatedAt: s.updatedAt ? toDate(s.updatedAt) : new Date(),
          items: {
            create: (s.items ?? []).map((it: Record<string, unknown>) => ({
              productId: it.productId && idMap.product[it.productId as string] ? idMap.product[it.productId as string] : null,
              qty: toNum(it.qty),
              price: toNum(it.price),
              total: toNum(it.total),
              remarks: toStr(it.remarks),
            })),
          },
        },
      })
    }

    for (const c of body.company ?? []) {
      await db.companyProfile.create({
        data: {
          name: String(c.name ?? ""),
          address: toStr(c.address),
          phone: toStr(c.phone),
          email: toStr(c.email),
          website: toStr(c.website),
          vatNo: toStr(c.vatNo),
          logo: toStr(c.logo),
          createdAt: c.createdAt ? toDate(c.createdAt) : new Date(),
          updatedAt: c.updatedAt ? toDate(c.updatedAt) : new Date(),
        },
      })
    }

    for (const u of body.users ?? []) {
      try {
        await db.appUser.create({
          data: {
            name: String(u.name ?? ""),
            email: String(u.email ?? `${Date.now()}@import.local`),
            mobile: toStr(u.mobile),
            role: String(u.role ?? "Staff"),
            status: String(u.status ?? "Active"),
            password: String(u.password ?? "password"),
            createdAt: u.createdAt ? toDate(u.createdAt) : new Date(),
            updatedAt: u.updatedAt ? toDate(u.updatedAt) : new Date(),
          },
        })
      } catch {
        // skip duplicates
      }
    }

    return NextResponse.json({ success: true, restored: true })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
