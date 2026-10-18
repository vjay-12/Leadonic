# Lead Tracker: Build Plan and Agent Prompt

Save this file as `docs/LEAD_TRACKER_PLAN.md` in the CRM repo. Tell the agent: **"Read docs/LEAD_TRACKER_PLAN.md fully, then follow it step by step. Tick the checklist at the bottom as you finish each milestone."**

---

## 0. Ground rules (read first)

1. **Work only on the `main` branch.** Do not create any git branch. Commit small and often straight to `main`.
2. **This is the CRM repo, not Yaazhi.** Yaazhi (`https://github.com/vjay-12/Yaazhi`, live at `https://yaazhi-boutique.vercel.app/#overview`) is a **read-only reference** for look and feel and project layout. Never edit, delete, or push anything to the Yaazhi repo. If the current working folder is the Yaazhi repo, **stop and ask me** before doing anything in section 1.
3. Keep it **simple**. Build only what this plan lists. No AI features, no chatbots, no call queue, no tasks, no invoices.
4. The UI must look like a normal, clean business app (like Yaazhi), not a flashy "AI" template.
5. Never commit secrets. Use `.env` locally and add every variable to `.env.example` with empty values.

---

## 1. Reset the repo (record the old work, then delete it)

Do these in order:

1. Run `git status` and `git log --oneline -20`. List the top-level files and folders.
2. Create `docs/PREVIOUS_WORK.md` that records what existed before: what the app did, the stack and key libraries, the main folders/files, which features were finished or unfinished, and anything worth reusing. Keep it to one page.
3. Commit it on `main`: `docs: record previous work before reset`.
4. Create a tag so the old code stays recoverable: `git tag pre-lead-tracker-reset` and push it. (A tag is not a branch.)
5. Delete the old code: remove the old source, API, backend, prisma and config files. **Keep:** `.git`, `docs/`, `README.md`, `.gitignore`, and this plan.
6. Commit: `chore: remove old code, start lead tracker`.
7. Scaffold the new project as described below and push to `main`.

---

## 2. What we are building

A simple lead tracker for cold calling. Leads come from a scraper Excel file (Google Maps data) or are added by hand. Every lead has a **status** dropdown (like my Google Sheet) and a **category** (for example School, Boutique). Statuses and categories are managed in Settings.

**Sidebar:** Dashboard, Leads, Report, Settings.

### Scraper columns (exact headers in the Excel file)

`title, phone, emails, website, category, address, review_rating, review_count, has_website, needs_website, erp_match, needs_erp, priority_score, priority`

The scraper's `category` column is the Google Maps category. Store it as **`maps_category`**. The new **Category** field (School, Boutique, ...) is my own grouping, chosen by me on add or import.

### Default statuses (seed these, with colors)

| Status | Color |
| --- | --- |
| Confirm | green `#15803D` |
| Not Interested | red `#B91C1C` |
| Interested - follow back | blue `#1D4ED8` |
| Unavailable - follow back | brown `#92400E` |
| Not Sure | yellow `#CA8A04` |

A lead with **no status** shows "Not called" (grey). Seed categories: **School**, **Boutique**.

---

## 3. Stack

- **Frontend:** Vite + React + TypeScript. Match Yaazhi's styling approach (check its `package.json` and `src`). If it has no clear approach, use Tailwind.
- **Data fetching:** TanStack Query. **Routing:** React Router. **Excel parsing:** SheetJS (`xlsx`), in the browser.
- **Backend:** Express + TypeScript in `backend/src`, exposed to Vercel through `api/index.ts` (same layout as Yaazhi; check how it does this and mirror it).
- **Database:** **Neon Postgres** through **Prisma**. Use the Prisma version your install gives you and adapt the schema syntax to it.
- **Hosting:** Vercel (frontend and API).

### Neon setup

1. Create a **new, separate Neon project/database** for this app. **Do not use Yaazhi's database.**
2. Two env vars: `DATABASE_URL` (the **pooled** Neon connection string) and `DIRECT_URL` (the **direct** one, used by migrations).
3. Run migrations locally with `npx prisma migrate dev`, and in production with `npx prisma migrate deploy` against `DIRECT_URL`. Do not run migrations inside the Vercel build.
4. Table and column names are lowercase snake_case (`@@map` and `@map`).

### Environment variables (`.env.example`)

```
DATABASE_URL=
DIRECT_URL=
APP_PASSWORD=
SESSION_SECRET=
```

---

## 4. Database schema (Prisma)

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

generator client {
  provider = "prisma-client-js"
}

model LeadStatus {
  id        Int      @id @default(autoincrement())
  name      String   @unique
  color     String   @default("#64748B")
  sortOrder Int      @default(0) @map("sort_order")
  createdAt DateTime @default(now()) @map("created_at")
  leads     Lead[]

  @@map("lead_statuses")
}

model LeadCategory {
  id        Int           @id @default(autoincrement())
  name      String        @unique
  sortOrder Int           @default(0) @map("sort_order")
  createdAt DateTime      @default(now()) @map("created_at")
  leads     Lead[]
  batches   ImportBatch[]

  @@map("lead_categories")
}

model ImportBatch {
  id           Int           @id @default(autoincrement())
  fileName     String        @map("file_name")
  categoryId   Int?          @map("category_id")
  category     LeadCategory? @relation(fields: [categoryId], references: [id])
  addedCount   Int           @default(0) @map("added_count")
  skippedCount Int           @default(0) @map("skipped_count")
  errorCount   Int           @default(0) @map("error_count")
  createdAt    DateTime      @default(now()) @map("created_at")
  leads        Lead[]

  @@map("import_batches")
}

model Lead {
  id              Int           @id @default(autoincrement())
  title           String
  phone           String?
  phoneNormalized String?       @map("phone_normalized")
  dedupeKey       String        @unique @map("dedupe_key")
  emails          String?
  website         String?
  mapsCategory    String?       @map("maps_category")
  address         String?
  reviewRating    Decimal?      @map("review_rating") @db.Decimal(3, 1)
  reviewCount     Int?          @map("review_count")
  hasWebsite      Boolean?      @map("has_website")
  needsWebsite    Boolean?      @map("needs_website")
  erpMatch        String?       @map("erp_match")
  needsErp        Boolean?      @map("needs_erp")
  priorityScore   Decimal?      @map("priority_score") @db.Decimal(8, 2)
  priority        String?
  remarks         String?
  statusId        Int?          @map("status_id")
  status          LeadStatus?   @relation(fields: [statusId], references: [id])
  categoryId      Int?          @map("category_id")
  category        LeadCategory? @relation(fields: [categoryId], references: [id])
  batchId         Int?          @map("batch_id")
  batch           ImportBatch?  @relation(fields: [batchId], references: [id])
  createdAt       DateTime      @default(now()) @map("created_at")
  updatedAt       DateTime      @updatedAt @map("updated_at")

  @@index([statusId])
  @@index([categoryId])
  @@index([priority])
  @@map("leads")
}
```

Before finalizing types, open my sample Excel file (put it in `samples/`) and check the real values of `erp_match`, `needs_erp`, `priority` and `priority_score`. Adjust types if they differ. If no sample is present, generate `samples/sample-leads.xlsx` with 20 rows using the exact headers above (include a few rows with no phone, and a few duplicates).

### Seed (`prisma/seed.ts`)

Insert the five statuses (with colors and sort order) and the two categories with `upsert` on `name`, so it is safe to run twice.

---

## 5. Shared helpers (backend and frontend)

```ts
// lib/normalize.ts

/** Indian phone numbers: "077088 96226", "+91 87788 58303", "8778858303" -> 10 digits */
export function normalizePhone(raw: unknown): string | null {
  if (raw == null) return null;
  let d = String(raw).replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return d.length === 10 ? d : null;
}

/** One key per lead. Phone if we have it, otherwise title + address. */
export function makeDedupeKey(
  title: string,
  address: string | null | undefined,
  phoneNormalized: string | null
): string {
  if (phoneNormalized) return `p:${phoneNormalized}`;
  return `t:${title.trim().toLowerCase()}|${(address ?? "").trim().toLowerCase()}`;
}

export function parseBool(v: unknown): boolean | null {
  if (typeof v === "boolean") return v;
  if (v == null || v === "") return null;
  const s = String(v).trim().toLowerCase();
  if (["true", "yes", "y", "1"].includes(s)) return true;
  if (["false", "no", "n", "0"].includes(s)) return false;
  return null;
}

export function parseNum(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

// Excel header -> lead field. Normalize headers first:
// trim, lowercase, replace spaces and hyphens with "_".
export const HEADER_TO_FIELD: Record<string, string> = {
  title: "title",
  name: "title",
  phone: "phone",
  emails: "emails",
  email: "emails",
  website: "website",
  category: "mapsCategory", // scraper's Google Maps category, NOT our Category
  address: "address",
  review_rating: "reviewRating",
  review_count: "reviewCount",
  has_website: "hasWebsite",
  needs_website: "needsWebsite",
  erp_match: "erpMatch",
  needs_erp: "needsErp",
  priority_score: "priorityScore",
  priority: "priority",
};
```

---

## 6. API (Express, all under `/api`)

All routes except `POST /api/auth/login` need a valid session. Validate bodies with Zod. Return JSON errors like `{ "error": "message" }` with proper status codes.

### Auth (simple, one shared password)

The app is public on Vercel and holds business contact data, so protect it with one password.

- `POST /api/auth/login` `{ password }`: compare with `APP_PASSWORD`, then set an httpOnly, secure, sameSite=lax cookie holding a signed token (HMAC with `SESSION_SECRET`, 30-day expiry).
- `POST /api/auth/logout`: clear the cookie. `GET /api/auth/me`: returns `{ ok: true }` when logged in.

### Statuses and categories (same shape for both)

- `GET /api/lead-statuses`, `POST`, `PATCH /:id` (name, color), `DELETE /:id`, `PUT /reorder` (`{ ids: number[] }`)
- `GET /api/lead-categories`, `POST`, `PATCH /:id`, `DELETE /:id`, `PUT /reorder`
- `DELETE` returns **409** with a message like "12 leads use this status. Move them first." when any lead still uses it. Names must be unique (case-insensitive).
- Each list response includes `leadCount` per item.

### Leads

- `GET /api/leads?search=&statusId=&categoryId=&priority=&page=1&pageSize=50&sort=createdAt:desc`
  - `statusId=none` means "no status".
  - `search` matches title, phone, address, emails (case-insensitive).
  - Returns `{ items, total, page, pageSize }` with status and category included.
- `POST /api/leads`: create one lead. Required: `title`. Compute `phoneNormalized` and `dedupeKey`. On duplicate, return **409** `{ error: "A lead with this phone already exists", existingId }`.
- `PATCH /api/leads/:id`: update any field (status, category, remarks, and so on). Recompute the dedupe fields if title, phone or address change.
- `DELETE /api/leads/:id`
- `GET /api/leads/export.csv?...`: same filters, returns a CSV.

### Import

`POST /api/leads/import` with body:

```json
{ "fileName": "vellore-boutiques.xlsx", "categoryId": 2, "dryRun": true, "rows": [ { "title": "...", "phone": "...", "...": "..." } ] }
```

- The browser parses the file, maps headers using `HEADER_TO_FIELD`, and sends rows in **chunks of 500** (Vercel request size limit).
- For each row: skip when `title` is empty (count as an error with a reason); compute `phoneNormalized` and `dedupeKey`; skip duplicates inside the same file; skip rows whose `dedupeKey` already exists in the database.
- `dryRun: true` returns `{ willAdd, duplicates, errors: [{ row, reason }] }` and writes nothing.
- `dryRun: false` creates an `ImportBatch` (first chunk only, then reuse its `batchId`), inserts with `createMany({ skipDuplicates: true })`, sets `categoryId` on every new lead, and returns `{ added, skipped, errors, batchId }`.

### Dashboard and report

- `GET /api/dashboard` returns: `total`, `newThisWeek`, `notCalled` (no status), `byStatus` (name, color, count), `byCategory` (name, count), `byPriority` (priority, count).
- `GET /api/report?categoryId=&from=&to=` returns a matrix: one row per category, one column per status plus "Not called" and "Total". `GET /api/report.csv` returns the same as CSV.

---

## 7. Screens and UI

### Look and feel

- Read Yaazhi's `src` (layout, colors, fonts, spacing, buttons, tables, forms, sidebar) and **match it**. Reuse its design tokens where possible.
- Clean light theme, one accent color, plain system or Inter font, generous spacing, thin borders, soft shadows only on dialogs and dropdowns.
- **Do not use:** gradients, glassmorphism, glowing effects, emoji, sparkle or "magic" icons, animated backgrounds, or chat-style UI.
- Status shows as a **colored pill** (like my sheet). Status and category dropdowns appear right in the table cell.
- Sidebar on the left (Dashboard, Leads, Report, Settings, plus Logout at the bottom). On phones it collapses behind a menu button.
- Every list has a proper empty state, a loading skeleton, and a clear error message with a retry button. Show a small toast after saving.

### Pages

1. **Login:** one password field and a sign-in button.
2. **Dashboard:** stat cards (Total leads, New this week, Not called, Interested). Below, three simple lists or bar charts: by status, by category, by priority. Keep it plain.
3. **Leads (main screen):**
   - Toolbar: search box, filters (Status, Category, Priority), **Add Lead** button, **Import** button, **Export CSV**.
   - Table columns: Title, Phone, Category, Status (dropdown), Remarks (click to edit, saves on blur), Priority, Rating, Website, Address, Emails. The phone is a `tel:` link. Sticky header, row hover, pagination (50 per page).
   - Changing status or category saves instantly (optimistic update, roll back on error).
   - Row click opens a side panel showing all fields, editable, plus Delete (with confirmation).
   - **Add Lead** opens a form with every field, **Category** (required) and **Status** (optional) as dropdowns. Show the duplicate message from the API clearly.
   - **Import** is a 3-step dialog:
     1. Choose the file (.xlsx or .csv) **and choose a Category** (required, with a quick "add new category" link). Link to download a sample file.
     2. Preview: matched columns (let me fix any unmatched header with a dropdown), first 10 rows, and a dry-run summary (will add, duplicates, errors with reasons).
     3. Import with a progress bar (chunks of 500), then show the summary (added, skipped, errors) with a **View leads** button.
4. **Report (simple):** the category by status table with filters for category and date range, and a **Download CSV** button.
5. **Settings:** two tabs, **Statuses** and **Categories**. Each is a list where I can add, rename, change color (statuses only), reorder (drag handle), and delete. Show the lead count next to each item. Deleting something in use shows the 409 message.

---

## 8. Deployment

- `vercel.json`: send `/api/*` to the Express function and everything else to `index.html`. Mirror Yaazhi's file.
- Vercel env vars: `DATABASE_URL`, `DIRECT_URL`, `APP_PASSWORD`, `SESSION_SECRET`.
- Build command: `prisma generate && vite build`.
- Add `README.md` with: setup steps, env vars, how to run migrations and seed (`npx prisma migrate deploy`, `npx prisma db seed`), and how to run locally.

---

## 9. Build order and checklist

Commit to `main` after each item. Tick the box when done.

- [x] 1. Reset the repo (section 1) and scaffold the new project (Vite, Express, Prisma, `api/index.ts`)
- [x] 2. Prisma schema, first migration on Neon, seed script
- [x] 3. Auth (login, logout, session middleware) and the app shell with the sidebar
- [x] 4. Settings: Statuses and Categories (API and UI)
- [x] 5. Leads API and the Leads table with inline status and category dropdowns, filters, search, side panel
- [x] 6. Add Lead form
- [x] 7. Excel import (parse, map headers, category step, dry run, chunked import, summary)
- [x] 8. Dashboard
- [x] 9. Report and CSV exports
- [x] 10. Polish (empty, loading and error states, mobile layout), deploy to Vercel, update README

## 10. Acceptance test (run before saying "done")

1. Log in with the password. Settings shows the 5 statuses and 2 categories.
2. Add a category "Salon" in Settings, then rename it, then try deleting "Boutique" after importing leads into it (blocked with a message).
3. Import the sample file, choosing "Boutique". The dry run shows counts, the import adds the rows, and importing the **same file again** adds 0 and skips all as duplicates.
4. In Leads, change a status and a category from the dropdowns and edit a remark. Refresh the page and the changes persist.
5. Add a lead manually. Adding the same phone number again shows the duplicate message.
6. Filter by status, category and priority. Search by phone and by title.
7. Dashboard counts match the Leads table. Report matches too, and the CSV downloads.
8. Works on a phone-width screen. Logged out users cannot call any API route.

## 11. Out of scope for now

Call queue, follow-up dates, tasks, message templates, lead scoring, activity timeline, multiple users and roles, quotes, invoices and payments. We will add these later.
