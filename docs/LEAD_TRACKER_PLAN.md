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
  archivedAt      DateTime?     @map("archived_at")
  contactLogs     ContactLog[]
  createdAt       DateTime      @default(now()) @map("created_at")
  updatedAt       DateTime      @updatedAt @map("updated_at")

  @@index([statusId])
  @@index([categoryId])
  @@index([priority])
  @@index([archivedAt])
  @@map("leads")
}

model ContactLog {
  id          Int          @id @default(autoincrement())
  leadId      Int          @map("lead_id")
  lead        Lead         @relation(fields: [leadId], references: [id], onDelete: Cascade)
  contactDate DateTime     @map("contact_date") @db.Date
  statusId    Int          @map("status_id")
  status      LeadStatus   @relation(fields: [statusId], references: [id])
  notes       String?      @db.Text
  createdAt   DateTime     @default(now()) @map("created_at")
  updatedAt   DateTime     @updatedAt @map("updated_at")

  @@index([leadId, contactDate])
  @@map("contact_logs")
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

- `GET /api/leads?search=&statusId=&categoryId=&priority=&archived=active|archived&page=1&pageSize=50&sort=createdAt:desc`
  - `archived=active` (default): filters `where: { archivedAt: null }`.
  - `archived=archived`: filters `where: { archivedAt: { not: null } }`.
  - `statusId=none` means "no status".
  - `search` matches title, phone, address, emails (case-insensitive).
  - Returns `{ items, total, page, pageSize }` with status, category, and latest contact log info (`latestNote`, `lastContactDate`).
- `GET /api/leads/:id`: returns full lead details including batch info.
- `POST /api/leads`: create one lead. Required: `title`. Compute `phoneNormalized` and `dedupeKey`. On duplicate, return **409** `{ error: "A lead with this phone already exists", existingId }`. Starts with no status.
- `PATCH /api/leads/:id`: update lead fields (status is read-only and ignored/rejected). Recompute the dedupe fields if title, phone or address change.
- `POST /api/leads/:id/archive`: sets `archivedAt = new Date()`.
- `POST /api/leads/:id/restore`: sets `archivedAt = null`.
- `DELETE /api/leads/:id`: allowed **only** for archived leads (`archivedAt !== null`). For active leads, returns **409** `{ error: "Archive this lead first." }`.
- `GET /api/leads/export.csv?...`: follows the active/archived filter (defaults to active only), returns a CSV.

### Contact recording & Status rule

- **Status rule**: A lead's status is read-only everywhere; `PATCH /api/leads/:id` ignores/rejects `statusId`. Status changes **only** through contact logs.
- After any contact log is created, edited or deleted, set the lead's status in a transaction to the status of its latest log (order by `contact_date desc`, then `created_at desc`). If no logs remain, set status to `null` ("Not called").
- New and imported leads start with no status.
- `GET /api/leads/:id/contacts`: returns all contact logs for the lead (newest first: `contactDate desc, createdAt desc`).
- `POST /api/leads/:id/contacts` `{ contactDate, statusId, notes }`: rejects future dates (using Asia/Kolkata timezone for "today"), rejects archived leads. Creates log and updates lead status in a transaction.
- `PATCH /api/contacts/:id` `{ contactDate, statusId, notes }`: updates log, validates date, re-syncs lead status in a transaction.
- `DELETE /api/contacts/:id`: deletes log, re-syncs lead status in a transaction.

### Import

`POST /api/leads/import` with body:

```json
{ "fileName": "vellore-boutiques.xlsx", "categoryId": 2, "dryRun": true, "rows": [ { "title": "...", "phone": "...", "...": "..." } ] }
```

- The browser parses the file, maps headers using `HEADER_TO_FIELD`, and sends rows in **chunks of 500** (Vercel request size limit).
- For each row: skip when `title` is empty (count as an error with a reason); compute `phoneNormalized` and `dedupeKey`; skip duplicates inside the same file; skip rows whose `dedupeKey` already exists in the database.
- **Archived leads still block duplicates on import** so they do not come back. The import summary reports `skippedArchivedCount` (how many skipped duplicates were archived).
- Imported leads start with no status (`statusId: null`).
- `dryRun: true` returns `{ willAdd, duplicates, skippedArchivedCount, errors: [{ row, reason }] }` and writes nothing.
- `dryRun: false` creates an `ImportBatch` (first chunk only, then reuse its `batchId`), inserts with `createMany({ skipDuplicates: true })`, sets `categoryId` on every new lead, and returns `{ added, skipped, skippedArchivedCount, errors, batchId }`.

### Dashboard and report

- `GET /api/dashboard` counts **active leads only** (`archivedAt: null`):
  - `total`, `newThisWeek`, `notCalled` (no status), `byStatus` (name, color, count), `byCategory` (name, count), `byPriority` (priority, count).
  - `contactedToday`: number of distinct active leads with a contact log dated today (evaluated in Asia/Kolkata timezone).
- `GET /api/report?categoryId=&from=&to=` counts **active leads only**: returns a matrix: one row per category, one column per status plus "Not called" and "Total". `GET /api/report.csv` returns the same as CSV.

---

## 7. Screens and UI

### Look and feel

- Read Yaazhi's `src` (layout, colors, fonts, spacing, buttons, tables, forms, sidebar) and **match it**. Reuse its design tokens where possible.
- Clean light theme, one accent color, plain system or Inter font, generous spacing, thin borders, soft shadows only on dialogs and dropdowns.
- **Do not use:** gradients, glassmorphism, glowing effects, emoji, sparkle or "magic" icons, animated backgrounds, or chat-style UI.
- Status shows as a **colored pill** (like my sheet). Status is read-only in the table.
- Sidebar on the left (Dashboard, Leads, Report, Settings, plus Logout at the bottom). On phones it collapses behind a menu button.
- Every list has a proper empty state, a loading skeleton, and a clear error message with a retry button. Show a small toast after saving.

### Pages

1. **Login:** one password field and a sign-in button.
2. **Dashboard:** stat cards (Total leads, New this week, Not called, Contacted today) counting active leads only. Below, three simple lists or bar charts: by status, by category, by priority.
3. **Leads (main screen):**
   - Toolbar: search box, filters (Status, Category, Priority, and **Active / Archived** toggle/filter, default Active), **Add Lead** button, **Import** button, **Export CSV**.
   - **Table columns and widths (table-layout: fixed, strictly fits in one row without horizontal scroll at 1280px and wider):**
     1. Title (24%)
     2. Phone (11%, clickable `tel:` link)
     3. Category (9%, compact dropdown)
     4. Status (12%, plain colored pill, no dropdown; "Not called" in grey when empty)
     5. Latest note (22%, single line with ellipsis, full text on hover)
     6. Priority (7%, badge)
     7. Last contact (8%, e.g. "18 Oct", or "-" if none)
     8. Record (7%, compact button: icon + "Record", ~30px tall, active leads only)
   - Clicking the Record button opens the Record Contact dialog and stops propagation (does NOT trigger row click). Phone link and category dropdown also stop propagation.
   - The whole row is clickable (navigates to `/leads/:id`).
   - Below 768px: responsive cards showing title, phone, status, category, latest note, priority, last contact, with Record button at bottom.
4. **Record Dialog:**
   - Title: "Record Contact" with lead's name.
   - Fields: Date (defaults to today in IST, can pick past date, rejects future dates), Status (required dropdown), Notes (textarea max 1000).
   - On save: creates/updates contact log, refreshes data, shows toast.
5. **Lead Detail Page (`/leads/:id`) (Compact Yaazhi Style):**
   - **Header card (compact):** "Back to Leads" link; title (~22px) with badges on the same row (category, status, priority, phone call button, archived badge). Action buttons at top right: **Record** (for active leads), **Edit**, **Archive** (or Restore + Delete if archived), plus **Move to School ERP** / **Open school** if category is School. Card padding ~16px.
   - **ONE compact "Lead Details" card:** responsive grid (4 columns at >=1280px, 3 at 1024px, 2 on tablet/phone).
     - Tiles: Phone, Emails, Website, Address (spans 2 columns), Maps category, Rating & reviews (like "4.5 ★ (120)"), Priority score, ERP match, Has website, Needs website, Needs ERP.
     - Tile style: padding 10-12px, radius ~10px, subtle background (`bg-slate-50/70 border border-slate-200/80`), 11px uppercase muted label, 14px medium value. Non-monospace for phone and email. Empty values show "—" in muted grey. Long values stay on one line with ellipsis and tooltip. Links: email (mailto), website (new tab), address (Google Maps).
     - Card title: small 13px heading with no large icon.
   - **Contact History card:** directly follows Lead Details card. Header "Contact History" with record count badge, newest-first table with Date, Status pill, Notes, and Edit/Delete actions for active leads.
   - **Single thin muted footer line:** "Created 18 Oct 2026, 4:27 PM · Updated 18 Oct 2026, 4:27 PM · Import: sample-leads.xlsx" (formatted in Asia/Kolkata).
   - Removed: Tracking & Follow-up card, Record Information card, and large 3-row 2-column layout of oversized boxes. Fits header, entire Lead Details card, and top of Contact History card on 1366x768 without scrolling.
6. **Report:** category by status table (active leads only) with filters for category and date range, and **Download CSV** button.
7. **Settings:** Statuses and Categories management.

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
- [x] 11. Leads table optimization (single-row fixed layout, responsive cards), Lead detail page (`/leads/:id`) matching Yaazhi style, Archive-before-delete workflow (schema migration, API endpoints, import check, UI)
- [x] 12. Contact Recording: ContactLog schema & Neon migration, backfill existing leads, status derived from latest log, contact API endpoints, IST date validation, table layout with Record button & latest note/last contact, Record Contact dialog, Contact History card on detail page, and Contacted Today dashboard card.
- [x] 13. School ERP Module:
  - Database: `school_stages`, `schools`, `school_contacts`, `school_meetings` with Neon migration & seed stages.
  - Server Rules: stage read-only derived from latest meeting (`meeting_date desc, meeting_time desc, created_at desc`), default "Not started"; reject future dates (IST); reject writes on archived schools; primary contact lifecycle management; dedupe key `p:phone` or `t:name|area` (409); archive before delete (409); stage delete blocked when in use (409).
  - API: `/api/schools`, `/api/school-contacts`, `/api/school-meetings`, `/api/school-stages`, `POST /api/leads/:id/move-to-school-erp`.
  - UI:
    - Sidebar with "School ERP" (`GraduationCap` icon).
    - School ERP List Page (table-layout: fixed, 8 columns: School 24%, Area 12%, Primary contact 21%, Phone 11%, Stage 11%, Last meeting 9%, Record 12%; mobile cards; toolbar).
    - School Detail Page (`/school-erp/:id`): info card, contacts card (with role suggestions and make primary), meeting history card, record meeting action, archive/restore/delete.
    - Record Meeting Dialog: inline "+ New contact", type, date, time, location, met with, stage, notes.
    - Leads Integration: "Move to School ERP" and "Open school" buttons on School category leads.
    - Settings: "School stages" tab.
- [x] 14. UI Polish & Yaazhi Detail Page Styling:
  - Leads List (`/leads`): 7 fixed columns (Title min 220px, Phone 130px, Category 110px chip, Status uniform pill + 24px, Priority 90px centered, Last Contact 110px centered, Actions 170px; Latest note removed).
  - Uniform Status Pill: dynamic measurement of longest status name (`computeSharedPillWidth`) applied via CSS variable `--status-pill-width`, height ~28px, centered dot + text, no truncation. 24-character limit on status names enforced client and server side.
  - Shared SegmentedTabs: accessible pill toggle for Active / Archived views across Leads and School ERP.
  - Lead Detail Page (`/leads/:id`): top toolbar row (Back link on left; Record, Edit, Archive/Restore/Delete, Open School on right; no buttons inside header). Header card with 56px initials tile, badge row, ~24px title, address subtitle, and right key figures (LAST CONTACT and RATING). Separate Contact Details card (4 equal tiles: Phone with "Tap to call", Emails with "Send email", Website with external link, Address with Google Maps link). Separate Business Information card (6 equal tiles: Maps category, Priority score, ERP match, Has website, Needs website, Needs ERP). Contact History card with clock icon, plain "N records" count, bordered rounded table with 52px rows, and 2-line clamped notes with tooltip.
  - School ERP Detail Page (`/school-erp/:id`): matching top toolbar, 56px initials tile, key-figure blocks (LAST MEETING, CAMPUS CONTACTS), 4 equal campus spec tiles, and 52px rows in contacts and meetings tables.
  - Modal Audits: removed unused status field from Add Lead modal; all modals close on Escape key.

---

## 10. School ERP Module Specifications

### 10.1 Sidebar
- Navigation items: Dashboard, Leads, School ERP (`GraduationCap` icon), Report, Settings.

### 10.2 Database Schema (Prisma + Neon)
- `school_stages`:
  - `id`: Int autoincrement PK
  - `name`: String unique (case-insensitive)
  - `color`: String default `#64748B`
  - `sort_order`: Int default 0
  - Seed stages: Contacted (`#1D4ED8`), Meeting done (`#7C3AED`), Demo given (`#2563EB`), Proposal sent (`#CA8A04`), Won (`#15803D`), Lost (`#B91C1C`).
- `schools`:
  - `id`: Int autoincrement PK
  - `name`: String (required)
  - `area`: String (optional/nullable)
  - `address`: String (optional/nullable)
  - `phone`: String (optional/nullable)
  - `email`: String (optional/nullable)
  - `website`: String (optional/nullable)
  - `student_strength`: Int (optional/nullable)
  - `notes`: String (optional/nullable)
  - `stage_id`: nullable FK to `school_stages`
  - `lead_id`: nullable FK to `leads`
  - `dedupe_key`: String unique (`p:phone` or `t:lower(name)|lower(area)`)
  - `archived_at`: DateTime nullable
  - `created_at`, `updated_at`: DateTime
- `school_contacts`:
  - `id`: Int autoincrement PK
  - `school_id`: FK to `schools` (`onDelete: Cascade`)
  - `name`: String (required)
  - `role`: String (optional)
  - `phone`: String (optional)
  - `email`: String (optional)
  - `notes`: String (optional)
  - `is_primary`: Boolean default false
  - `created_at`, `updated_at`: DateTime
- `school_meetings`:
  - `id`: Int autoincrement PK
  - `school_id`: FK to `schools` (`onDelete: Cascade`)
  - `meeting_date`: DATE (`@db.Date`, required)
  - `meeting_time`: String (optional, e.g. "14:30")
  - `type`: String (`Call` | `Visit` | `Demo` | `Follow-up`)
  - `location_name`: String (optional)
  - `contact_id`: nullable FK to `school_contacts` (`onDelete: SetNull`)
  - `stage_id`: required FK to `school_stages`
  - `notes`: String (optional)
  - `created_at`, `updated_at`: DateTime
  - Index on `(school_id, meeting_date)`

### 10.3 Business Rules (Server Enforced)
1. **Stage Rule**: A school's stage is read-only. `PATCH /api/schools/:id` ignores `stage_id`. After any meeting is created, edited or deleted, the school's stage is atomically set to the stage of its latest meeting (`meeting_date desc, meeting_time desc, created_at desc`). If no meetings remain, stage is set to `null` ("Not started").
2. **IST Date Validation**: Reject future meeting dates based on `Asia/Kolkata` timezone today.
3. **Archived Protection**: Reject creating meetings, contacts, and editing archived schools.
4. **Primary Contact Lifecycle**:
   - The first contact added is automatically primary (`is_primary = true`).
   - Setting a contact as primary unsets any previous primary contact.
   - Deleting the primary contact automatically promotes the oldest remaining contact (`orderBy: { createdAt: 'asc' }`).
5. **Deduplication**: Duplicate `dedupe_key` returns HTTP 409 with `{ error: 'A school with this phone or name/area already exists', existingId }`.
6. **Archive before Delete**: `DELETE /api/schools/:id` is blocked for active schools (409 "Archive this school first.") and allowed only for archived schools. Deletes cascade contacts and meetings; confirmation shows item counts.
7. **Stage Protection**: Cannot delete a stage used by any school or meeting (HTTP 409).

### 10.4 API Routes
- `GET /api/schools?search&stageId&area&archived=active|archived&page&pageSize`
- `POST /api/schools` (optional `primaryContact` object)
- `GET /api/schools/:id`
- `PATCH /api/schools/:id`
- `POST /api/schools/:id/archive` & `POST /api/schools/:id/restore`
- `DELETE /api/schools/:id`
- `GET /api/schools/areas`
- `GET /api/schools/:id/contacts` & `POST /api/schools/:id/contacts`
- `PATCH /api/school-contacts/:id` & `DELETE /api/school-contacts/:id`
- `GET /api/schools/:id/meetings` & `POST /api/schools/:id/meetings`
- `PATCH /api/school-meetings/:id` & `DELETE /api/school-meetings/:id`
- `GET /api/school-stages`, `POST`, `PATCH /:id`, `DELETE /:id`, `PUT /reorder`
- `POST /api/leads/:id/move-to-school-erp`

### 10.5 UI Components & Pages
- **School ERP List**: 8 columns (School 24%, Area 12%, Primary contact 21%, Phone 11%, Stage 11%, Last meeting 9%, Record 12%), `table-layout: fixed`, search/stage/area/active filters, Add School modal.
- **School Detail Page**: Header card, Info card, Contacts card with role suggestions (`Principal`, `Correspondent`, `Administrator`, `Accountant`, `Teacher`, `Other`), Meeting History card, Archive/Restore/Delete.
- **Record Meeting Dialog**: Inline "+ New contact", date (IST today max), time, type, location, met with, stage, notes.
- **Leads Integration**: "Move to School ERP" on leads in School category, converts and links to School ERP.
- **Settings**: "School stages" tab.

---

## 11. Acceptance test (run before saying "done")

1. Log in with the password. Settings shows the 5 statuses and 2 categories, plus School stages.
2. Add a category "Salon" in Settings, then rename it, then try deleting "Boutique" after importing leads into it (blocked with a message).
3. Import the sample file, choosing "Boutique". The dry run shows counts, the import adds the rows, and importing the **same file again** adds 0 and skips all as duplicates.
4. In Leads, change a status and a category from the dropdowns and edit a remark. Refresh the page and the changes persist.
5. Add a lead manually. Adding the same phone number again shows the duplicate message.
6. Filter by status, category and priority. Search by phone and by title.
7. Dashboard counts match the Leads table. Report matches too, and the CSV downloads.
8. School ERP: Add school with primary contact, record meeting updating stage, reject future meeting date, lead "Move to School ERP" workflow, archive before delete, and School stages settings.
9. Works on a phone-width screen. Logged out users cannot call any API route.

## 12. Out of scope for now

Call queue, follow-up dates, tasks, message templates, lead scoring, activity timeline, multiple users and roles, quotes, invoices and payments. We will add these later.

---

## 13. UI Layout & Compact Sizing Specification (1280 x 680 Viewport)

Primary test viewport: **1280 x 680 CSS pixels** (representing a 1920px screen at 150% OS/browser scaling). Everything is engineered to fit without horizontal overflow, clipping, or unnecessary scrolling.

### 13.1 Global Compact Scale Design System
- **Typography**:
  - Base text & table cells: 13px (`text-[13px]`)
  - Small labels & badges: 11px uppercase (`text-[11px]`)
  - Page titles: 20px bold (`text-[20px] font-bold`)
  - Card titles: 14px semibold (`text-[14px] font-semibold`)
- **Controls & Components**:
  - Primary controls (buttons, inputs, dropdowns): 32px tall (`h-8`), radius 8px (`rounded-lg`).
  - Icon-only action buttons: 28px (`w-7 h-7 rounded-lg inline-flex items-center justify-center`).
  - Segmented tabs: 28px tall outer container (`h-7`), 24px inner buttons (`h-6`), 12px text.
  - Table rows: 44px body rows (`h-[44px]`), 36px header row (`h-9`), horizontal cell padding 12px (`px-3`).
  - Cards & containers: padding 14-16px (`p-3.5`), gaps 12px (`gap-3`), radius 10px (`rounded-[10px]`).
  - Sidebar: 220px wide (`w-[220px]`), compact brand block, 36px nav items (`h-9`) with 13.5px text.
  - Page padding: 20px horizontal, 14px top (`px-5 pt-3.5 pb-6`). Large empty header margins removed.
  - Status & stage pills: 24px tall (`h-6`), 12px text, 6px dot, 10px side padding (`px-2.5`). Uniform width computed dynamically from the longest status name measured at 12px text + 28px padding (minimum 84px). Client and server enforce a 20-character maximum status name length.

### 13.2 Leads Page Layout & Fixed Filter Bar
- **Header**: 20px page title with 13px muted subtitle on the left; 32px "Add Lead", "Import", and "Export CSV" buttons on the right with 8px gaps.
- **Filter Bar**: Single row with 10px card padding (`p-2.5`):
  - Fixed 280px search box (`w-[280px] h-8`)
  - Active/Archived segmented tabs (28px tall)
  - Fixed 140px Status, Category, and Priority dropdowns (`w-[140px] h-8`)
  - All controls 32px tall with 8px gaps. Reset button positioned at `ml-auto` to eliminate layout shift (0px movement) when filters change.
- **Table**:
  - Columns: Title, Phone, Category, Status, Priority, Last Contact, Actions.
  - `table-layout: fixed; width: 100%;` without min-width or overflow. Zero clipping at 1280px viewport width.
  - Column widths: Phone 120px, Category 96px, Status = pill width + 24px (~132px), Priority 76px, Last Contact 96px, Actions 156px. Title flexes to fill remainder (~444px) with ellipsis and tooltip.
  - Below 1100px viewport width: Automatically collapses to responsive card layout.
  - Actions column: 28px Record button (`h-7 px-2.5 text-[12px]`), 28px Edit icon button, 28px Archive icon button (or Restore and Delete buttons on Archived tab with permanent deletion modal). Entire row clickable to open details without triggering action buttons.

### 13.3 Lead Detail Page (`/leads/:id`)
- **Toolbar**: Slim "Back to Leads" link (13px text, 24px height). Record, Edit, Archive, Restore, Delete removed from page header (exclusive to list Actions column).
- **Header Card** (14px padding): 44px initials tile; badges row (category chip, status pill, priority badge, muted "Lead #id"); 20px bold title; 13px address link with map pin icon; right key figures (LAST CONTACT, RATING with 10.5px uppercase label, 18px semibold value, 11.5px subtitle, "—" when empty).
- **Contact Details Card**: 3 equal tiles filling row (Phone, Emails, Website; Address tile omitted to prevent redundancy). Tile padding 10px 12px, 10.5px uppercase label, 14px medium value, 11.5px action link.
- **Business Information Card**: 6 equal tiles (~56px tall) filling row (Maps category, Priority score, ERP match, Has website, Needs website, Needs ERP) displaying label and value only without redundant lines.
- **Contact History Card**: 14px header with "N records"; 36px table header, 44px rows, uniform status pill, notes clamped to 2 lines with full text tooltip.
- **Space Budget**: At 1280 x 680 CSS pixels, Back link, Header card, Contact Details card, Business Information card, and Contact History header with its first row are fully visible above the fold without scrolling.

### 13.4 Module Consistency
The same 32px control scale, 10px card radius, 11px label / 13px body typography, 36px header / 44px body table rows, and 28px icon buttons are consistently applied to School ERP, Dashboard, Report, Settings, Login, and all modal dialogs.

---

## 14. Permanent Delete Environment Switch (`ALLOW_DELETE`)

Leadonic provides an environment-controlled safety mechanism for the permanent destruction of records.

### 14.1 Configuration & Server Enforcement
- **Environment Variable**: `ALLOW_DELETE` (server-side only, never exposed via `VITE_` prefix to prevent client-side build baking).
- **Evaluation Rules**:
  - Delete is enabled **only** when `process.env.ALLOW_DELETE` is the trimmed, case-insensitive string `"true"` (e.g. `"true"`, `"TRUE"`).
  - Missing, empty, or any other value (e.g. `false`, `no`, `yes`, `1`) safely defaults to disabled (`false`).
  - Evaluated dynamically per request via `isDeleteEnabled()` in `backend/src/config.ts`.
- **Protected Endpoints**:
  - `DELETE /api/leads/:id`
  - `DELETE /api/schools/:id`
  - When disabled: Immediately returns `403 Forbidden` with `{ "error": "Delete is disabled" }` before querying or modifying the database.
  - When enabled: The existing archive prerequisite still applies (`409 Conflict: "Archive this lead first."` or `"Archive this school first."`).
  - Safe Scope: Archive, restore, and entry-level deletions (individual contact history logs, school campus contacts, school meetings, settings items) remain operational.
- **Config Endpoint**: `GET /api/config` (protected by `requireAuth`) returns `{ "deleteEnabled": boolean }` reflecting current runtime environment.

### 14.2 Frontend Integration
- **Hook**: `useAppConfig()` queries `/api/config` once after authentication with a long stale time (`staleTime: 1 hour`). `useDeleteEnabled()` exposes a boolean (`data?.deleteEnabled === true`).
- **UI Presentation**:
  - In Archived views (Leads list Actions column and School ERP detail page), the permanent delete button remains visible.
  - When `deleteEnabled` is `false`: Button has `disabled` and `aria-disabled="true"`, styled greyed-out with `cursor: not-allowed` and title tooltip `"Delete is disabled"`. Clicks are intercepted so the confirmation modal never opens.
  - When `deleteEnabled` is `true`: Operates normally, opening the permanent deletion confirmation modal.
  - Server Error Fallback: If a delete request produces a `403` status, a toast displaying `"Delete is disabled"` is presented.

---

## 15. Lead Detail Page Window-Fill & Contact History Overhaul

The Lead detail page (`/leads/:id`) was refined to eliminate side margins, stretch to full window height, display balanced key figures, standardize tile baselines, and simplify the Contact History table.

### 15.1 Full-Width Window-Filling Layout
- **Unified Container**: Removed `max-w-6xl mx-auto` and `max-w-5xl mx-auto` constraints from `LeadDetailPage` and `SchoolDetailPage`. Cards now span the full width from the 220px sidebar to the right edge with uniform 20px side padding (`px-5`) and 14px top padding (`pt-3.5`).
- **Full Viewport Stretching**:
  - `AppLayout` inner container uses `flex-1 w-full min-w-0 px-5 pt-3.5 pb-3 flex flex-col`.
  - `LeadDetailPage` uses `w-full flex-1 flex flex-col space-y-3`.
  - The Contact History card uses `flex-1 flex flex-col` so it expands to consume all remaining vertical space in the viewport.
  - Empty state (`No contacts logged yet`) is centered both vertically and horizontally within the stretched card.
  - When records overflow the viewport, the table expands and the page scrolls naturally.
- **Pinned Bottom Metadata**: The thin metadata line (`Created ... · Updated ... · Import ...`) is pinned below the stretched card with 12px top margin (`mt-3 text-[11px] text-slate-400 text-center`).

### 15.2 Header Card: 4 Key Figures
- **Title Block (Left)**: 44px initials avatar, badges row (category, status pill, priority, lead ID, archived tag), 20px bold title, 13px address link with map pin icon.
- **Key Figures Row (Right)**: 4 equal cells (minimum width 120px) separated by thin vertical dividers (`divide-x divide-slate-100`):
  1. `LAST CONTACT`: Date formatted as medium date; second line: `"N contacts recorded"` or `"Never contacted"`.
  2. `CONTACTS`: Count of logs; second line: `"N total logs"` or `"No history"`.
  3. `RATING`: Value with amber star icon; second line: `"N reviews"` or `"No rating"`.
  4. `PRIORITY`: High / Medium / Low badge value; second line: `"Score N"` or `"No score"`.
  - Missing or null values fall back cleanly to `"—"`.

### 15.3 Contact Details Tile Baseline Alignment
- All 3 tiles (Phone, Emails, Website) standardize on an exact 76px height (`h-[76px]`) with identical typography vertical metrics:
  - Label: `h-3.5 text-[10.5px] uppercase font-semibold leading-none`
  - Value: `h-5 text-[14px] font-medium leading-5`
  - Subtitle / Action link: `h-4 text-[11.5px] font-medium leading-4`
- The Website URL sits on the exact same horizontal baseline as Phone and Emails, reserving the 3rd line space (`Opens in new tab` external link) to ensure baseline harmony across the card.

### 15.4 Simplified 3-Column Contact History Table
- **Removed Clutter**:
  - Actions column (edit and delete icons) removed from the table rows.
  - Redundant Recorded date column removed; Contact Date is the authoritative record date.
- **3 Core Columns**:
  1. `DATE`: Fixed width (140px, `w-[140px]`), semibold text.
  2. `STATUS`: Centered fixed width matching the universal pill width plus padding (`w-[calc(var(--status-pill-width,107px)+24px)]`).
  3. `NOTES`: Takes the remaining width. Fully wrapped without truncation or line clamps (`break-words whitespace-pre-wrap`), naturally expanding table rows to fit long notes. Displays a muted `"—"` when empty.
- **Row & Header Dimensions**:
  - Header row: 36px (`h-9`), uppercase 11px tracking-wider.
  - Body rows: Minimum 44px (`min-h-[44px]`), thin 1px dividers between rows.
  - Card header displays total record count (`N records` / `N record`) on the right.

---

## 16. Import Wizard Step 2 ("Mapping & Dry Run") Overhaul

Step 2 of the spreadsheet import wizard was re-engineered into a high-performance, full-file validation and interactive row selection workspace.

### 16.1 All-Row Detail & High-Performance Virtualization
- **Full File Preview**: Replaced the previous 10-row slice with a table rendering all rows in the spreadsheet using `@tanstack/react-virtual`, smoothly scrolling datasets with thousands of rows (verified up to 3,000+ rows) without DOM bloat.
- **Full Cell Text Wrapping**: Every column found in the spreadsheet is displayed with up to 3 lines of wrapped text (`line-clamp-3 leading-snug break-words`), no cut-offs, and full cell value available on hover via tooltip (`title`).
- **Mapped vs. Unmapped Columns**: Unmapped columns retain their file position with a muted header and `not imported` chip. Mapped columns display the target lead field name (`→ Phone`, etc.).
- **Sticky Column Architecture**:
  - Checkbox (`w-9`, `sticky left-0`)
  - Row number `#` (`w-12`, `sticky left-9`)
  - Check status badge (`w-[140px]`, `sticky left-[84px]`)
  - Title column (`w-52`, `sticky left-[224px]`) with border and subtle drop shadow
  - Header row sticky at the top (`sticky top-0 bg-slate-50 z-20`)
  - Table scrolls horizontally and vertically inside its dedicated container; the dialog itself never scrolls.
- **Check Status Badges**:
  - `Ready` (emerald green): Valid for import.
  - `Duplicate` (amber): Matches an existing lead in the database, with tooltip indicating existing lead title, ID, and archived status.
  - `Duplicate in file` (amber): Repeats a lead within the uploaded file, indicating the original row index it duplicates.
  - `Error` (rose red): Validation issue (e.g. missing title/name), with reason tooltip.
- **Dialog Sizing**: Sized to `w-[min(1200px, 96vw)]` and `h-[90vh]` as a flex column. On mobile devices (<640px), scales to full screen.

### 16.2 Pre-Import Selection & Filter Toolbar
- **Interactive Checkboxes**:
  - Checkbox on every row; `Ready` rows are checked by default. `Duplicate` and `Error` rows are unchecked and disabled.
  - Header select all / none checkbox supporting indeterminate state when partially selected.
  - Shift-click range selection across rows.
  - Quick action links: `Select all ready` and `Clear selection`.
- **Compact Stat Strip**: Displays `Selected: X of Y ready (Total)`, `Duplicates: D`, and `Errors: E` in a single compact horizontal strip.
- **Filter Toolbar**:
  - Filter chips: `All (N)`, `Ready (R)`, `Duplicates (D)`, `Errors (E)`.
  - `Selected only (X)` toggle checkbox.
  - Real-time search box matching lead title or cell text across the sheet.
- **Live Footer Action**:
  - Button text updates live (`Import X Leads`). Disabled when 0 rows are selected.
  - Only selected rows are submitted to the server in chunks of 500.
- **Step 3 Summary**:
  - Displays three clear metrics: `Added` (inserted leads), `Skipped as duplicates` (duplicates caught during database insertion), and `Not selected` (rows unchecked by the user).

### 16.3 Collapsible Mapping Section
- Header matching section is collapsible with a one-line summary: `"14 matched, 3 not imported"`.
- Collapsed by default when the Title field is mapped; expanded if Title is unmapped.
- When expanded, renders a clean 2-column grid without nested inner scrollbars.
- Automatically re-runs validation preview debounced at 400ms when any mapping selector changes (manual re-run button removed).
- Preserves user row selection states for rows whose check status did not change across mapping updates.

### 16.4 Backend Architecture (`POST /api/leads/import`)
- Extended dry run response with per-row results: `rows: [{ index, check: "ready" | "duplicate" | "duplicate_in_file" | "error", reason?, existingLeadId?, existingTitle?, firstRowIndex? }]`.
- Single batched database query using `in` clauses chunked in blocks of 1,000 candidate dedupe keys to prevent query parameter limits.
- Pre-checks intra-file duplicates to identify repeated entries before database queries.
- Re-verifies deduplication at actual import time to guard against race conditions.

---

## 17. Dropdowns, Sorting, and Confirmations Overhaul

Across the entire application, all native `<select>` dropdowns, browser `confirm()`/`alert()` calls, and list sorting mechanisms were re-engineered for visual consistency, keyboard accessibility, and database performance.

### 17.1 Leads Sort By Dropdown & Backend Architecture
- **Sort Dropdown in Filter Bar**: Added a dedicated "Sort by" dropdown (width 180px, with sort icon) positioned after filter dropdowns.
  - Six options:
    - `createdAt:desc` (Date created: newest first - default)
    - `createdAt:asc` (Date created: oldest first)
    - `lastContact:desc` (Last contact: most recent first)
    - `lastContact:asc` (Last contact: oldest first)
    - `title:asc` (Name: A to Z)
    - `title:desc` (Name: Z to A)
- **URL Synchronization**: Persists sort selection in URL (`?sort=...`), automatically resetting pagination to page 1 on sort change. CSV export applies the exact same filter and sort parameters.
- **API Sort Validation & Whitelisting**: Strict whitelisting in `GET /api/leads` returning 400 for any unrecognized sort key, with stable secondary tie-breaker `id desc`.
- **Case-Insensitive Name Sorting**: Stored generated column `title_lower TEXT GENERATED ALWAYS AS (lower("title")) STORED` with B-tree index in PostgreSQL ensures fast, deterministic alphabetical sorting across mixed-case datasets.
- **Last Contact Date Column & Sync**:
  - Nullable `Date` column `leads.last_contact_date` with index `@@index([lastContactDate])`.
  - Migration deployed via `prisma migrate deploy` and backfilled from `MAX(contact_date)` of all existing contact logs without data loss.
  - Kept in sync inside the transactional helper `syncLeadStatus` called on contact log creation, edits, and deletions.
  - Leads never contacted (`lastContactDate: null`) always appear last (`nulls: 'last'`) for both ascending and descending last-contact sorting.
  - Returned as `lastContactDate` in lead list response and rendered in UI.

### 17.2 Universal Custom Select Component (`Select.tsx`)
- **Zero Native `<select>`**: Replaced every `<select>` across the application:
  - Leads view filter bar (Status, Category, Priority, Sort by)
  - Add & Edit Lead modals (Category, Priority, Needs ERP, Has Website, Needs Website)
  - Record Contact dialog (Status)
  - Import Wizard dialog (Category selection, Column mappings)
  - Calling Report filter bar (Category, with styled matching 32px date controls)
  - School ERP view filter bar (Stage, Area)
  - Record Meeting dialog (Meeting Type, Stage, Contact)
- **Compact & Consistent Design System**:
  - Trigger: 32px height, 8px radius, 1px border, white background, 13px text, 14px muted chevron on the right, darker border on hover, 2px blue focus ring, and blue border while open.
  - Popover: Rendered in a portal (`z-[9999]`), 10px radius, 1px border, soft shadow, 4px padding. Items are 32px tall with 13px text, subtle highlight on hover/focus, and check icon on selected item. Max popover width 280px with internal scrolling.
  - Viewport boundary detection: Auto-flips upward when screen bottom space is limited (<220px) and auto-shifts leftward to avoid overflow on narrow screens (390px mobile).
  - Status and Stage options display their associated colored dot.
- **Accessibility & Keyboard Navigation**:
  - Full ARIA compliance (`combobox`, `listbox`, `option`, `aria-expanded`, `aria-selected`, `aria-controls`).
  - Arrow Up/Down navigation, Home/End, Enter, Space to select, Esc to close, and typeahead character search.
  - Capture-phase Escape listener prevents parent dialogs from closing when dismissing an open popover.

### 17.3 Dropdown Sizing & Filter Bar Layout
- **No Empty Gaps & Stable Trigger Widths**: Each filter trigger's width is fitted to its longest option label (bounded between 110px and 200px) with the chevron pinned to the right edge. Trigger widths remain constant regardless of the selected option so adjacent controls never shift.
- **Full Width Filter Bar**: Search box expands using `flex: 1` (`min-w-[240px]`) so no unused empty space remains at the end of the bar. Tabs, dropdowns, and sort controls maintain fixed/fitted widths with uniform 8px gaps (`gap-2`).
- **Single-Line Ellipsis with Full-Name Tooltip**: Triggers and popover items enforce single-line text truncation with `min-width: 0` and `title` tooltip displaying the full name on hover.
- **Settings Name Limit**: Category and School Stage names are constrained to 30 characters in Settings (client `maxLength={30}` and server Zod `max(30)` validation; status remains 20). Existing longer names remain safely stored and display cleanly with ellipses.

### 17.4 Unified Confirmation Dialog System (`ConfirmDialog` / `useConfirm`)
- **Promise-Based `useConfirm()` Hook**: Standardized confirmation provider and modal replacing all native `window.confirm()`, `confirm()`, `alert()`, and `prompt()` calls.
- **Design & Behavior**:
  - Centered modal matching Leadonic's compact design language: title, contextual message, Cancel button, and Confirm button (red for destructive actions).
  - Destructive actions initialize keyboard focus on the Cancel button.
  - Esc key and backdrop click dismiss with `false`. Focus is trapped inside the active confirmation modal.
  - Replaced confirmation flows across Lead archive, restore, and permanent delete; School archive, restore, and permanent delete; School contact and meeting delete; Settings status, category, and stage deletes.
  - Clean error handling: If server returns 409 Conflict (e.g. status or category in use), the server message is displayed in a toast notification and data remains unchanged.
  - ESLint / oxlint `"no-alert": "error"` rule configured to prevent native browser dialogs from returning.

---

## 18. Priority Conversion in Spreadsheet Import

Leadonic spreadsheet import supports automated priority derivation converting raw priority scores (`0.00` to `5.00`) and legacy priority labels (`low`, `cool`, `warm`, `hot`) to standardized Leadonic priorities (`High`, `Medium`, `Low`).

### 18.1 Shared Conversion Helper (`lib/priority.ts`)
- **Shared ESM Module**: Cross-compatible with client and Node.js server (`backend/src/routes/import.ts`).
- **Core Priority Type**: `type Priority = "High" | "Medium" | "Low"`.
- **Score Conversion (`priorityFromScore`)**:
  - `0 <= score < mediumFrom`: Returns `"Low"`.
  - `mediumFrom <= score < highFrom`: Returns `"Medium"`.
  - `highFrom <= score <= 5`: Returns `"High"`.
  - Default thresholds: `mediumFrom = 2`, `highFrom = 4` (0–1 Low, 2–3 Medium, 4–5 High, supporting decimals like 1.5 -> Low, 3.5 -> Medium).
- **Score Parsing (`parseScore`)**: Accepts numbers and trimmed numeric strings (e.g., `" 4.5 "`). Excludes booleans, empty strings, and non-numeric values. Returns `null` if value < 0 or > 5.
- **Label Fallback (`priorityFromLabel`)**: Used when a row lacks a valid score:
  - `low` -> `"Low"`
  - `cool` -> `"Medium"`
  - `warm` -> `"Medium"`
  - `hot` -> `"High"`
  - `high` / `medium` / `low` -> retained case-insensitively as `"High"` / `"Medium"` / `"Low"`.
  - Any unrecognized string -> returns `null`.
- **Threshold Validation (`validateThresholds`)**: Strict bounds `0 < mediumFrom <= highFrom <= 5`.
- **Row Conversion Pipeline (`convertPriority`)**: Evaluates valid score first with custom thresholds; falls back to label if score is invalid or missing; when conversion is toggled off, retains only existing High/Medium/Low label text.

### 18.2 Import Dialog Step 2: Live Preview & Adjust Panel
- **Priority Conversion Panel**: Positioned between the stat strip and virtualized preview table:
  - **Apply Conversion Checkbox**: Default ON when `priority_score` is mapped; disabled with tooltip hint `"Map priority_score to enable"` when unmapped.
  - **Live Summary**: Real-time counter over selected rows: `"Low X · Medium Y · High Z · Not set W"`.
  - **Adjust Controls**: Collapsible panel with 32px number inputs for "Medium starts at score" (step 0.1, min 0.1, max 5) and "High starts at score" (step 0.1, min 0.1, max 5).
  - **Live Dynamic Guidance**: Formats `"Low: below M · Medium: M to below H · High: H to 5"`.
  - **Inline Threshold Validation**: Displays validation warning if `mediumFrom <= 0`, `highFrom > 5`, or `mediumFrom > highFrom`. Holds last valid thresholds for live counts. Includes `"Reset to 2 / 4"` quick reset link.
- **Preview Table Converted Priority Column**:
  - Dynamically injected immediately after the mapped `priority_score` column (or `priority` column if score is unmapped).
  - Displays `"score -> Badge"` (e.g. `"4 -> High"`) using the Leadonic list badge component.
  - Adds a muted `"from label"` micro-tag when derived from label fallback.
  - Invalid scores with no fallback display a muted `"Not set"` chip with hover tooltip detailing the reason (e.g., `"Score 7 is outside 0-5"`).
  - Warnings do not block import or alter the row's Check status (`Ready`).
  - Browser-side exact computation: browser sends pre-converted priority and score directly to server.

### 18.3 Confirmation Modal & Step 3 Summary
- **Import Confirmation Modal**:
  - When "Apply conversion" is active and at least one selected row contains a score or label, clicking "Import N Leads" prompts the shared `ConfirmDialog`.
  - Title: `"Import N leads?"`
  - Body text: `"Priority will be set from the score: 0-M Low (X), M-H Medium (Y), H-5 High (Z). W leads will have no priority."` (dynamically reflecting active thresholds and selected counts).
  - Cancel returns to Step 2 with all states preserved; Confirm proceeds to import. Skipped when no priorities are being converted.
- **Step 3 Summary**:
  - In addition to Added / Skipped / Not selected metrics, displays a 4-card priority breakdown: `High`, `Medium`, `Low`, and `No priority`.

### 18.4 Server Import API (`POST /api/leads/import`)
- **Row Zod Validation**:
  - `priority`: Validated against `PriorityEnumSchema` (`"High" | "Medium" | "Low"` or `null`). Invalid values become `null` and increment `warningsCount`.
  - `priorityScore`: Validated against `PriorityScoreSchema` (finite number `0 <= score <= 5` or `null`).
  - Server does not re-derive priority, strictly honoring user-adjusted thresholds calculated in the browser.
- **Response Payloads**:
  - Dry run response includes total `warnings` count.
  - Chunked import response returns `priorityCounts: { High, Medium, Low, none }`.

### 18.5 Database Normalization Script (`scripts/normalize-priorities.ts`)
- Standalone CLI utility using `@prisma/client` and `lib/priority.ts`.
- Targets existing leads where priority is not High, Medium, or Low, or is null while `priority_score` is present.
- Dry run by default: logs total candidates, conversion breakdown, and 10 sample lead conversions without mutating data.
- `--apply` flag required for committing updates in transactional chunks.

### 18.6 Sample Dataset & Test Suite
- **Sample Generator (`samples/generate-sample.ts`)**: Generates 13 test leads covering scores 0, 1, 1.5, 1.99, 2, 3, 3.99, 4, 5, empty scores with "warm" and "hot", invalid score "n/a", and out-of-range score 7.
- **Unit Test Suite (`tests/priority.test.ts`)**: 17 automated tests verifying `parseScore`, boundary conversions, custom thresholds, label fallbacks, and `convertPriority` pipeline.
