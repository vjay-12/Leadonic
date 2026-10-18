# Leadonic - Cold Calling Lead Tracker

A fast, clean lead tracker designed for cold calling workflows. Leads can be imported from Google Maps scraper Excel/CSV spreadsheets or entered manually. Features customizable statuses, categories, inline editing, duplicate protection, dashboard analytics, and cross-tabulation pipeline reports.

## Tech Stack

- **Frontend:** Vite, React 19, TypeScript, Tailwind CSS, TanStack Query, React Router, SheetJS (`xlsx`)
- **Backend:** Express, TypeScript, Zod, Cookie-Parser
- **Database:** Neon Postgres (serverless PostgreSQL) via Prisma ORM
- **Deployment:** Vercel (Frontend SPA + Express Serverless Functions)

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

| Variable | Description | Example / Notes |
|---|---|---|
| `DATABASE_URL` | Pooled Neon PostgreSQL connection URL | `postgresql://user:pass@ep-*-pooler.neon.tech/neondb?sslmode=require` |
| `DIRECT_URL` | Direct unpooled Neon connection URL (for migrations) | `postgresql://user:pass@ep-*.neon.tech/neondb?sslmode=require` |
| `APP_PASSWORD` | Single shared authentication password | e.g. `secretpassword123` |
| `SESSION_SECRET` | Secret key used for signing session cookies | 32+ character random secret string |

---

## Local Development Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Generate Prisma client and run database migrations:**
   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```

3. **Seed default statuses and categories:**
   ```bash
   npx tsx prisma/seed.ts
   ```

4. **Generate sample spreadsheet (optional):**
   ```bash
   npx tsx samples/generate-sample.ts
   ```

5. **Start development servers (API on port 3001, Vite frontend on port 5173):**
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser and sign in using your `APP_PASSWORD`.

---

## Database Management & Production Deployments

- **Run migrations in production:**
  ```bash
  npx prisma migrate deploy
  ```
- **Re-seed statuses and categories safely (idempotent upsert):**
  ```bash
  npm run prisma:seed
  ```
- **Build production client bundle:**
  ```bash
  npm run build
  ```

---

## Scraper Columns Supported

When importing Excel/CSV files, the following column headers are automatically detected:
`title`, `phone`, `emails`, `website`, `category` (stored as `maps_category`), `address`, `review_rating`, `review_count`, `has_website`, `needs_website`, `erp_match`, `needs_erp`, `priority_score`, `priority`.
