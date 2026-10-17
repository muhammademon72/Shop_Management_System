"use client"

import type { Sell, CompanyProfile } from "@/lib/types"
import { formatCurrency, formatDate } from "@/lib/format"

/**
 * Generate the printable invoice HTML for a Sell, then open it in a new
 * window and call print(). The print format mirrors the user-uploaded
 * reference images (modern SaaS invoice with: header split between company
 * info + invoice metadata, line items table with Product Specs / Condition /
 * Qty / Price / Total columns, and a footer split between payment status +
 * financial totals).
 */
export function printSellInvoice(sell: Sell, company: CompanyProfile | null) {
  const html = renderInvoiceHtml(sell, company)
  const win = window.open("", "_blank", "width=900,height=1100")
  if (!win) {
    alert("Please allow pop-ups to print the invoice.")
    return
  }
  win.document.open()
  win.document.write(html)
  win.document.close()
  // Wait for fonts/layout to settle before triggering print dialog.
  win.onload = () => {
    setTimeout(() => {
      win.focus()
      win.print()
    }, 250)
  }
}

/**
 * Download a Sell invoice directly as a PDF file (no print preview dialog).
 * Builds the same invoice HTML, renders it off-screen, rasterises with
 * html2canvas, then wraps the image in jsPDF and saves it as a PDF.
 *
 * The "Download PDF" action in the Sales list uses this so the user gets
 * an immediate file download instead of the browser print preview.
 */
export async function downloadSellPdf(sell: Sell, company: CompanyProfile | null) {
  // Lazily import so the libraries are only loaded when actually needed —
  // keeps initial page bundle smaller.
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import("jspdf"),
    import("html2canvas"),
  ])

  // 1. Build invoice HTML.
  const html = renderInvoiceHtml(sell, company)

  // 2. Render it off-screen in an iframe so styles can't leak into the page.
  const iframe = document.createElement("iframe")
  iframe.style.position = "fixed"
  iframe.style.left = "-9999px"
  iframe.style.top = "0"
  iframe.style.width = "800px"
  iframe.style.height = "1100px"
  iframe.style.border = "0"
  document.body.appendChild(iframe)

  try {
    const doc = iframe.contentDocument
    if (!doc) throw new Error("Could not render invoice for PDF export.")
    doc.open()
    doc.write(html)
    doc.close()

    // 3. Wait for fonts/images to settle inside the iframe.
    await new Promise((r) => setTimeout(r, 600))

    // 4. Rasterise the invoice. Try the .invoice container first; fall back
    //    to body if needed. We render the visible area (windowWidth/windowHeight)
    //    so html2canvas doesn't clip the iframe's tiny physical dimensions.
    const target = (doc.querySelector(".invoice") as HTMLElement) ?? doc.body
    const canvas = await html2canvas(target, {
      scale: 2, // crisper PDF
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
      width: 800,
      height: target.scrollHeight,
      windowWidth: 800,
      windowHeight: target.scrollHeight,
    })

    // 5. Build an A4 PDF and let it span multiple pages if needed.
    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" })
    const pageWidthMm = pdf.internal.pageSize.getWidth()
    const pageHeightMm = pdf.internal.pageSize.getHeight()
    const marginMm = 10
    const usableWidthMm = pageWidthMm - marginMm * 2

    const imgWidthMm = usableWidthMm
    const imgHeightMm = (canvas.height * imgWidthMm) / canvas.width

    let heightLeftMm = imgHeightMm
    let positionMm = marginMm

    const imgData = canvas.toDataURL("image/png")
    pdf.addImage(imgData, "PNG", marginMm, positionMm, imgWidthMm, imgHeightMm)
    heightLeftMm -= (pageHeightMm - marginMm * 2)

    while (heightLeftMm > 0) {
      positionMm = marginMm - (imgHeightMm - heightLeftMm)
      pdf.addPage()
      pdf.addImage(imgData, "PNG", marginMm, positionMm, imgWidthMm, imgHeightMm)
      heightLeftMm -= (pageHeightMm - marginMm * 2)
    }

    // 6. Trigger a real download (no preview, no print dialog).
    const safeInvoice = (sell.invoiceNo || "invoice").replace(/[^\w-]+/g, "_")
    pdf.save(`Invoice-${safeInvoice}.pdf`)
  } finally {
    // Always clean up the iframe so we don't leak DOM nodes.
    document.body.removeChild(iframe)
  }
}

function renderInvoiceHtml(sell: Sell, company: CompanyProfile | null): string {
  const companyName = company?.name ?? "Your Company"
  const companyPhone = company?.phone ?? ""
  const companyEmail = company?.email ?? ""
  const companyAddress = company?.address ?? ""
  const companyWebsite = company?.website ?? ""
  const companyVat = company?.vatNo ?? ""

  const customer = sell.customer
  const customerName = customer?.name ?? "Walk-in Customer"
  const customerMobile = customer?.mobile ?? ""
  const customerAddress = customer?.address ?? ""

  const items = sell.items ?? []
  const subtotal = sell.totalPrice
  const discount = sell.discount
  const grandTotal = sell.grandTotal
  const paid = sell.paidAmount
  const due = sell.dueAmount

  const rows = items.length === 0
    ? `<tr><td colspan="7" style="padding:24px;text-align:center;color:#6b7280;font-style:italic;">No line items.</td></tr>`
    : items.map((it, idx) => {
        const name = it.product?.name ?? "—"
        const brand = it.brand ?? null
        const model = it.model ?? null
        const serial = it.serial ?? null
        const condition = it.condition ?? null
        const warranty = it.warrantyText ?? null

        // Horizontal comma-separated spec line under the product name, e.g.:
        //   Brand: Dell, Model: Dell Latitude 5400, Serial: BHKN2R2
        // (per user screenshot showing the red-boxed detail line)
        const specParts: string[] = []
        if (brand) specParts.push(`<span class="spec-label">Brand:</span> ${escape(brand)}`)
        if (model) specParts.push(`<span class="spec-label">Model:</span> ${escape(model)}`)
        if (serial) specParts.push(`<span class="spec-label">Serial:</span> ${escape(serial)}`)
        const specLine = specParts.join(", ")

        return `
          <tr>
            <td class="num">${idx + 1}</td>
            <td>
              <div class="prod-name">${escape(name)}</div>
              ${specLine ? `<div class="spec-line">${specLine}</div>` : ""}
            </td>
            <td class="center">${condition ? `<span class="pill green">${escape(condition)}</span>` : "—"}</td>
            <td class="center">${warranty ? `<span class="pill amber">${escape(warranty)}</span>` : "—"}</td>
            <td class="num">${it.qty}</td>
            <td class="num">${formatCurrency(it.price)}</td>
            <td class="num bold">${formatCurrency(it.total)}</td>
          </tr>
        `
      }).join("")

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Invoice ${escape(sell.invoiceNo)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, Helvetica, Arial, sans-serif;
      color: #111827;
      background: #fff;
      margin: 0;
      padding: 32px;
      font-size: 13px;
      line-height: 1.45;
    }
    .invoice {
      max-width: 800px;
      margin: 0 auto;
    }

    /* === HEADER === */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 24px;
      padding-bottom: 16px;
      border-bottom: 3px solid #10B981;
      margin-bottom: 24px;
    }
    .company { display: flex; gap: 12px; align-items: flex-start; }
    .company .logo {
      width: 40px; height: 40px; flex-shrink: 0;
      border-radius: 8px;
      background: #10B981;
      color: #fff;
      font-weight: 700;
      font-size: 20px;
      display: flex; align-items: center; justify-content: center;
    }
    .company .info h1 { margin: 0 0 2px 0; font-size: 20px; font-weight: 700; }
    .company .info p { margin: 1px 0; color: #6b7280; font-size: 12px; }
    .company .info .addr { color: #374151; }
    .company .info .contact { color: #374151; }
    .company .info .contact strong { color: #111827; font-weight: 600; }
    .company .info .spacer { height: 8px; }
    .meta { text-align: right; min-width: 220px; }
    .meta .title {
      font-size: 16px; font-weight: 700; color: #111827; margin-bottom: 4px;
    }
    .meta .badge-status {
      display: inline-block;
      background: #D1FAE5;
      color: #065F46;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.5px;
      margin-bottom: 10px;
    }
    .meta .row { font-size: 12px; color: #6b7280; margin: 2px 0; }
    .meta .row strong { color: #111827; font-weight: 600; }

    /* === CUSTOMER === */
    .customer {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      margin-bottom: 20px;
      padding: 12px 14px;
      background: #F3F4F6;
      border-radius: 8px;
    }
    .customer h3, .terms h3 {
      margin: 0 0 4px 0;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1px;
      color: #6b7280;
      text-transform: uppercase;
    }
    .customer .name { font-weight: 700; font-size: 15px; color: #111827; margin-bottom: 2px; }
    .customer .line { color: #4B5563; font-size: 12px; margin: 1px 0; }
    .customer .line strong { color: #111827; font-weight: 600; }

    /* === TABLE === */
    table.items {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    table.items thead th {
      background: #10B981;
      color: #FFFFFF;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      padding: 10px 12px;
      text-align: left;
      vertical-align: middle;
      border-bottom: 2px solid #047857;
    }
    table.items tbody td {
      padding: 12px;
      border-bottom: 1px solid #F3F4F6;
      vertical-align: top;
    }
    table.items td.num { text-align: right; }
    table.items td.center { text-align: center; }
    table.items td.bold { font-weight: 700; }

    .prod-name { font-weight: 600; color: #111827; font-size: 13px; margin-bottom: 2px; }
    /* Horizontal spec line under product name:
       "Brand: Dell, Model: Dell Latitude 5400, Serial: BHKN2R2" */
    .spec-line {
      color: #4B5563;
      font-size: 11px;
      line-height: 1.45;
      word-break: break-word;
    }
    .spec-line .spec-label {
      color: #111827;
      font-weight: 600;
    }

    .pill {
      display: inline-block;
      padding: 3px 10px;
      font-size: 11px;
      font-weight: 600;
      border-radius: 999px;
    }
    .pill.green { background: #D1FAE5; color: #065F46; }
    .pill.amber { background: #FEF3C7; color: #92400E; }

    /* === FOOTER === */
    .footer {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      align-items: flex-start;
    }
    .terms {
      flex: 1;
      padding: 12px 14px;
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      font-size: 11px;
      color: #4B5563;
      line-height: 1.5;
    }
    .terms ol { margin: 4px 0 0 18px; padding: 0; }
    .terms li { margin-bottom: 2px; }

    .totals {
      min-width: 260px;
      font-size: 13px;
    }
    .totals .row {
      display: flex; justify-content: space-between;
      padding: 6px 0;
      color: #4B5563;
    }
    .totals .row.discount { color: #DC2626; }
    .totals .row.grand {
      border-top: 2px solid #10B981;
      padding-top: 10px;
      margin-top: 6px;
      font-size: 16px;
      font-weight: 700;
      color: #047857;
    }
    .totals .row.paid { color: #065F46; font-weight: 600; }
    .totals .row.due { color: #DC2626; font-weight: 600; }

    /* === SIGNATURE === */
    .signature {
      margin-top: 40px;
      display: flex;
      justify-content: space-between;
      gap: 24px;
    }
    .sig-block {
      text-align: center;
      flex: 1;
    }
    .sig-block .line {
      margin-top: 50px;
      border-top: 1px dashed #9CA3AF;
      padding-top: 6px;
      font-size: 11px;
      color: #6b7280;
      letter-spacing: 0.5px;
    }

    /* === PRINT === */
    /* Force browsers to keep background colors when printing. Without this,
       Chrome/Firefox/Safari strip the emerald header (and other colored
       pills/badges) and print only black text on white. */
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    @media print {
      body { padding: 12px; }
      @page { margin: 12mm; size: A4; }
    }
  </style>
</head>
<body>
  <div class="invoice">

    <!-- HEADER -->
    <div class="header">
      <div class="company">
        <div class="logo">${escape((companyName[0] || "S").toUpperCase())}</div>
        <div class="info">
          <h1>${escape(companyName)}</h1>
          ${companyAddress ? `<p class="addr">${escape(companyAddress)}</p>` : ""}
          ${companyPhone || companyEmail
            ? `<p class="contact">${companyPhone ? `<strong>Contact:</strong> ${escape(companyPhone)}` : ""}${companyPhone && companyEmail ? ", " : ""}${companyEmail ? `<strong>Email:</strong> ${escape(companyEmail)}` : ""}</p>`
            : ""}
          ${companyWebsite ? `<p class="contact"><strong>Website:</strong> ${escape(stripUrlScheme(companyWebsite))}</p>` : ""}
          ${companyVat ? `<p><strong>VAT:</strong> ${escape(companyVat)}</p>` : ""}
        </div>
      </div>
      <div class="meta">
        <div class="badge-status">SALES INVOICE</div>
        <div class="title">Sold Goods Invoice</div>
        <div class="row"><strong>Invoice No#</strong> ${escape(sell.invoiceNo)}</div>
        <div class="row"><strong>Date:</strong> ${escape(formatDate(sell.sellDate))}</div>
      </div>
    </div>

    <!-- CUSTOMER -->
    <div class="customer">
      <div>
        <h3>Bill To</h3>
        <div class="name">${escape(customerName)}</div>
        ${customerMobile ? `<div class="line"><strong>Contact:</strong> ${escape(customerMobile)}</div>` : ""}
        ${customerAddress ? `<div class="line">${escape(customerAddress)}</div>` : ""}
      </div>
      <div style="text-align:right;">
        <h3>Payment</h3>
        <div class="name" style="color:#10B981;">${due > 0 ? "PARTIAL / DUE" : "PAID"}</div>
        <div class="line">Paid: ${formatCurrency(paid)}</div>
        ${due > 0 ? `<div class="line" style="color:#DC2626;">Due: ${formatCurrency(due)}</div>` : ""}
      </div>
    </div>

    <!-- LINE ITEMS -->
    <table class="items">
      <thead>
        <tr>
          <th style="width:40px;">No.</th>
          <th>Product Specifications</th>
          <th style="width:90px;">Condition</th>
          <th style="width:90px;">Warranty</th>
          <th style="width:60px;">Qty</th>
          <th style="width:100px;">Price</th>
          <th style="width:110px;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    <!-- FOOTER -->
    <div class="footer">
      <div class="terms">
        <h3>General Business Terms &amp; Policies</h3>
        <ol>
          <li>Goods once sold are not returnable unless defective and reported within 7 days.</li>
          <li>Warranty claims must be accompanied by the original invoice.</li>
          <li>Disputes, if any, are subject to local jurisdiction.</li>
        </ol>
      </div>
      <div class="totals">
        <div class="row"><span>Subtotal</span><span>${formatCurrency(subtotal)}</span></div>
        ${discount > 0 ? `<div class="row discount"><span>Discount (-)</span><span>-${formatCurrency(discount)}</span></div>` : ""}
        <div class="row grand"><span>Total Net Payable</span><span>${formatCurrency(grandTotal)}</span></div>
        <div class="row paid"><span>Paid</span><span>${formatCurrency(paid)}</span></div>
        ${due > 0 ? `<div class="row due"><span>Due</span><span>${formatCurrency(due)}</span></div>` : ""}
      </div>
    </div>

    <!-- SIGNATURE -->
    <div class="signature">
      <div class="sig-block">
        <div class="line">Customer Signature</div>
      </div>
      <div class="sig-block">
        <div class="line">Authorized Signature</div>
      </div>
    </div>

  </div>
</body>
</html>`
}

function stripUrlScheme(url: string): string {
  return String(url).replace(/^[a-zA-Z]+:\/\//, "").replace(/\/+$/, "")
}

function escape(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
