import React, { useState } from 'react'
import {
  FileSpreadsheet,
  UploadCloud,
  Download,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  PhoneCall,
  Users,
  Check,
  RefreshCw,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useLeadonic } from '../../context/LeadonicContext'
import {
  parseSpreadsheetFile,
  guessColumnMapping,
  validateImportRows,
  downloadSampleExcel,
  ColumnMapping,
  ValidationRow,
} from '../../lib/excel'
import { leadsRepo } from '../../repos/leadsRepo'
import { batchesRepo } from '../../repos/batchesRepo'
import { generateId } from '../../lib/utils'

export const ImportWizardView: React.FC = () => {
  const { rules, refreshData, showToast } = useLeadonic()
  const navigate = useNavigate()

  // Wizard state: 1 = Upload, 2 = Mapping, 3 = Preview, 4 = Confirmation & Result
  const [step, setStep] = useState<number>(1)
  const [file, setFile] = useState<File | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([])
  const [mapping, setMapping] = useState<ColumnMapping>({
    name: '',
    phone: '',
    address: '',
    category: '',
    website: '',
    rating: '',
    reviews: '',
    area: '',
  })
  const [validatedRows, setValidatedRows] = useState<ValidationRow[]>([])
  const [batchName, setBatchName] = useState<string>('Bangalore Prime Outreach Batch')
  const [defaultArea, setDefaultArea] = useState<string>('Indiranagar')
  const [skipDbDuplicates, setSkipDbDuplicates] = useState<boolean>(true)
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [importSummary, setImportSummary] = useState<{
    added: number
    skipped: number
    errors: number
  } | null>(null)

  // Step 1: File selection
  const handleFileUpload = async (uploadedFile: File) => {
    try {
      setFile(uploadedFile)
      const parsed = await parseSpreadsheetFile(uploadedFile)
      setHeaders(parsed.headers)
      setRawRows(parsed.rows)

      // Auto-guess columns
      const guessed = guessColumnMapping(parsed.headers)
      setMapping(guessed)

      setBatchName(
        `${uploadedFile.name.replace(/\.[^/.]+$/, '')} - ${new Date().toLocaleDateString()}`
      )
      setStep(2)
      showToast(`Loaded ${parsed.rows.length} rows from file`, 'info')
    } catch (err: any) {
      showToast(err.message || 'Failed to read file', 'error')
    }
  }

  // Load Built-in Demo File instantly
  const handleLoadSampleDemo = async () => {
    // Generate synthetic file buffer and process
    const sampleRows = [
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
        'Business Name': 'Incomplete Lead Sample',
        'Phone': '', // intentionally missing phone to demonstrate validation
        'Address': 'Indiranagar',
        'Category': 'General',
        'Website': '',
        'Rating': 4.0,
        'Reviews': 10,
        'Area': 'Indiranagar',
      },
      {
        'Business Name': 'Invalid Phone Sample Lead',
        'Phone': '12345', // intentionally invalid
        'Address': 'Koramangala',
        'Category': 'General',
        'Website': '',
        'Rating': 3.5,
        'Reviews': 5,
        'Area': 'Koramangala',
      },
    ]

    const headersList = Object.keys(sampleRows[0])
    setHeaders(headersList)
    setRawRows(sampleRows)
    setMapping(guessColumnMapping(headersList))
    setBatchName('Demo Import Sample - Bangalore High Growth')
    setStep(2)
    showToast('Loaded demo dataset with valid & intentional test edge cases!', 'info')
  }

  // Step 2 -> Step 3: Run Validation & Duplicate Detection
  const handleProceedToPreview = async () => {
    if (!mapping.name || !mapping.phone) {
      showToast('Please map at least Name and Phone columns', 'warning')
      return
    }

    const existingPhones = await leadsRepo.getExistingPhonesSet()
    const validated = validateImportRows(rawRows, mapping, existingPhones, defaultArea)
    setValidatedRows(validated)
    setStep(3)
  }

  // Step 4: Execute Import
  const handleExecuteImport = async () => {
    setIsProcessing(true)
    const batchId = generateId()
    let added = 0
    let skipped = 0
    let errors = 0

    try {
      for (const row of validatedRows) {
        if (row.isMissingPhone || !row.isValidPhone || row.isDuplicateInFile) {
          errors++
          continue
        }

        if (row.isDuplicateInDb && skipDbDuplicates) {
          skipped++
          continue
        }

        // Add lead to Dexie DB
        await leadsRepo.create(
          {
            name: row.mapped.name,
            phone: row.normalizedPhone,
            rawPhone: row.mapped.phone,
            address: row.mapped.address,
            category: row.mapped.category,
            website: row.mapped.website,
            rating: row.mapped.rating,
            reviews: row.mapped.reviews,
            area: row.mapped.area || defaultArea,
            batchId,
            status: 'New',
          },
          rules
        )
        added++
      }

      // Save batch record
      await batchesRepo.create({
        id: batchId,
        fileName: file?.name || 'sample_bangalore_leads.xlsx',
        area: defaultArea,
        date: new Date().toISOString(),
        added,
        skipped,
        errors,
        leadsCount: added,
      })

      setImportSummary({ added, skipped, errors })
      setStep(4)
      await refreshData()
      showToast(`Successfully imported ${added} leads!`, 'success')
    } catch (err: any) {
      showToast('Import failed: ' + err.message, 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  const validCount = validatedRows.filter((r) => r.status === 'valid').length
  const warningCount = validatedRows.filter((r) => r.status === 'warning').length
  const errorCount = validatedRows.filter((r) => r.status === 'error').length

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Wizard Header & Stepper */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
            <span>4-Step Excel Lead Import Wizard</span>
          </h1>
          <p className="text-xs text-slate-400">
            Upload .xlsx / .csv, auto-map headers, detect duplicates, and load into call queue
          </p>
        </div>

        {/* Stepper Progress */}
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step === s
                    ? 'bg-emerald-500 text-white ring-4 ring-emerald-500/20'
                    : step > s
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                    : 'bg-slate-800 text-slate-500'
                }`}
              >
                {step > s ? <Check className="w-3.5 h-3.5" /> : s}
              </div>
              {s < 4 && <div className="w-4 h-0.5 bg-slate-800" />}
            </div>
          ))}
        </div>
      </div>

      {/* STEP 1: Upload File */}
      {step === 1 && (
        <div className="space-y-6 animate-in fade-in">
          <div className="glass-card rounded-2xl p-8 border border-slate-800 text-center space-y-6">
            <div className="max-w-md mx-auto space-y-3">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <UploadCloud className="w-8 h-8" />
              </div>
              <h2 className="text-lg font-bold text-white">Upload Your Lead List</h2>
              <p className="text-xs text-slate-400">
                Supports Excel (.xlsx, .xls) and CSV (.csv) files. Automatically parses columns in
                browser with SheetJS.
              </p>
            </div>

            {/* Dropzone container */}
            <label className="block max-w-lg mx-auto p-8 rounded-2xl border-2 border-dashed border-slate-700 hover:border-indigo-500 bg-slate-950/40 hover:bg-slate-900/60 cursor-pointer transition-all group">
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleFileUpload(f)
                }}
                className="hidden"
              />
              <FileSpreadsheet className="w-8 h-8 mx-auto text-slate-500 group-hover:text-indigo-400 transition-colors mb-2" />
              <div className="text-sm font-semibold text-slate-200">
                Click to browse or drag and drop file here
              </div>
              <div className="text-[11px] text-slate-400 mt-1">.XLSX, .XLS, or .CSV (up to 5,000 rows)</div>
            </label>

            {/* Helper buttons */}
            <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleLoadSampleDemo}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-2 shadow-md shadow-indigo-950 transition-all"
              >
                <Sparkles className="w-4 h-4 text-emerald-300" />
                <span>Load Sample Bangalore Leads (1-Click)</span>
              </button>

              <button
                type="button"
                onClick={downloadSampleExcel}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center gap-2 border border-slate-700 transition-colors"
              >
                <Download className="w-4 h-4 text-indigo-400" />
                <span>Download Template .xlsx</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Map Columns */}
      {step === 2 && (
        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-white">Step 2: Map Spreadsheet Columns</h2>
              <p className="text-xs text-slate-400">
                Leadonic auto-detected your headers. Verify or adjust mappings below.
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 font-medium">
              {rawRows.length} total rows detected
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Name */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Business Name Column *
              </label>
              <select
                value={mapping.name}
                onChange={(e) => setMapping({ ...mapping, name: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
              >
                <option value="">-- Select Header --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h} (e.g. {rawRows[0]?.[h]})
                  </option>
                ))}
              </select>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Phone Number Column *
              </label>
              <select
                value={mapping.phone}
                onChange={(e) => setMapping({ ...mapping, phone: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
              >
                <option value="">-- Select Header --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h} (e.g. {rawRows[0]?.[h]})
                  </option>
                ))}
              </select>
            </div>

            {/* Address */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Address Column</label>
              <select
                value={mapping.address}
                onChange={(e) => setMapping({ ...mapping, address: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
              >
                <option value="">-- Not Mapped --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h} (e.g. {rawRows[0]?.[h]})
                  </option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Category / Industry</label>
              <select
                value={mapping.category}
                onChange={(e) => setMapping({ ...mapping, category: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
              >
                <option value="">-- Not Mapped --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h} (e.g. {rawRows[0]?.[h]})
                  </option>
                ))}
              </select>
            </div>

            {/* Website */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Website URL</label>
              <select
                value={mapping.website}
                onChange={(e) => setMapping({ ...mapping, website: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
              >
                <option value="">-- Not Mapped --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h} (e.g. {rawRows[0]?.[h]})
                  </option>
                ))}
              </select>
            </div>

            {/* Rating */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Rating Column</label>
              <select
                value={mapping.rating}
                onChange={(e) => setMapping({ ...mapping, rating: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
              >
                <option value="">-- Not Mapped --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h} (e.g. {rawRows[0]?.[h]})
                  </option>
                ))}
              </select>
            </div>

            {/* Reviews */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Reviews Count</label>
              <select
                value={mapping.reviews}
                onChange={(e) => setMapping({ ...mapping, reviews: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
              >
                <option value="">-- Not Mapped --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h} (e.g. {rawRows[0]?.[h]})
                  </option>
                ))}
              </select>
            </div>

            {/* Area */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Area / Locality</label>
              <select
                value={mapping.area}
                onChange={(e) => setMapping({ ...mapping, area: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
              >
                <option value="">-- Fallback to Batch Default --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h} (e.g. {rawRows[0]?.[h]})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Upload</span>
            </button>
            <button
              onClick={handleProceedToPreview}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5"
            >
              <span>Validate & Preview Rows</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Preview with Validation & Duplicate Checks */}
      {step === 3 && (
        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-6 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-white">
                Step 3: Data Quality & Duplicate Detection
              </h2>
              <p className="text-xs text-slate-400">
                Checking phone numbers against existing database and duplicate entries within this file
              </p>
            </div>

            {/* Summary Badges */}
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold">
                {validCount} Valid
              </span>
              {warningCount > 0 && (
                <span className="text-xs px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">
                  {warningCount} DB Duplicates
                </span>
              )}
              {errorCount > 0 && (
                <span className="text-xs px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30 font-semibold">
                  {errorCount} Errors
                </span>
              )}
            </div>
          </div>

          {/* Batch Settings Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Batch Identifier</label>
              <input
                type="text"
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Default Area (if blank)</label>
              <select
                value={defaultArea}
                onChange={(e) => setDefaultArea(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
              >
                <option value="Indiranagar">Indiranagar</option>
                <option value="Koramangala">Koramangala</option>
                <option value="HSR Layout">HSR Layout</option>
                <option value="Whitefield">Whitefield</option>
              </select>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={skipDbDuplicates}
                  onChange={(e) => setSkipDbDuplicates(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-0"
                />
                <span>Skip leads already in CRM database</span>
              </label>
            </div>
          </div>

          {/* Validation Rows Table */}
          <div className="max-h-80 overflow-y-auto border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/90 text-slate-400 font-semibold sticky top-0 border-b border-slate-800">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Business Name</th>
                  <th className="p-3">Normalized Phone</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Area</th>
                  <th className="p-3">Validation Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                {validatedRows.map((row) => (
                  <tr key={row.index} className="hover:bg-slate-850/60">
                    <td className="p-3 font-mono text-slate-500">{row.index + 1}</td>
                    <td className="p-3 font-semibold text-white">{row.mapped.name}</td>
                    <td className="p-3 font-mono text-slate-300">{row.normalizedPhone || '—'}</td>
                    <td className="p-3 text-slate-400">{row.mapped.category}</td>
                    <td className="p-3 text-slate-400">{row.mapped.area || defaultArea}</td>
                    <td className="p-3">
                      {row.status === 'valid' && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 w-max">
                          <CheckCircle className="w-3 h-3 text-emerald-400" />
                          <span>Valid</span>
                        </span>
                      )}
                      {row.status === 'warning' && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 w-max">
                          <AlertTriangle className="w-3 h-3 text-amber-400" />
                          <span>In Database (Duplicate)</span>
                        </span>
                      )}
                      {row.status === 'error' && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1 w-max">
                          <XCircle className="w-3 h-3 text-rose-400" />
                          <span>{row.errors[0] || 'Error'}</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Mapping</span>
            </button>

            <button
              onClick={handleExecuteImport}
              disabled={isProcessing}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-950 transition-all hover:scale-[1.02]"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Importing into IndexedDB...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-emerald-200" />
                  <span>Confirm & Import Leads</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Import Complete Summary */}
      {step === 4 && importSummary && (
        <div className="glass-card rounded-2xl p-8 border border-slate-800 text-center space-y-6 animate-in zoom-in-95">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <CheckCircle className="w-8 h-8" />
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <h2 className="text-xl font-bold text-white">Import Complete!</h2>
            <p className="text-xs text-slate-300">
              Your leads are saved into the local database and immediately prioritized in the call queue.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 max-w-md mx-auto text-center">
            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-emerald-500/30">
              <div className="text-2xl font-black text-emerald-400">{importSummary.added}</div>
              <div className="text-[11px] text-slate-400 mt-1">Leads Added</div>
            </div>

            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-amber-500/30">
              <div className="text-2xl font-black text-amber-400">{importSummary.skipped}</div>
              <div className="text-[11px] text-slate-400 mt-1">Skipped (Dupl)</div>
            </div>

            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-rose-500/30">
              <div className="text-2xl font-black text-rose-400">{importSummary.errors}</div>
              <div className="text-[11px] text-slate-400 mt-1">Errors Filtered</div>
            </div>
          </div>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/queue"
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-950 transition-all hover:scale-105"
            >
              <PhoneCall className="w-4 h-4" />
              <span>Open Call Queue Now</span>
            </Link>

            <Link
              to="/leads"
              className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-2 border border-slate-700 transition-colors"
            >
              <Users className="w-4 h-4 text-indigo-400" />
              <span>View Leads Directory</span>
            </Link>

            <button
              onClick={() => {
                setStep(1)
                setFile(null)
                setValidatedRows([])
                setImportSummary(null)
              }}
              className="px-4 py-3 rounded-xl text-slate-400 hover:text-white text-xs font-medium"
            >
              Import Another File
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
