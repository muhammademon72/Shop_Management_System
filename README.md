# Shop Management System

Live at: https://jarsys.space-z.ai

## Login
- Email: `admin@shop.com`
- Password: `admin123`

## Tech Stack
- Next.js 16 + Turbopack + React 19 + TypeScript
- Tailwind CSS 4 + shadcn/ui
- Turso (libSQL) cloud database via @libsql/client
- Zustand auth store

## Modules
- Sales, Purchases, Quotations, Inventory Stock
- Customers, Suppliers, Products, Brands, Categories, UOMs
- Conditions, Warranties, Users, Company Profile
- Backup/Restore (JSON export/import)

## Local Development
```bash
npm install
cp .env.example .env
# Edit .env with your Turso credentials
npm run dev
```

## Build
```bash
npm run build
npm start
```
