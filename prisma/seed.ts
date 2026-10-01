import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()

async function main() {
  console.log("🌱 Seeding database...")

  // Clean (delete in dependency order)
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

  // Categories
  const categories = await Promise.all(
    [
      { name: "Electronics", type: "Goods" },
      { name: "Home Appliances", type: "Goods" },
      { name: "Office Equipment", type: "Goods" },
      { name: "Mobile Phones", type: "Goods" },
      { name: "Installation", type: "Service" },
    ].map((c) => db.category.create({ data: c }))
  )

  // Brands
  const brands = await Promise.all(
    ["Samsung", "LG", "Sony", "Apple", "Dell"].map((name) =>
      db.brand.create({ data: { name } })
    )
  )

  // UOMs
  const uoms = await Promise.all(
    ["PCS", "KG", "LITER", "METER", "BOX"].map((name) =>
      db.uom.create({ data: { name } })
    )
  )

  // Products (10)
  const productData = [
    { name: "Samsung 55\" 4K TV", catIdx: 0, brandIdx: 0, uomIdx: 0, model: "UA55TU8000", serial: "SAM-TV-001" },
    { name: "LG 43\" Smart TV", catIdx: 1, brandIdx: 1, uomIdx: 0, model: "43UN7100", serial: "LG-TV-002" },
    { name: "Sony Bravia 50\"", catIdx: 0, brandIdx: 2, uomIdx: 0, model: "KDL-50W800", serial: "SONY-003" },
    { name: "Apple iPhone 15 Pro", catIdx: 3, brandIdx: 3, uomIdx: 0, model: "A3104", serial: "APL-IP-004" },
    { name: "Dell XPS 13 Laptop", catIdx: 2, brandIdx: 4, uomIdx: 0, model: "XPS-9315", serial: "DEL-LT-005" },
    { name: "Samsung Galaxy S24", catIdx: 3, brandIdx: 0, uomIdx: 0, model: "SM-S921", serial: "SAM-PH-006" },
    { name: "LG Refrigerator 500L", catIdx: 1, brandIdx: 1, uomIdx: 0, model: "GL-500", serial: "LG-RF-007" },
    { name: "Sony Headphones WH-1000", catIdx: 0, brandIdx: 2, uomIdx: 0, model: "WH1000", serial: "SONY-HD-008" },
    { name: "Dell Monitor 27\"", catIdx: 2, brandIdx: 4, uomIdx: 0, model: "U2720", serial: "DEL-MN-009" },
    { name: "Apple MacBook Air", catIdx: 2, brandIdx: 3, uomIdx: 0, model: "MLY13", serial: "APL-MB-010" },
  ]
  const products = await Promise.all(
    productData.map((p) =>
      db.product.create({
        data: {
          name: p.name,
          categoryId: categories[p.catIdx].id,
          brandId: brands[p.brandIdx].id,
          uomId: uoms[p.uomIdx].id,
          model: p.model,
          serial: p.serial,
        },
      })
    )
  )

  // Suppliers
  const suppliers = await Promise.all(
    [
      { name: "Tech Distributors Inc.", mobile: "+1-555-0101", address: "123 Main St, NY" },
      { name: "Appliance World Co.", mobile: "+1-555-0202", address: "456 Oak Ave, LA" },
      { name: "Mobile Wholesale Ltd.", mobile: "+1-555-0303", address: "789 Pine Rd, SF" },
    ].map((s) => db.supplier.create({ data: s }))
  )

  // Purchases (2) with items
  const p1 = await db.purchase.create({
    data: {
      purchaseDate: new Date(Date.now() - 7 * 86400_000),
      supplierId: suppliers[0].id,
      invoiceNo: "PUR-100001",
      totalPrice: 6000,
      discount: 200,
      grandTotal: 5800,
      attachment: null,
      remarks: "Initial stock order",
      items: {
        create: [
          {
            productId: products[0].id,
            category: categories[0].name,
            brand: brands[0].name,
            model: "UA55TU8000",
            serial: "SAM-TV-001",
            qty: 5,
            price: 600,
            total: 3000,
            condition: "New",
            warrantyDate: new Date(Date.now() + 365 * 86400_000),
            warrantyDays: 365,
          },
          {
            productId: products[3].id,
            category: categories[3].name,
            brand: brands[3].name,
            model: "A3104",
            serial: "APL-IP-004",
            qty: 3,
            price: 1000,
            total: 3000,
            condition: "New",
            warrantyDate: new Date(Date.now() + 365 * 86400_000),
            warrantyDays: 365,
          },
        ],
      },
    },
    include: { items: true },
  })

  const p2 = await db.purchase.create({
    data: {
      purchaseDate: new Date(Date.now() - 3 * 86400_000),
      supplierId: suppliers[1].id,
      invoiceNo: "PUR-100002",
      totalPrice: 3500,
      discount: 100,
      grandTotal: 3400,
      attachment: null,
      remarks: "Office equipment",
      items: {
        create: [
          {
            productId: products[4].id,
            category: categories[2].name,
            brand: brands[4].name,
            model: "XPS-9315",
            serial: "DEL-LT-005",
            qty: 2,
            price: 1250,
            total: 2500,
            condition: "New",
            warrantyDate: new Date(Date.now() + 365 * 86400_000),
            warrantyDays: 365,
          },
          {
            productId: products[8].id,
            category: categories[2].name,
            brand: brands[4].name,
            model: "U2720",
            serial: "DEL-MN-009",
            qty: 2,
            price: 500,
            total: 1000,
            condition: "New",
            warrantyDate: new Date(Date.now() + 365 * 86400_000),
            warrantyDays: 365,
          },
        ],
      },
    },
    include: { items: true },
  })

  // Inventory rows (auto-populated from purchases + a manual one)
  for (const purchase of [p1, p2]) {
    for (const it of purchase.items) {
      await db.inventoryStock.create({
        data: {
          date: purchase.purchaseDate,
          invoice: purchase.invoiceNo,
          productId: it.productId,
          brand: it.brand,
          model: it.model,
          serial: it.serial,
          qty: it.qty,
          uom: "PCS",
          remarks: `From purchase ${purchase.invoiceNo}`,
        },
      })
    }
  }
  await db.inventoryStock.create({
    data: {
      date: new Date(),
      invoice: "MANUAL-INV-001",
      productId: products[5].id,
      brand: brands[0].name,
      model: "SM-S921",
      serial: "SAM-PH-006",
      qty: 10,
      uom: "PCS",
      remarks: "Manual stock addition",
    },
  })

  // Customers
  const customers = await Promise.all(
    [
      { name: "John Smith", mobile: "+1-555-1001", address: "100 Bay St, NY" },
      { name: "Emily Chen", mobile: "+1-555-1002", address: "200 Sunset Blvd, LA" },
      { name: "Carlos Diaz", mobile: "+1-555-1003", address: "300 Hill Rd, SF" },
    ].map((c) => db.customer.create({ data: c }))
  )

  // Quotations (2)
  await db.quotation.create({
    data: {
      quotationDate: new Date(Date.now() - 2 * 86400_000),
      customerId: customers[0].id,
      invoiceNo: "QUO-200001",
      totalPrice: 2200,
      discount: 100,
      grandTotal: 2100,
      remarks: "Quotation for home setup",
      items: {
        create: [
          {
            productId: products[0].id,
            qty: 2,
            price: 800,
            total: 1600,
            remarks: "Two TVs",
          },
          {
            productId: products[7].id,
            qty: 2,
            price: 300,
            total: 600,
          },
        ],
      },
    },
  })
  await db.quotation.create({
    data: {
      quotationDate: new Date(Date.now() - 1 * 86400_000),
      customerId: customers[1].id,
      invoiceNo: "QUO-200002",
      totalPrice: 3000,
      discount: 0,
      grandTotal: 3000,
      remarks: "Office upgrade",
      items: {
        create: [
          {
            productId: products[3].id,
            qty: 2,
            price: 1100,
            total: 2200,
          },
          {
            productId: products[8].id,
            qty: 1,
            price: 800,
            total: 800,
          },
        ],
      },
    },
  })

  // Sells (2)
  await db.sell.create({
    data: {
      sellDate: new Date(Date.now() - 1 * 86400_000),
      customerId: customers[0].id,
      invoiceNo: "SAL-300001",
      totalPrice: 1600,
      discount: 50,
      grandTotal: 1550,
      paidAmount: 1550,
      dueAmount: 0,
      remarks: "Closed sale",
      items: {
        create: [
          {
            productId: products[0].id,
            qty: 2,
            price: 800,
            total: 1600,
          },
        ],
      },
    },
  })
  await db.sell.create({
    data: {
      sellDate: new Date(),
      customerId: customers[2].id,
      invoiceNo: "SAL-300002",
      totalPrice: 1100,
      discount: 0,
      grandTotal: 1100,
      paidAmount: 600,
      dueAmount: 500,
      remarks: "Partial payment",
      items: {
        create: [
          {
            productId: products[3].id,
            qty: 1,
            price: 1100,
            total: 1100,
          },
        ],
      },
    },
  })

  // Company profile
  await db.companyProfile.create({
    data: {
      name: "Acme Electronics LLC",
      address: "1 Market St, San Francisco, CA",
      phone: "+1-555-0000",
      email: "info@acme-electronics.com",
      website: "https://acme-electronics.com",
      vatNo: "VAT-123456789",
      logo: "",
    },
  })

  // Users
  await db.appUser.create({
    data: {
      name: "Admin User",
      email: "admin@shop.local",
      mobile: "+1-555-2001",
      role: "Admin",
      status: "Active",
      password: "admin123",
    },
  })
  await db.appUser.create({
    data: {
      name: "Jane Staff",
      email: "staff@shop.local",
      mobile: "+1-555-2002",
      role: "Staff",
      status: "Active",
      password: "staff123",
    },
  })

  console.log("✅ Seed completed successfully!")
  console.log(`   - Categories: ${categories.length}`)
  console.log(`   - Brands: ${brands.length}`)
  console.log(`   - UOMs: ${uoms.length}`)
  console.log(`   - Products: ${products.length}`)
  console.log(`   - Suppliers: ${suppliers.length}`)
  console.log(`   - Purchases: 2`)
  console.log(`   - Customers: ${customers.length}`)
  console.log(`   - Quotations: 2`)
  console.log(`   - Sells: 2`)
}

main()
  .catch((e) => {
    console.error("Seed error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
