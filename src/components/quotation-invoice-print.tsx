"use client"

import type { Quotation, CompanyProfile } from "@/lib/types"
import { formatCurrency, formatDate } from "@/lib/format"

/**
 * Print a Quotation as a printable HTML invoice — mirrors the Sell invoice
 * print layout (header + Bill To + line items + footer + signature lines)
 * but adapted for quotations:
 *   - "QUOTATION" badge instead of "SALES INVOICE"
 *   - "Quotation No#" instead of "Invoice No#"
 *   - "Quotation Date" instead of "Sell Date"
 *   - Includes Warranty in the line items' product-spec badges
 *   - No Paid/Due columns (quotations are not invoices)
 *   - Footer shows only Subtotal / Discount / Total Net Payable
 */
export function printQuotationInvoice(q: Quotation, company: CompanyProfile | null) {
  const html = renderInvoiceHtml(q, company)
  const win = window.open("", "_blank", "width=900,height=1100")
  if (!win) {
    alert("Please allow pop-ups to print the quotation.")
    return
  }
  win.document.open()
  win.document.write(html)
  win.document.close()
  win.onload = () => {
    setTimeout(() => {
      win.focus()
      win.print()
    }, 250)
  }
}

function renderInvoiceHtml(q: Quotation, company: CompanyProfile | null): string {
  const companyName = company?.name ?? "Your Company"
  const companyPhone = company?.phone ?? ""
  const companyEmail = company?.email ?? ""
  const companyAddress = company?.address ?? ""
  const companyWebsite = company?.website ?? ""
  const companyVat = company?.vatNo ?? ""

  const customer = q.customer
  const customerName = customer?.name ?? "Walk-in Customer"
  const customerMobile = customer?.mobile ?? ""
  const customerAddress = customer?.address ?? ""

  const items = q.items ?? []
  const subtotal = q.totalPrice
  const discount = q.discount
  const grandTotal = q.grandTotal

  const rows = items.length === 0
    ? `<tr><td colspan="6" style="padding:24px;text-align:center;color:#6b7280;font-style:italic;">No line items.</td></tr>`
    : items.map((it, idx) => {
        const name = it.product?.name ?? "—"
        const brand = it.brand ?? null
        const model = it.model ?? null
        const serial = it.serial ?? null
        const condition = it.condition ?? null
        const warranty = it.warrantyText ?? null

        const badges: string[] = []
        if (brand) badges.push(`<span class="badge brand">Brand: ${escape(brand)}</span>`)
        if (model) badges.push(`<span class="badge model">Model: ${escape(model)}</span>`)
        if (serial) badges.push(`<span class="badge serial">Serial: ${escape(serial)}</span>`)
        if (warranty) badges.push(`<span class="badge warranty">Warranty: ${escape(warranty)}</span>`)

        return `
          <tr>
            <td class="num">${idx + 1}</td>
            <td>
              <div class="prod-name">${escape(name)}</div>
              <div class="badges">${badges.join("")}</div>
            </td>
            <td class="center">${condition ? `<span class="pill green">${escape(condition)}</span>` : "—"}</td>
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
  <title>Quotation ${escape(q.invoiceNo)}</title>
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
    .invoice { max-width: 800px; margin: 0 auto; }

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
    .company .info p { margin: 1px 0; color: #374151; font-size: 12px; }
    .company .info .contact strong { color: #111827; font-weight: 600; }
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
      background: #F3F4F6;
      color: #374151;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      padding: 10px 12px;
      text-align: left;
      border-bottom: 2px solid #E5E7EB;
    }
    table.items tbody td {
      padding: 12px;
      border-bottom: 1px solid #F3F4F6;
      vertical-align: top;
    }
    table.items td.num { text-align: right; }
    table.items td.center { text-align: center; }
    table.items td.bold { font-weight: 700; }

    .prod-name { font-weight: 600; color: #111827; font-size: 13px; margin-bottom: 4px; }
    .badges { display: flex; flex-wrap: wrap; gap: 4px; }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      font-size: 10px;
      border: 1px solid #E5E7EB;
      border-radius: 999px;
      color: #374151;
      background: #F9FAFB;
    }
    .badge.serial { background: #EFF6FF; border-color: #BFDBFE; color: #1D4ED8; }
    .badge.warranty { background: #ECFCCB; border-color: #D9F99D; color: #4D7C0F; }

    .pill {
      display: inline-block;
      padding: 3px 10px;
      font-size: 11px;
      font-weight: 600;
      border-radius: 999px;
    }
    .pill.green { background: #D1FAE5; color: #065F46; }

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
          ${companyAddress ? `<p class="contact">${escape(companyAddress)}</p>` : ""}
          ${companyPhone || companyEmail
            ? `<p class="contact">${companyPhone ? `<strong>Contact:</strong> ${escape(companyPhone)}` : ""}${companyPhone && companyEmail ? ", " : ""}${companyEmail ? `<strong>Email:</strong> ${escape(companyEmail)}` : ""}</p>`
            : ""}
          ${companyWebsite ? `<p class="contact"><strong>Website:</strong> ${escape(stripUrlScheme(companyWebsite))}</p>` : ""}
          ${companyVat ? `<p class="contact"><strong>VAT:</strong> ${escape(companyVat)}</p>` : ""}
        </div>
      </div>
      <div class="meta">
        <div class="badge-status">QUOTATION</div>
        <div class="title">Quotation</div>
        <div class="row"><strong>Quotation No#</strong> ${escape(q.invoiceNo)}</div>
        <div class="row"><strong>Date:</strong> ${escape(formatDate(q.quotationDate))}</div>
      </div>
    </div>

    <!-- CUSTOMER -->
    <div class="customer">
      <div>
        <h3>Quotation To</h3>
        <div class="name">${escape(customerName)}</div>
        ${customerMobile ? `<div class="line"><strong>Contact:</strong> ${escape(customerMobile)}</div>` : ""}
        ${customerAddress ? `<div class="line">${escape(customerAddress)}</div>` : ""}
      </div>
      <div style="text-align:right;">
        <h3>Validity</h3>
        <div class="name" style="color:#10B981;">PROPOSED</div>
        <div class="line">Quotation valid for 30 days</div>
      </div>
    </div>

    <!-- LINE ITEMS -->
    <table class="items">
      <thead>
        <tr>
          <th style="width:40px;">No.</th>
          <th>Product Specifications</th>
          <th style="width:90px;">Condition</th>
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
        <h3>Quotation Terms &amp; Conditions</h3>
        <ol>
          <li>This quotation is valid for 30 days from the date of issue.</li>
          <li>Prices are subject to availability at the time of order confirmation.</li>
          <li>Warranty coverage is mentioned per item; standard terms apply.</li>
        </ol>
      </div>
      <div class="totals">
        <div class="row"><span>Subtotal</span><span>${formatCurrency(subtotal)}</span></div>
        ${discount > 0 ? `<div class="row discount"><span>Discount (-)</span><span>-${formatCurrency(discount)}</span></div>` : ""}
        <div class="row grand"><span>Total Net Payable</span><span>${formatCurrency(grandTotal)}</span></div>
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
