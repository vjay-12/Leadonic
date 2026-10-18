import { parsePhoneNumberFromString } from 'libphonenumber-js'

export interface PhoneValidationResult {
  isValid: boolean
  formatted: string // e.g. +91 98765 43210
  e164: string // e.g. +919876543210
  national: string // e.g. 098765 43210 or 9876543210
  error?: string
}

/**
 * Normalizes and validates a phone number defaulting to India (+91).
 * Strips formatting, handles local prefixes (0, +91, 91).
 */
export function normalizePhone(rawPhone: string | number | undefined | null, defaultCountry: 'IN' = 'IN'): PhoneValidationResult {
  if (!rawPhone) {
    return {
      isValid: false,
      formatted: '',
      e164: '',
      national: '',
      error: 'Phone number is missing',
    }
  }

  const str = String(rawPhone).trim()
  if (!str) {
    return {
      isValid: false,
      formatted: '',
      e164: '',
      national: '',
      error: 'Phone number is empty',
    }
  }

  // Remove common separators
  const cleaned = str.replace(/[^\d+]/g, '')

  try {
    const phoneNumber = parsePhoneNumberFromString(cleaned, defaultCountry)

    if (phoneNumber && phoneNumber.isValid()) {
      return {
        isValid: true,
        formatted: phoneNumber.formatInternational(),
        e164: phoneNumber.format('E.164'),
        national: phoneNumber.formatNational(),
      }
    }

    // Fallback heuristic for Indian 10-digit mobile numbers
    const digitsOnly = str.replace(/\D/g, '')
    if (digitsOnly.length === 10) {
      const e164 = `+91${digitsOnly}`
      return {
        isValid: true,
        formatted: `+91 ${digitsOnly.slice(0, 5)} ${digitsOnly.slice(5)}`,
        e164,
        national: digitsOnly,
      }
    } else if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
      const actual = digitsOnly.slice(1)
      const e164 = `+91${actual}`
      return {
        isValid: true,
        formatted: `+91 ${actual.slice(0, 5)} ${actual.slice(5)}`,
        e164,
        national: actual,
      }
    } else if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
      const actual = digitsOnly.slice(2)
      const e164 = `+91${actual}`
      return {
        isValid: true,
        formatted: `+91 ${actual.slice(0, 5)} ${actual.slice(5)}`,
        e164,
        national: actual,
      }
    }

    return {
      isValid: false,
      formatted: str,
      e164: cleaned,
      national: digitsOnly,
      error: 'Invalid phone format (must be 10 digits for India)',
    }
  } catch (err) {
    return {
      isValid: false,
      formatted: str,
      e164: cleaned,
      national: str,
      error: 'Failed to parse phone number',
    }
  }
}

/**
 * Format phone for display
 */
export function displayPhone(e164Phone: string): string {
  if (!e164Phone) return ''
  const result = normalizePhone(e164Phone)
  return result.formatted || e164Phone
}

/**
 * Clean phone for WhatsApp wa.me link (digits without +)
 */
export function whatsappDigits(phone: string): string {
  const norm = normalizePhone(phone)
  const e164 = norm.e164 || phone
  return e164.replace(/\D/g, '')
}
