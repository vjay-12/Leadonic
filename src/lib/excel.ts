import * as XLSX from 'xlsx'
import { Lead } from '../types'
import { normalizePhone } from './phone'

export interface RawParsedSheet {
  headers: string[]
  rows: Record<string, any>[]
}

export interface ColumnMapping {
  name: string
  phone: string
  address: string
  category: string
  website: string
  rating: string
  reviews: string
  area: string
}

export interface ValidationRow {
  index: number
  raw: Record<string, any>
  mapped: {
    name: string
    phone: string
    address: string
    category: string
    website: string
    rating: number
    reviews: number
    area: string
  }
  normalizedPhone: string
  isValidPhone: boolean
  isMissingPhone: boolean
  isDuplicateInFile: boolean
  isDuplicateInDb: boolean
  errors: string[]
  status: 'valid' | 'warning' | 'error'
}

/**
 * Auto-guesses the best column match for standard fields based on header text
 */
export function guessColumnMapping(headers: string[]): ColumnMapping {
  const findMatch = (candidates: string[]): string => {
    for (const cand of candidates) {
      const found = headers.find((h) => {
        const clean = h.toLowerCase().trim().replace(/[\s_-]+/g, '')
        return clean === cand.replace(/[\s_-]+/g, '') || clean.includes(cand)
      })
      if (found) return found
    }
    return ''
  }

  return {
    name: findMatch(['businessname', 'companyname', 'name', 'company', 'business', 'title', 'firm']),
    phone: findMatch(['phone', 'mobile', 'contact', 'telephone', 'phonenumber', 'cell', 'tel']),
    address: findMatch(['address', 'location', 'street', 'addr', 'fulladdress']),
    category: findMatch(['category', 'industry', 'type', 'business_type', 'segment']),
    website: findMatch(['website', 'url', 'web', 'domain', 'site', 'link']),
    rating: findMatch(['rating', 'stars', 'rate', 'star_rating']),
    reviews: findMatch(['reviews', 'reviewcount', 'ratingscount', 'num_reviews']),
    area: findMatch(['area', 'locality', 'suburb', 'city', 'neighborhood', 'zone']),
  }
}

/**
 * Parses an uploaded Excel or CSV file buffer
 */
export async function parseSpreadsheetFile(file: File): Promise<RawParsedSheet> {
  const data = await file.arrayBuffer()
  const workbook = XLSX.read(data, { type: 'array' })
  const firstSheetName = workbook.SheetNames[0]
  if (!firstSheetName) {
    throw new Error('Spreadsheet has no sheets')
  }

  const worksheet = workbook.Sheets[firstSheetName]
  const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' })

  if (rows.length === 0) {
    throw new Error('Spreadsheet is empty')
  }

  const headers = Object.keys(rows[0] || {})
  return { headers, rows }
}

/**
 * Validates rows based on mapping and checks against existing DB leads
 */
export function validateImportRows(
  rows: Record<string, any>[],
  mapping: ColumnMapping,
  existingDbPhones: Set<string>,
  defaultArea: string = 'Indiranagar'
): ValidationRow[] {
  const seenInFile = new Set<string>()
  const result: ValidationRow[] = []

  rows.forEach((row, idx) => {
    const rawName = String(row[mapping.name] || '').trim() || `Lead #${idx + 1}`
    const rawPhone = String(row[mapping.phone] || '').trim()
    const rawAddress = String(row[mapping.address] || '').trim()
    const rawCategory = String(row[mapping.category] || '').trim() || 'General'
    const rawWebsite = String(row[mapping.website] || '').trim()
    const rawRating = parseFloat(row[mapping.rating]) || 0
    const rawReviews = parseInt(row[mapping.reviews], 10) || 0
    const rawArea = String(row[mapping.area] || '').trim() || defaultArea

    const phoneCheck = normalizePhone(rawPhone)
    const normPhone = phoneCheck.e164 || rawPhone
    const isMissingPhone = !rawPhone
    const isValidPhone = phoneCheck.isValid
    const isDuplicateInFile = Boolean(normPhone && seenInFile.has(normPhone))
    const isDuplicateInDb = Boolean(normPhone && existingDbPhones.has(normPhone))

    const errors: string[] = []
    if (isMissingPhone) errors.push('Missing phone number')
    else if (!isValidPhone) errors.push('Invalid phone number format')

    if (isDuplicateInFile) errors.push('Duplicate phone within this file')
    if (isDuplicateInDb) errors.push('Already exists in CRM database')

    if (normPhone && isValidPhone) {
      seenInFile.add(normPhone)
    }

    let status: 'valid' | 'warning' | 'error' = 'valid'
    if (isMissingPhone || !isValidPhone || isDuplicateInFile) {
      status = 'error'
    } else if (isDuplicateInDb) {
      status = 'warning'
    }

    result.push({
      index: idx,
      raw: row,
      mapped: {
        name: rawName,
        phone: rawPhone,
        address: rawAddress,
        category: rawCategory,
        website: rawWebsite,
        rating: rawRating,
        reviews: rawReviews,
        area: rawArea,
      },
      normalizedPhone: normPhone,
      isValidPhone,
      isMissingPhone,
      isDuplicateInFile,
      isDuplicateInDb,
      errors,
      status,
    })
  })

  return result
}

/**
 * Downloads a sample .xlsx file with realistic Bangalore businesses
 */
export function downloadSampleExcel() {
  const sampleData = [
    {
      'Business Name': 'Apex Dental Care & Implant Center',
      'Phone': '+91 98451 22340',
      'Address': '100ft Road, 12th Main, Indiranagar',
      'Category': 'Dental Clinic',
      'Website': 'https://apexdentalcare.in',
      'Rating': 4.7,
      'Reviews': 86,
      'Area': 'Indiranagar',
    },
    {
      'Business Name': 'Prime Urban Realty Experts',
      'Phone': '9880193482',
      'Address': '5th Block, 80ft Road, Koramangala',
      'Category': 'Real Estate Agency',
      'Website': 'https://primeurbanrealty.com',
      'Rating': 4.4,
      'Reviews': 42,
      'Area': 'Koramangala',
    },
    {
      'Business Name': 'Artisan Brew Roastery & Cafe',
      'Phone': '09844018293',
      'Address': 'Sector 3, 27th Main, HSR Layout',
      'Category': 'Boutique Cafe',
      'Website': 'https://artisanbrewblr.com',
      'Rating': 4.8,
      'Reviews': 156,
      'Area': 'HSR Layout',
    },
    {
      'Business Name': 'Titan Crossfit & Performance Hub',
      'Phone': '9845012398',
      'Address': 'Outer Ring Road, Marathahalli',
      'Category': 'Gym & Fitness',
      'Website': 'https://titanperformance.in',
      'Rating': 4.6,
      'Reviews': 68,
      'Area': 'Indiranagar',
    },
    {
      'Business Name': 'Zenith IIT-JEE & NEET Academy',
      'Phone': '9900182740',
      'Address': '7th Block, Koramangala',
      'Category': 'Coaching Institute',
      'Website': 'https://zenithacademy.org',
      'Rating': 4.3,
      'Reviews': 53,
      'Area': 'Koramangala',
    },
    {
      'Business Name': 'Aura Luxury Wellness Spa & Salon',
      'Phone': '9886029381',
      'Address': '14th Main, HSR Layout Sector 4',
      'Category': 'Salon & Spa',
      'Website': 'https://aurasalonblr.in',
      'Rating': 4.5,
      'Reviews': 94,
      'Area': 'HSR Layout',
    },
    {
      'Business Name': 'SpeedyCare Multi-brand Auto Garage',
      'Phone': '9740192837',
      'Address': 'Old Airport Road, Kodihalli',
      'Category': 'Auto Services',
      'Website': '',
      'Rating': 3.9,
      'Reviews': 31,
      'Area': 'Indiranagar',
    },
    {
      'Business Name': 'CloudPeak Software Innovations',
      'Phone': '9845091823',
      'Address': '100ft Road, Indiranagar',
      'Category': 'IT Consulting',
      'Website': 'https://cloudpeakinno.com',
      'Rating': 4.2,
      'Reviews': 27,
      'Area': 'Indiranagar',
    },
  ]

  const ws = XLSX.utils.json_to_sheet(sampleData)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sample_Leads')
  XLSX.writeFile(wb, 'Leadonic_Sample_Leads_Template.xlsx')
}

/**
 * Export leads to CSV file
 */
export function exportLeadsToCsv(leads: Lead[], filename = 'leadonic_leads_export.csv') {
  const exportData = leads.map((l) => ({
    ID: l.id,
    Name: l.name,
    Phone: l.phone,
    Address: l.address,
    Category: l.category,
    Website: l.website || '',
    Rating: l.rating,
    Reviews: l.reviews,
    Area: l.area,
    Status: l.status,
    Score: l.score,
    'Do Not Call': l.doNotCall ? 'Yes' : 'No',
    'Call Count': l.callCount,
    'Next Followup': l.nextFollowup || '',
    'Last Called': l.lastCalledAt || '',
    'Created At': l.createdAt,
  }))

  const ws = XLSX.utils.json_to_sheet(exportData)
  const csv = XLSX.utils.sheet_to_csv(ws)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
