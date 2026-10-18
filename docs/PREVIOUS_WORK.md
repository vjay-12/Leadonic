# Previous Work Summary: Leadonic CRM Phase 1 Frontend Demo

## 1. What the App Did
The previous iteration was an in-browser CRM demo (based on `CRM Phase 1 Frontend Demo Plan.md`) intended for cold calling workflows without a backend server. All persistence was in the browser using Dexie (IndexedDB).
Key features included:
- **Call Queue:** A prioritized list of leads with one-click calling (`tel:` links), pre-filled call scripts, outcome logging (Interested, Callback, No answer, etc.), and follow-up scheduling.
- **Lead Management:** List view with search, filtering by status/area/category, and a full lead detail modal with activity timelines and WhatsApp click-to-chat.
- **Excel/CSV Import Wizard:** 4-step import flow (upload, column mapping guess, phone validation/duplicate detection, batch confirmation).
- **Tasks & Templates:** Overdue/upcoming task tracking, message/script templates with variable replacement (`{business_name}`, `{area}`).
- **Dashboard & Settings:** Quick stat counters, pipeline breakdowns, lead scoring rules, and JSON export/import backup.

## 2. Stack & Key Libraries
- **Build & Framework:** Vite 6, React 19, TypeScript
- **Styling:** Tailwind CSS v4 (`@tailwindcss/vite`), clsx, tailwind-merge, Lucide React icons
- **Client Storage:** Dexie 4 (IndexedDB)
- **Data & Tables:** TanStack React Table v8, SheetJS (`xlsx`) for parsing spreadsheets
- **Helpers:** `libphonenumber-js` for phone normalization (+91 India default), `date-fns` for date manipulation, `canvas-confetti` for celebratory UI feedback

## 3. Main Folder & File Structure
- `src/db/`: `database.ts` (Dexie schema definitions), `seedData.ts` (initial ~60 mock leads).
- `src/repos/`: Repository pattern abstraction over Dexie (`leadsRepo`, `callsRepo`, `tasksRepo`, `templatesRepo`, `batchesRepo`, `settingsRepo`, `activityRepo`).
- `src/context/`: `LeadonicContext.tsx` providing reactive state and actions across the frontend.
- `src/components/`: Subdirectories for `dashboard/`, `callQueue/`, `leads/`, `import/`, `tasks/`, `templates/`, `settings/`, and `layout/`.
- `src/lib/`: Utilities for phone validation (`phone.ts`), Excel parsing & header guessing (`excel.ts`), scoring rules (`scoring.ts`), and audio/confetti feedback (`feedback.ts`).

## 4. Finished vs Unfinished Features
- **Finished:**
  - Full client-side UI for Call Queue, Lead table, Add/Edit lead modals, and Import wizard.
  - IndexedDB storage with seed data and JSON export/import.
  - Column auto-guessing and phone normalization logic.
- **Unfinished / Missing:**
  - No backend server or centralized relational database (PostgreSQL/Neon).
  - No authentication, user sessions, or security protection.
  - No multi-user support or server-side API endpoints.
  - Lead statuses were fixed to the demo pipeline rather than dynamically customizable.

## 5. Anything Worth Reusing
- Phone normalization logic in `src/lib/phone.ts` and SheetJS parsing techniques in `src/lib/excel.ts`.
- Field mapping definitions and deduplication key logic (adapted for the new scraper format).
- UI patterns, table designs, and dialog structure for the new clean light-theme interface.
