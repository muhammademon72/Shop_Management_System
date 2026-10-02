# Shop Management System — Work Log

This file is the shared work log for all agents working on the Shop Management System project.

## Project Overview

A comprehensive Shop Management System built with Next.js 16 + TypeScript + Tailwind + shadcn/ui + Prisma (SQLite). The system includes the following modules:

1. **Dashboard** — KPI overview (totals + recent activity)
2. **Product Manage**
   - Categories List (Name, Type, Status, Actions)
   - Brand List (Name, Status, Actions)
   - UOM List (Name, Status, Actions)
   - Product List (Product, Category, UOM, Status, Actions)
3. **Purchase Manage**
   - Purchase List — master/detail: header (Purchase Date, Supplier Info, Invoice No, Total Price, Discount, Grand Total, Attachment) + line items (Product, Category, Brand, Model, Serial, Qty, Price, Total, Condition, W.Date, W.Days, Remarks)
   - Suppliers List (Name, Mobile, Address, Status, Actions)
   - Inventory Stock (Date, Invoice, Product, Brand, Model, Serial, Qty, UOM, Remarks)
4. **Sell Manage**
   - Quotation List (master/detail with line items)
   - Sell List (master/detail with line items)
   - Customer List (Name, Mobile, Address, Status, Actions)
5. **Settings Manage**
   - Company Profile
   - User Manage
   - Backup & Restore (export/import JSON)

## Stack
- Next.js 16 App Router, TypeScript 5, Tailwind CSS 4, shadcn/ui (New York), Prisma + SQLite, Zustand for client state, TanStack Query for server state where useful, Lucide icons.
- All API routes use relative paths only.
- Single user-visible route `/` (src/app/page.tsx) — uses client-side tab/route state inside a sidebar shell.

## Style Notes
- DO NOT use indigo/blue primary colors. Use a neutral zinc/slate or emerald palette.
- Mobile-first responsive. Sticky footer not required (admin dashboard), but content must scroll properly.
- Use existing shadcn/ui components — do NOT rebuild from scratch.

---
Task ID: SMS-MAIN
Agent: full-stack-developer
Task: Build complete Shop Management System

Work Log:
- Initialized the fullstack-dev environment (dev.sh started, dev.log available).
- Read existing project: Next.js 16 + TS 5 + Tailwind 4 + shadcn/ui (New York) scaffold already present; Prisma + SQLite configured via `src/lib/db.ts`.
- Replaced `prisma/schema.prisma` with all 14 models: Category, Brand, Uom, Product, Supplier, Purchase, PurchaseItem, InventoryStock, Customer, Quotation, QuotationItem, Sell, SellItem, CompanyProfile, AppUser. Child items stored in their own tables (no list primitives in SQLite).
- Ran `bun run db:push` — schema synced + Prisma Client generated.
- Built shared client infrastructure:
  - `src/components/query-provider.tsx` — TanStack Query provider (with `'use client'`).
  - `src/components/theme-provider.tsx` — next-themes wrapper.
  - `src/lib/store.ts` — Zustand store (`activeModule`, `mobileSidebarOpen`).
  - `src/lib/types.ts` — TypeScript interfaces for every entity + `num()` helper.
  - `src/lib/format.ts` — currency/date/number formatters.
  - `src/lib/queries.ts` — `useList` / `useOne` fetcher hooks.
- Updated `src/app/layout.tsx` — wraps app with ThemeProvider, QueryProvider, Toaster (sonner + shadcn), and sets the page title to "Shop Management System".
- Updated `src/app/page.tsx` to render `<AppShell/>` as the single visible route.
- Built the application shell + navigation:
  - `src/components/app-shell.tsx` — desktop sidebar + mobile Sheet sidebar + sticky header (with module label, theme toggle, notifications, admin avatar) + main content area switching on `activeModule`.
  - `src/components/sidebar.tsx` — sidebar nav grouped into DASHBOARD / PRODUCT MANAGE / PURCHASE MANAGE / SELL MANAGE / SETTINGS MANAGE, each item with a Lucide icon and emerald active state.
- Built reusable UI primitives:
  - `src/components/data-table.tsx` — `DataTable<T>` with search input, toolbar slot, skeleton loading rows, empty-state with `Inbox` icon, and optional footer.
  - `src/components/form-dialog.tsx` — `FormDialog` wrapper around shadcn Dialog with form submit handling, 4 sizes, optional footer.
  - `src/components/confirm-dialog.tsx` — `ConfirmDialog` (AlertDialog) for deletes + small `IconButton` helper.
  - `src/components/status-badge.tsx` — green/gray status pill.
  - `src/components/page-header.tsx` — title + description + actions layout.
- Built all 14 API routes under `src/app/api/`:
  - `categories`, `brands`, `uoms`, `products` — full GET/POST/PUT/DELETE.
  - `suppliers`, `customers` — full CRUD.
  - `purchases`, `quotations`, `sells` — full CRUD with `include: { items: {...} }` and `$transaction` for atomic parent+children writes; purchases also auto-create `InventoryStock` rows on save.
  - `inventory` — full CRUD.
  - `company` — GET (single record) + PUT (upserts the single company profile row).
  - `users` — full CRUD; password omitted from select on read.
  - `backup` — GET exports all 14 tables as JSON with `Content-Disposition`; POST wipes & re-imports with foreign-key remapping (idMap for category/brand/uom/product/supplier/purchase/customer).
  - `stats` — aggregated counts + sums + recent 5 purchases & sells for the dashboard.
- Built all 14 module components under `src/components/modules/`:
  - `dashboard.tsx` — 8 KPI cards (Products, Suppliers, Customers, Sales, Purchases, Inventory rows, Low Stock, Live), Recent Purchases table, Recent Sales table, Quick Actions buttons. KPIs clickable to deep-link to the relevant module.
  - `categories.tsx` — table + add/edit dialog (Name, Type [Goods/Service], Status switch).
  - `brands.tsx` — table + add/edit dialog (Name, Status).
  - `uoms.tsx` — table + add/edit dialog (Name, Status).
  - `products.tsx` — table + add/edit dialog (Name, Category select, Brand select, UOM select, Model, Serial, Status) + status filter select.
  - `suppliers.tsx` — table + add/edit dialog (Name, Mobile, Address, Status).
  - `customers.tsx` — table + add/edit dialog (Name, Mobile, Address, Status).
  - `purchases.tsx` — master list + create/edit dialog with header (Date, Supplier select, Invoice No, Attachment filename, Remarks), repeatable line items table (Product select auto-fills Category/Brand/Model/Serial, Qty, Price, Total auto, Condition select, W.Date, W.Days, Remarks, Remove), footer totals (Total Price auto-sum, Discount, Grand Total), plus a View dialog with read-only details.
  - `quotations.tsx` — same master/detail pattern as Purchases with simpler line items (Product, Qty, Price, Total, Remarks), discount input, grand total auto, plus view dialog.
  - `sells.tsx` — same pattern as Quotations + Paid Amount input with auto-calculated Due Amount; table shows Due as green/rose badge. Save mutation includes a TODO comment about decrementing inventory (deferred as per spec).
  - `inventory.tsx` — table (Date, Invoice, Product, Brand, Model, Serial, Qty, UOM, Remarks) + add/edit dialog; selecting a product auto-fills Brand/Model/Serial/UOM.
  - `company-profile.tsx` — single-record form (Name, Address, Phone, Email, Website, VAT No, Logo URL) with live preview card; auto-loads via GET /api/company; creates on first save.
  - `users.tsx` — table (Name, Email, Mobile, Role badge, Status) + add/edit dialog (Name, Email, Mobile, Role select [Admin/Manager/Staff], Status switch, Password required only on create).
  - `backup-restore.tsx` — Export Backup button (downloads JSON) + Import Backup file input that opens a confirmation dialog before overwriting + info card.
- Created `prisma/seed.ts` and added `seed` npm script (`tsx prisma/seed.ts`); installed `tsx` dev dep. Seed inserts: 5 categories, 5 brands, 5 UOMs, 10 linked products, 3 suppliers, 2 purchases (4 items total), 5 inventory rows (4 from purchases + 1 manual), 3 customers, 2 quotations (4 items), 2 sells (2 items), 1 company profile, 2 users (admin + staff). Ran successfully — dashboard shows 10 products / 3 suppliers / 3 customers / $2,650 sales / $9,200 purchases / 5 inventory rows.
- Ran `bun run lint` — only one empty-interface error in `users.tsx`; fixed by switching `UserRow` from `interface extends` to `type` alias. Final lint is clean (0 errors, 0 warnings).
- Verified with Agent Browser (Chrome 154):
  - `/` loads 200 OK; sidebar shows all 5 groups with all 14 modules.
  - Dashboard renders 8 KPI cards with seeded numbers (not 0) + recent purchases/sales tables.
  - Categories module: list loads, "+ Add Category" opens dialog, submitting a new "Test Category" succeeded and the new row appeared at top of the list.
  - Products module: list loads with all 10 seeded products, status filter dropdown present.
  - Purchases module: list loads; "New Purchase" dialog opens with header section, full line items table (Product/Category/Brand/Model/Serial/Qty/Price/Total/Condition/W.Date/W.Days/Remarks/Remove), and footer totals.
  - Sells module: list loads with Paid/Due columns; Due badge shows $500.00 (rose) for the partial-payment sale and $0.00 (emerald) for the closed one.
  - Company Profile module: form pre-filled from GET /api/company.
  - Backup & Restore module: both Export and Import buttons render.
  - No browser errors, no console errors, no dev.log errors after initial fix (one early `Module not found` for dashboard.tsx that I had failed to write on the first pass, and a `useState in server component` from missing `'use client'` on QueryProvider — both fixed).

Stage Summary:
- All 14 Prisma models live; `bun run db:push` clean.
- 14 module components, 14 API routes, plus `/api/stats`; reusable `DataTable`/`FormDialog`/`ConfirmDialog`/`StatusBadge`/`PageHeader`.
- TanStack Query + Sonner toasts wired in layout; Zustand store drives single-route navigation.
- Seed script runs and produces non-empty dashboard; lint clean.
- Verified end-to-end via Agent Browser — Dashboard KPIs, list views, create dialog, master/detail purchase form all work.

---
Task ID: SMS-PATCH-14
Agent: main
Task: Remove Brand, Model, Serial from Add Product form (re-applied — earlier change had been reverted)

Work Log:
- Re-applied the SMS-PATCH-1 changes to `src/components/modules/products.tsx` (the file had been reset to its pre-patch state):
  - Removed `brandId`, `model`, `serial` from `empty()` initial state.
  - Removed the `brands` useQuery (no longer needed in this module).
  - Removed `Brand` from the type imports (now `import type { Product, Category, Uom }`).
  - Simplified the search filter to only match `name` (no longer matches model/serial).
  - Removed the Brand column from the Product List table — now shows: Product / Category / UOM / Status / Actions.
  - Removed the Model subtitle from the Product cell (just shows the product name now).
  - Removed the Brand Select, Model Input, and Serial Input fields from the Add/Edit Product form — now shows only Product Name, Category, UOM, Status.
- Lint: clean (0 errors, 0 warnings).

Verification (Agent Browser):
- Navigated via sidebar to Product List — heading "Products", columns: Product / Category / UOM / Status / Actions (no Brand column). ✓
- Opened Add Product dialog — only Product Name / Category / UOM / Status fields visible (no Brand / Model / Serial inputs). ✓
- No leftover Brand/model/serial references in the file (grep confirmed). ✓

Note: While testing, I noticed that `src/lib/store.ts` had ALSO been reset to its pre-SMS-PATCH-8 state (URL-based module navigation via `useActiveModule` is gone, so `?module=products` no longer loads the Products module directly — only the sidebar click works). Since the user's current instruction was specifically about Brand/Model/Serial removal, I did NOT touch `store.ts` or any other file. The URL-based module navigation is a separate concern and would need explicit user permission to restore.

---
Task ID: SMS-PATCH-15
Agent: main
Task: Format the Purchases List home page to match the user-uploaded reference photo

Work Log:
- Replaced the generic `DataTable` usage in `src/components/modules/purchases.tsx` with a custom inline table that matches the user's uploaded reference photo exactly.
- Added helper functions inline in the module:
  - `fmtDMY(iso)` — formats ISO date as DD-MM-YYYY (matches the image's date format).
  - `fmtPurchaseId(row)` — formats the purchase cuid as "Pur-{last6chars uppercased}" to match the image's "Pur-260001" style sequential-looking ID.
  - `fmtAmount(n)` — formats a number with thousands separators and NO currency symbol (matches the image's plain "42500" style).
- Built the table with the image's exact 7 columns:
  - Purchase id | Purchase Date | Supplier Name | Invoice Number | Total Amount | Attach Invoice | Actions
- Header styling:
  - Teal/cyan gradient background (`linear-gradient(to bottom, #4DB6AC, #80CBC4)`).
  - White text, bold, center-aligned, with thin white border between header cells.
- Body rows:
  - White background.
  - Dashed gray borders between cells (`border border-dashed border-gray-300`) — matches the image's dashed/dotted grid lines.
- "Attach Invoice" column:
  - If an attachment URL exists → blue hyperlink "Attach Invoice" (color `#0066cc`) that opens/downloads the file in a new tab.
  - If no attachment → blue "Attach Invoice" button that opens the Edit dialog (so the user can attach an invoice).
- "Actions" column:
  - Blue text links "View, Edit, Delete" (comma-separated, color `#0066cc`) — matches the image's action-link style instead of icon buttons.
- Footer row:
  - "Total Amount" label spans 4 cells (right-aligned, bold).
  - The actual sum (e.g. "9,200") in a 5th cell with a thick black border to emphasize it.
  - Last 2 cells empty with dashed borders.
- Removed unused `DataTable`/`Column` imports.
- Kept the existing search box functionality (now sits above the custom table).
- Lint: clean (0 errors, 0 warnings).

Verification (Agent Browser + VLM):
- All 7 column headers visible in the correct order: Purchase id / Purchase Date / Supplier Name / Invoice Number / Total Amount / Attach Invoice / Actions. ✓
- VLM described the header background as "teal/cyan" (light turquoise/teal). ✓
- VLM confirmed the "Total Amount" row at the bottom showing the sum (9,200) in a distinct box. ✓
- VLM confirmed "Attach Invoice" and "View, Edit, Delete" are displayed as blue hyperlinks. ✓
- VLM zoomed-in check confirmed the horizontal row separators are DASHED/DOTTED (matches the image's dashed grid lines), while the outer table perimeter is solid. ✓

Stage Summary:
- The Purchases List home page is now formatted to match the user-uploaded reference photo. The table has the exact 7 columns (Purchase id / Purchase Date / Supplier Name / Invoice Number / Total Amount / Attach Invoice / Actions), teal/cyan header, dashed cell borders, blue hyperlink action links, and a footer "Total Amount" row showing the sum of all grand totals.

---
Task ID: SMS-PATCH-16
Agent: main
Task: Redesign New Purchase form to match user-uploaded reference photo

Work Log:
- Replaced the entire New Purchase form layout in `src/components/modules/purchases.tsx` to match the user-uploaded reference photo. The new form has 3 main sections:

  **1. Header section — 2-column HTML table layout:**
    - Row 1: Purchase Date (left) | Invoice Number (right)
    - Row 2: Supplier Name (Select, left) | Discount Amount (number input, right)
    - Row 3: Supplier Address (auto-fill textarea from selected supplier, left) | File Attach (file input, right)
    - Labels are in light-gray cells (bg-gray-100), inputs in white cells, all with solid gray borders.

  **2. Line items table — 11 columns with light-blue header (#9DC3E6):**
    - Columns: Product Name | Category | Brand Name | Product Model | Serial Number | Warranty | Qty | Price | Total Amount | Remarks | Actions
    - Replaced the old Condition/W.Date/W.Days (3 separate columns) with a single "Warranty" free-text column where the user can type "30 Days", "1 Year", etc.
    - All inputs are borderless (border-0) and transparent so the table looks like a spreadsheet.
    - Actions column has an X delete button per row.

  **3. Table footer (tfoot):**
    - Spans 8 cells empty + "Total Amount:" label (bold, right-aligned) + sum value in a thick black-bordered cell + "Add Row" button (cols 10-11).

  **4. Bottom section — 2-column:**
    - Left: Note panel — textarea bound to `form.remarks`.
    - Right: Status panel — small 2-column 3-row table showing Status / Saved headers with Draft/Confirmed radio-button-style toggles.

- Updated `ItemRow` interface: removed `condition`, `warrantyDate`, `warrantyDays` and added a single `warranty: string` field (free-text like "30 Days"). The warranty text is persisted by repurposing the existing `condition` column on PurchaseItem (the image's format doesn't have a separate Condition column, so this is a clean reuse).
- Updated `PurchaseForm` interface: added `discount: string` (was hardcoded to 0) and `status: "Draft" | "Confirmed"` for the status panel.
- Updated `saveMutation`: now sends `discount: Number(data.discount) || 0` instead of hardcoded 0, sends `condition: it.warranty || null` (repurposed), and `warrantyDate: null, warrantyDays: null`.
- Updated `handleEdit`: extracts `warranty: it.condition ?? ""` when loading an existing purchase for edit.
- Removed unused `totalItems` and `grandTotal` local variables (no longer rendered).
- Lint: clean (0 errors, 0 warnings).

Verification (Agent Browser + VLM):
- DOM eval confirmed all expected elements are present: Purchase Date/Invoice Number/Supplier Name/Discount Amount/Supplier Address/File Attach inputs, all 11 column headers, Add Row button, Draft/Confirmed buttons, Note textarea, file input. ✓
- Clicked Add Row button via DOM — line items table went from 1 row to 2 rows. ✓ (Button works.)
- VLM described the form as matching the expected layout: 2-column header grid with all 6 fields, 11-column line items table with light-blue header, Total Amount footer with sum in a black-bordered box, Note + Status panels at the bottom, Cancel button at the bottom right. ✓
- VLM design assessment: "the format is generally clean and well-organized. Logical Grouping (Head-Body-Foot structure expected in accounting/ERP systems), Alignment (clean 2-column layout + distinct blue table header), Whitespace (adequate padding between sections), Visual Hierarchy (Total Amount bolded and boxed)." ✓

Note: The "File Attach" field is a plain HTML `<input type="file">` that stores only the filename (not the actual file upload) — the upload API endpoint and FileUpload component from earlier patches (SMS-PATCH-12) were lost in the reset. If actual file upload is needed again, that work would need to be re-done explicitly.

Stage Summary:
- The New Purchase form now matches the user-uploaded reference photo: 2-column header grid (Purchase Date/Supplier Name/Supplier Address on left, Invoice Number/Discount Amount/File Attach on right), an 11-column line items table with a light-blue (#9DC3E6) header (Product Name / Category / Brand Name / Product Model / Serial Number / Warranty / Qty / Price / Total Amount / Remarks / Actions), a table footer with "Total Amount:" label + sum in a black-bordered box + Add Row button, and a bottom 2-column section with Note textarea (left) and Status panel showing Draft/Confirmed options (right). The Warranty column is persisted in the existing `condition` schema column (repurposed since the image's format drops the separate Condition column).
