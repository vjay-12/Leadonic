# CRM Phase 1: Frontend Demo Plan

Oct 13, 2026 · @Vijay

## Goal

Build a working demo that runs fully in the browser with no backend: import an Excel lead list, call through a queue, log outcomes, and watch follow-ups and the dashboard update. Data is saved in the browser, so it survives a refresh.

## Stack

Use Vite + React + TypeScript: for an internal tool with no SEO need it is simpler than Next.js and deploys to Vercel as a static site.

- **Tailwind + shadcn/ui:** components for tables, dialogs, forms and tabs
- **React Router:** page routes
- **TanStack Table:** lead table with sorting, filters and pagination
- **SheetJS (xlsx):** reads .xlsx and .csv in the browser
- **libphonenumber-js:** phone cleanup, defaulting to India (+91)
- **Dexie (IndexedDB):** local database
- **React Hook Form + Zod:** forms and validation
- **date-fns:** follow-up dates

Put all data access behind a small repo layer (`leadsRepo`, `callsRepo`, `tasksRepo`). Later, replace only that layer with Django API calls.

## Data types

Six record types cover the whole demo.

| Type | Fields |
| --- | --- |
| Lead | id, name, phone, address, category, website, rating, reviews, area, batchId, status, score, doNotCall, nextFollowup, lastCalledAt, callCount, createdAt |
| CallLog | id, leadId, outcome, notes, calledAt |
| Task | id, leadId, title, dueDate, done |
| Template | id, type (script / whatsapp / email), name, body with `{business_name}` and `{area}` placeholders |
| ImportBatch | id, fileName, area, date, added, skipped, errors |
| ActivityEvent | leadId, type (call / note / status / task / message), text, at; feeds the timeline |

## Screens

Eight screens, with the call queue as the main one.

1. **Dashboard:** calls today, follow-ups due, new leads, a count per pipeline status, and the last 7 days of calls.
2. **Import** (4 steps): upload the file or download a sample template; map columns (headers are auto-guessed for name, phone, address, category, website, rating); preview with checks for missing phone, invalid number, and duplicates within the file and against existing leads; confirm batch name and area, then see a summary of added, skipped and errors.
3. **Call queue (main screen):** on the left, a queue sorted by follow-ups due first, then score, with do-not-call leads excluded. On the right, the active lead with a tap-to-call button, the call script with placeholders filled, and outcome buttons (No answer, Callback, Interested, Not interested, Wrong number, Do not call). Also a notes box, quick follow-up picks (tomorrow, 3 days, next week, custom date) and a "Save & next" button. Keyboard shortcuts on desktop; the layout is mobile-friendly since calls may be made from a phone.
4. **Leads list:** search, filters (status, area, category, batch, score, do-not-call), bulk status change, CSV export.
5. **Lead detail:** editable fields, activity timeline, tasks, and a "Send WhatsApp" button that opens a wa.me link with the template filled in.
6. **Tasks:** Overdue, Today, Upcoming.
7. **Templates:** create and edit scripts and messages, with a live preview.
8. **Settings:** scoring rules, "Load demo data", "Reset", and JSON backup export and import.

## Logic

Four rules drive the demo's behavior.

- **Outcome to status:** Interested → Interested, Callback → Contacted, No answer → Contacted, Not interested → Lost, Do not call → Lost + flag.
- **Follow-up:** after "No answer" or "Callback", a follow-up date is suggested automatically.
- **Duplicate check:** compare normalized phone numbers.
- **Score rules (editable):** rating 4+ → +2, has website → +1, category in target list → +2, previously interested → +3, 3+ no-answer attempts → -2.

## Demo data

Seed about 60 realistic leads across 3 areas and categories, with a few calls and tasks already logged. Also include a sample .xlsx file so the import can be tested.

## Build milestones

Build in six steps, each leaving the app runnable.

1. **Setup:** project, layout and navigation, Dexie repo layer, seed data
2. **Leads:** list with filters, lead detail
3. **Import:** all four steps with duplicate detection
4. **Call queue:** logging, follow-ups, timeline
5. **Tasks, templates, scoring, dashboard**
6. **Polish:** empty and error states, mobile layout, Vercel deploy

## Demo walkthrough (acceptance test)

The demo passes when this sequence works end to end: import the sample file, see the batch summary, open the call queue, call a lead and log "Callback" with a follow-up, see the lead under Tasks and in its timeline, see the dashboard counts update, then refresh the page and find everything still there.

## Known limits

This demo is a starting point, not a production system.

- Data lives only in this browser, so export the JSON backup before clearing site data.
- There is no login, no multi-user support, and no live DND check.
- Quotes, invoices and payments (L2C Phases 2 to 4) come later.
