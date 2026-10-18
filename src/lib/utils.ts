import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import {
  addDays,
  addWeeks,
  format,
  isToday,
  isTomorrow,
  isPast,
  isAfter,
  parseISO,
  startOfDay,
  setHours,
  setMinutes,
} from 'date-fns'
import { CallOutcome } from '../types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateId(): string {
  return 'id_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36)
}

export function formatDate(dateString: string | null | undefined, fmt: string = 'dd MMM yyyy, hh:mm a'): string {
  if (!dateString) return '—'
  try {
    return format(parseISO(dateString), fmt)
  } catch {
    return dateString
  }
}

export function formatShortDate(dateString: string | null | undefined): string {
  if (!dateString) return '—'
  try {
    const d = parseISO(dateString)
    if (isToday(d)) return `Today, ${format(d, 'hh:mm a')}`
    if (isTomorrow(d)) return `Tomorrow, ${format(d, 'hh:mm a')}`
    return format(d, 'dd MMM, hh:mm a')
  } catch {
    return dateString
  }
}

/**
 * Checks if a date is overdue (in the past relative to now)
 */
export function isFollowupOverdue(dateString: string | null | undefined): boolean {
  if (!dateString) return false
  try {
    const d = parseISO(dateString)
    return isPast(d) && !isToday(d)
  } catch {
    return false
  }
}

export function getFollowupStatus(
  dateString: string | null | undefined
): 'overdue' | 'today' | 'upcoming' | 'none' {
  if (!dateString) return 'none'
  try {
    const d = parseISO(dateString)
    if (isToday(d)) return 'today'
    if (isPast(d)) return 'overdue'
    return 'upcoming'
  } catch {
    return 'none'
  }
}

/**
 * Rule: After "No answer" or "Callback", a follow-up date is suggested automatically.
 * Callback -> Tomorrow 11:00 AM
 * No answer -> 2 days later 03:00 PM
 * Interested -> Tomorrow 10:00 AM
 */
export function suggestFollowupDate(outcome: CallOutcome): string | null {
  const now = new Date()
  let target: Date

  if (outcome === 'Callback') {
    // Tomorrow at 11:00 AM
    target = setMinutes(setHours(addDays(now, 1), 11), 0)
  } else if (outcome === 'No answer') {
    // 2 days from now at 03:00 PM
    target = setMinutes(setHours(addDays(now, 2), 15), 0)
  } else if (outcome === 'Interested') {
    // Tomorrow at 10:00 AM
    target = setMinutes(setHours(addDays(now, 1), 10), 0)
  } else {
    return null
  }

  return target.toISOString()
}

/**
 * Quick date picker options: Tomorrow, 3 days, Next week
 */
export function getQuickFollowupDate(preset: 'tomorrow' | '3days' | 'nextWeek'): string {
  const now = new Date()
  let target: Date

  switch (preset) {
    case 'tomorrow':
      target = setMinutes(setHours(addDays(now, 1), 11), 0)
      break
    case '3days':
      target = setMinutes(setHours(addDays(now, 3), 14), 0)
      break
    case 'nextWeek':
      target = setMinutes(setHours(addWeeks(now, 1), 11), 0)
      break
  }

  return target.toISOString()
}

/**
 * Replaces template variables {business_name} and {area}
 */
export function replacePlaceholders(
  templateText: string,
  lead: { name?: string; area?: string; category?: string }
): string {
  let res = templateText || ''
  const name = lead.name || 'valued partner'
  const area = lead.area || 'your area'
  const category = lead.category || 'business'

  res = res.replace(/\{business_name\}/gi, name)
  res = res.replace(/\{businessname\}/gi, name)
  res = res.replace(/\{area\}/gi, area)
  res = res.replace(/\{category\}/gi, category)

  return res
}
