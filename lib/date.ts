/**
 * Date utilities using Asia/Kolkata (IST = UTC+05:30)
 */

export function getTodayIST(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return formatter.format(new Date()) // YYYY-MM-DD
}

export function isFutureDateIST(dateStr: string): boolean {
  // dateStr is in YYYY-MM-DD
  const today = getTodayIST()
  // Compare strings YYYY-MM-DD
  return dateStr.slice(0, 10) > today
}

export function parseDateToMidnightUTC(dateStr: string): Date {
  const clean = dateStr.slice(0, 10)
  return new Date(`${clean}T00:00:00.000Z`)
}

export function formatDateShort(dateVal: string | Date | null | undefined): string {
  if (!dateVal) return '-'
  const d = typeof dateVal === 'string' ? new Date(dateVal) : dateVal
  if (isNaN(d.getTime())) return '-'
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
  }).format(d)
}

export function formatDateTimeIST(dateVal: string | Date | null | undefined): string {
  if (!dateVal) return '—'
  const d = typeof dateVal === 'string' ? new Date(dateVal) : dateVal
  if (isNaN(d.getTime())) return '—'
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d)
  return parts.replace(/\b(am|pm)\b/i, (m) => m.toUpperCase())
}

