import { test, describe } from 'node:test'
import assert from 'node:assert'
import { normalizePhone, makeDedupeKey, makeSchoolDedupeKey, parseBool, parseNum } from '../lib/normalize.js'
import { getTodayIST, isFutureDateIST, parseDateToMidnightUTC, formatDateShort, formatDateTimeIST } from '../lib/date.js'
import { isDeleteEnabled } from '../backend/src/config.js'

describe('normalizePhone', () => {
  test('handles 10-digit Indian numbers without country code', () => {
    assert.strictEqual(normalizePhone('9876543210'), '9876543210')
    assert.strictEqual(normalizePhone(' 98765 43210 '), '9876543210')
    assert.strictEqual(normalizePhone('98765-43210'), '9876543210')
  })

  test('normalizes 12-digit Indian numbers starting with 91', () => {
    assert.strictEqual(normalizePhone('+91 98765 43210'), '9876543210')
    assert.strictEqual(normalizePhone('919876543210'), '9876543210')
    assert.strictEqual(normalizePhone('+91-9876543210'), '9876543210')
  })

  test('normalizes 11-digit numbers with leading 0 (trunk prefix)', () => {
    assert.strictEqual(normalizePhone('09876543210'), '9876543210')
    assert.strictEqual(normalizePhone('098765 43210'), '9876543210')
  })

  test('returns null for invalid or non-10-digit phone numbers', () => {
    assert.strictEqual(normalizePhone(null), null)
    assert.strictEqual(normalizePhone(undefined), null)
    assert.strictEqual(normalizePhone(''), null)
    assert.strictEqual(normalizePhone('12345'), null)
    assert.strictEqual(normalizePhone('abcdefghij'), null)
    assert.strictEqual(normalizePhone('1234567890123'), null)
  })
})

describe('makeDedupeKey', () => {
  test('generates phone-based dedupe key when normalized phone is present', () => {
    assert.strictEqual(makeDedupeKey('ABC Academy', '123 Main St', '9876543210'), 'p:9876543210')
  })

  test('falls back to title and address when phone is null', () => {
    assert.strictEqual(
      makeDedupeKey('  ABC Academy  ', '  123 Main St  ', null),
      't:abc academy|123 main st'
    )
    assert.strictEqual(
      makeDedupeKey('ABC Academy', null, null),
      't:abc academy|'
    )
  })
})

describe('makeSchoolDedupeKey', () => {
  test('generates phone-based school dedupe key when phone is present', () => {
    assert.strictEqual(makeSchoolDedupeKey('Delhi Public School', 'Whitefield', '9876543210'), 'p:9876543210')
  })

  test('falls back to name and area when phone is null', () => {
    assert.strictEqual(
      makeSchoolDedupeKey('  Delhi Public School  ', '  Whitefield  ', null),
      't:delhi public school|whitefield'
    )
  })
})

describe('parseBool & parseNum', () => {
  test('parseBool handles truthy and falsy representations', () => {
    assert.strictEqual(parseBool(true), true)
    assert.strictEqual(parseBool(false), false)
    assert.strictEqual(parseBool('true'), true)
    assert.strictEqual(parseBool('YES'), true)
    assert.strictEqual(parseBool('1'), true)
    assert.strictEqual(parseBool('false'), false)
    assert.strictEqual(parseBool('NO'), false)
    assert.strictEqual(parseBool('0'), false)
    assert.strictEqual(parseBool(''), null)
    assert.strictEqual(parseBool(null), null)
    assert.strictEqual(parseBool('invalid'), null)
  })

  test('parseNum parses numbers and strings with commas', () => {
    assert.strictEqual(parseNum(42), 42)
    assert.strictEqual(parseNum('4.5'), 4.5)
    assert.strictEqual(parseNum('1,234.56'), 1234.56)
    assert.strictEqual(parseNum(''), null)
    assert.strictEqual(parseNum(null), null)
    assert.strictEqual(parseNum('abc'), null)
  })
})

describe('date utilities (Asia/Kolkata)', () => {
  test('getTodayIST returns YYYY-MM-DD format', () => {
    const today = getTodayIST()
    assert.match(today, /^\d{4}-\d{2}-\d{2}$/)
  })

  test('isFutureDateIST correctly rejects dates beyond today', () => {
    assert.strictEqual(isFutureDateIST('2099-12-31'), true)
    assert.strictEqual(isFutureDateIST('2000-01-01'), false)
    assert.strictEqual(isFutureDateIST(getTodayIST()), false)
  })

  test('parseDateToMidnightUTC produces valid Date at UTC midnight', () => {
    const d = parseDateToMidnightUTC('2026-10-20')
    assert.strictEqual(d.toISOString(), '2026-10-20T00:00:00.000Z')
  })

  test('formatDateShort and formatDateTimeIST handle null and valid dates', () => {
    assert.strictEqual(formatDateShort(null), '-')
    assert.strictEqual(formatDateShort(undefined), '-')
    assert.strictEqual(formatDateShort('invalid'), '-')
    assert.match(formatDateShort('2026-10-20T00:00:00.000Z'), /\d{1,2}\s+[A-Za-z]+/)

    assert.strictEqual(formatDateTimeIST(null), '—')
    assert.strictEqual(formatDateTimeIST('invalid'), '—')
  })
})

describe('isDeleteEnabled config switch', () => {
  test('returns true only when ALLOW_DELETE is exactly "true" (case-insensitive)', () => {
    const original = process.env['ALLOW_DELETE']

    process.env['ALLOW_DELETE'] = 'true'
    assert.strictEqual(isDeleteEnabled(), true)

    process.env['ALLOW_DELETE'] = ' TRUE '
    assert.strictEqual(isDeleteEnabled(), true)

    process.env['ALLOW_DELETE'] = 'false'
    assert.strictEqual(isDeleteEnabled(), false)

    process.env['ALLOW_DELETE'] = '1'
    assert.strictEqual(isDeleteEnabled(), false)

    delete process.env['ALLOW_DELETE']
    assert.strictEqual(isDeleteEnabled(), false)

    if (original !== undefined) {
      process.env['ALLOW_DELETE'] = original
    } else {
      delete process.env['ALLOW_DELETE']
    }
  })
})
