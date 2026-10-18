import React, { useState } from 'react'
import * as XLSX from 'xlsx'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import { LeadCategory, ImportPreviewResult } from '../../types'
import { HEADER_TO_FIELD } from '../../../lib/normalize'
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Plus,
} from 'lucide-react'

interface ImportWizardDialogProps {
  isOpen: boolean
  onClose: () => void
  categories: LeadCategory[]
  onSuccess: () => void
}

const FIELD_OPTIONS = [
  { key: 'title', label: 'Title / Name (Required)' },
  { key: 'phone', label: 'Phone' },
  { key: 'emails', label: 'Emails' },
  { key: 'website', label: 'Website' },
  { key: 'mapsCategory', label: 'Maps Category' },
  { key: 'address', label: 'Address' },
  { key: 'reviewRating', label: 'Review Rating' },
  { key: 'reviewCount', label: 'Review Count' },
  { key: 'hasWebsite', label: 'Has Website' },
  { key: 'needsWebsite', label: 'Needs Website' },
  { key: 'erpMatch', label: 'ERP Match' },
  { key: 'needsErp', label: 'Needs ERP' },
  { key: 'priorityScore', label: 'Priority Score' },
  { key: 'priority', label: 'Priority' },
]

export const ImportWizardDialog: React.FC<ImportWizardDialogProps> = ({
  isOpen,
  onClose,
  categories,
  onSuccess,
}) => {
  const queryClient = useQueryClient()
  const { success, error: toastError } = useToast()

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [categoryId, setCategoryId] = useState<number | ''>(categories[0]?.id || '')

  // Quick add category inline
  const [showAddCat, setShowAddCat] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [isAddingCat, setIsAddingCat] = useState(false)

  // Parsed spreadsheet data
  const [rawHeaders, setRawHeaders] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([])
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({})

  // Dry run preview
  const [dryRunResult, setDryRunResult] = useState<ImportPreviewResult | null>(null)
  const [isDryRunning, setIsDryRunning] = useState(false)
  const [dryRunError, setDryRunError] = useState<string | null>(null)

  // Step 3 progress
  const [importProgress, setImportProgress] = useState(0)
  const [isImporting, setIsImporting] = useState(false)
  const [importSummary, setImportSummary] = useState<{
    added: number
    skipped: number
    skippedArchivedCount?: number
    errors: { row: number; reason: string }[]
  } | null>(null)

  if (!isOpen) return null

  const handleReset = () => {
    setStep(1)
    setSelectedFile(null)
    setCategoryId(categories[0]?.id || '')
    setRawHeaders([])
    setRawRows([])
    setColumnMapping({})
    setDryRunResult(null)
    setIsDryRunning(false)
    setDryRunError(null)
    setImportProgress(0)
    setIsImporting(false)
    setImportSummary(null)
  }

  const handleQuickAddCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCatName.trim()) return
    try {
      setIsAddingCat(true)
      const newCat = await api.createCategory({ name: newCatName.trim() })
      await queryClient.invalidateQueries({ queryKey: ['categories'] })
      setCategoryId(newCat.id)
      setNewCatName('')
      setShowAddCat(false)
      success(`Category "${newCat.name}" added`)
    } catch (err: any) {
      toastError(err.message || 'Failed to create category')
    } finally {
      setIsAddingCat(false)
    }
  }

  // Handle file upload and parse in browser using SheetJS
  const handleFileChange = async (file: File) => {
    try {
      setSelectedFile(file)
      const arrayBuffer = await file.arrayBuffer()
      const wb = XLSX.read(arrayBuffer, { type: 'array' })
      const firstSheet = wb.SheetNames[0]
      if (!firstSheet) throw new Error('File has no sheets')

      const ws = wb.Sheets[firstSheet]
      if (!ws) throw new Error('Worksheet not found')
      const json: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: '' })
      if (json.length === 0) throw new Error('Spreadsheet contains no data rows')

      const headers = Object.keys(json[0] || {})
      setRawHeaders(headers)
      setRawRows(json)

      // Initial column mapping guess
      const initialMap: Record<string, string> = {}
      for (const h of headers) {
        const normalized = h.toLowerCase().trim().replace(/[\s-]+/g, '_')
        if (HEADER_TO_FIELD[normalized]) {
          initialMap[h] = HEADER_TO_FIELD[normalized]
        }
      }
      setColumnMapping(initialMap)
    } catch (err: any) {
      toastError(err.message || 'Error parsing file')
      setSelectedFile(null)
    }
  }

  // Map rows according to current columnMapping
  const getMappedRows = () => {
    return rawRows.map((raw) => {
      const mapped: Record<string, any> = {}
      for (const [header, field] of Object.entries(columnMapping)) {
        if (field && raw[header] !== undefined) {
          mapped[field] = raw[header]
        }
      }
      return mapped
    })
  }

  // Trigger Dry Run
  const runDryRun = async (mappedRows: Record<string, any>[]) => {
    if (!categoryId) {
      setDryRunError('Please select a Category')
      return
    }

    try {
      setIsDryRunning(true)
      setDryRunError(null)
      const result = await api.importDryRun({
        fileName: selectedFile?.name || 'import.xlsx',
        categoryId: Number(categoryId),
        rows: mappedRows,
      })
      setDryRunResult(result)
    } catch (err: any) {
      setDryRunError(err.message || 'Dry run validation failed')
    } finally {
      setIsDryRunning(false)
    }
  }

  // Move from Step 1 to Step 2
  const goToPreview = async () => {
    if (!selectedFile) {
      toastError('Please choose a file')
      return
    }
    if (!categoryId) {
      toastError('Please choose a category')
      return
    }

    setStep(2)
    const mapped = getMappedRows()
    await runDryRun(mapped)
  }

  // Execute chunked import (chunks of 500)
  const startImport = async () => {
    const mapped = getMappedRows()
    const CHUNK_SIZE = 500
    const totalRows = mapped.length
    const totalChunks = Math.ceil(totalRows / CHUNK_SIZE)

    setIsImporting(true)
    setStep(3)
    setImportProgress(5)

    let currentBatchId: number | null = null
    let totalAdded = 0
    let totalSkipped = 0
    let totalSkippedArchived = 0
    const allErrors: { row: number; reason: string }[] = []

    try {
      for (let i = 0; i < totalChunks; i++) {
        const chunk = mapped.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
        const res = await api.importChunk({
          fileName: selectedFile?.name || 'leads.xlsx',
          categoryId: Number(categoryId),
          batchId: currentBatchId,
          rows: chunk,
        })

        currentBatchId = res.batchId
        totalAdded += res.added
        totalSkipped += res.skipped
        totalSkippedArchived += res.skippedArchivedCount || 0
        if (res.errors) allErrors.push(...res.errors)

        const pct = Math.round(((i + 1) / totalChunks) * 100)
        setImportProgress(pct)
      }

      setImportSummary({
        added: totalAdded,
        skipped: totalSkipped,
        skippedArchivedCount: totalSkippedArchived,
        errors: allErrors,
      })
      await queryClient.invalidateQueries({ queryKey: ['leads'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      await queryClient.invalidateQueries({ queryKey: ['statuses'] })
      await queryClient.invalidateQueries({ queryKey: ['categories'] })
      success(`Imported ${totalAdded} leads successfully!`)
    } catch (err: any) {
      toastError(err.message || 'Import process encountered an error')
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-xl max-w-3xl w-full shadow-2xl my-8 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-900">Import Leads from Spreadsheet</h2>
            <p className="text-xs text-slate-500">
              Step {step} of 3: {step === 1 ? 'Choose File & Category' : step === 2 ? 'Column Mapping & Preview' : 'Import Progress'}
            </p>
          </div>
          <button
            onClick={() => {
              handleReset()
              onClose()
            }}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-3 border-b border-slate-100 bg-white flex items-center justify-between text-xs">
          <div className={`flex items-center gap-2 ${step === 1 ? 'text-blue-600 font-semibold' : 'text-slate-500'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 1 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>1</span>
            <span>Upload & Category</span>
          </div>
          <div className="h-0.5 w-8 bg-slate-200" />
          <div className={`flex items-center gap-2 ${step === 2 ? 'text-blue-600 font-semibold' : 'text-slate-500'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 2 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>2</span>
            <span>Mapping & Dry Run</span>
          </div>
          <div className="h-0.5 w-8 bg-slate-200" />
          <div className={`flex items-center gap-2 ${step === 3 ? 'text-blue-600 font-semibold' : 'text-slate-500'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 3 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>3</span>
            <span>Summary</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto max-h-[70vh]">
          {/* STEP 1: CHOOSE FILE & CATEGORY */}
          {step === 1 && (
            <div className="space-y-5">
              {/* File Dropzone */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">
                  Spreadsheet File (.xlsx, .csv)
                </label>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-500 bg-slate-50/50 transition-colors">
                  <FileSpreadsheet className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  {selectedFile ? (
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{selectedFile.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {rawRows.length} rows parsed
                      </p>
                      <label className="inline-block mt-3 px-3 py-1 bg-white border border-slate-300 rounded text-xs font-medium text-slate-700 cursor-pointer hover:bg-slate-50">
                        Choose different file
                        <input
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) handleFileChange(e.target.files[0])
                          }}
                        />
                      </label>
                    </div>
                  ) : (
                    <div>
                      <label className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium cursor-pointer inline-flex items-center gap-2 transition-colors shadow-xs">
                        <Upload className="w-4 h-4" />
                        <span>Select Excel or CSV File</span>
                        <input
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) handleFileChange(e.target.files[0])
                          }}
                        />
                      </label>
                      <p className="text-xs text-slate-400 mt-2">
                        Supports standard scraper format or Google Sheet exports
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Category Picker & Quick Add */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 uppercase">
                    Select Target Category *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddCat(!showAddCat)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Quick add new category</span>
                  </button>
                </div>

                {showAddCat && (
                  <form onSubmit={handleQuickAddCategory} className="mb-3 p-3 bg-blue-50/60 border border-blue-200 rounded-md flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Category name (e.g. Salons)"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-600"
                    />
                    <button
                      type="submit"
                      disabled={isAddingCat}
                      className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isAddingCat ? 'Adding...' : 'Add'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddCat(false)}
                      className="px-2 py-1.5 text-slate-500 hover:text-slate-700 text-xs"
                    >
                      Cancel
                    </button>
                  </form>
                )}

                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                >
                  <option value="">Choose a Category...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  All imported leads in this batch will be assigned to this category.
                </p>
              </div>

              {/* Sample File Download Link */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                <span className="text-slate-600">Need a reference format?</span>
                <a
                  href="/api/leads/sample.xlsx"
                  download="sample-leads.xlsx"
                  className="text-blue-600 font-semibold hover:text-blue-800 inline-flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download sample-leads.xlsx</span>
                </a>
              </div>
            </div>
          )}

          {/* STEP 2: COLUMN MAPPING & DRY RUN */}
          {step === 2 && (
            <div className="space-y-6">
              {/* Dry Run Summary Card */}
              {isDryRunning ? (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-center text-sm text-blue-700 animate-pulse">
                  Analyzing file rows and testing against existing database leads...
                </div>
              ) : dryRunError ? (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-sm text-rose-700">
                  <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
                  <span>{dryRunError}</span>
                </div>
              ) : dryRunResult ? (
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-center">
                    <p className="text-xs font-semibold text-emerald-700 uppercase">Will Add</p>
                    <p className="text-2xl font-bold text-emerald-900 mt-0.5">{dryRunResult.willAdd}</p>
                  </div>
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-center">
                    <p className="text-xs font-semibold text-amber-700 uppercase">Duplicates (Skip)</p>
                    <p className="text-2xl font-bold text-amber-900 mt-0.5">{dryRunResult.duplicates}</p>
                    {dryRunResult.skippedArchivedCount != null && dryRunResult.skippedArchivedCount > 0 && (
                      <p className="text-[11px] text-amber-700 font-medium mt-0.5">
                        ({dryRunResult.skippedArchivedCount} archived)
                      </p>
                    )}
                  </div>
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-center">
                    <p className="text-xs font-semibold text-rose-700 uppercase">Errors</p>
                    <p className="text-2xl font-bold text-rose-900 mt-0.5">{dryRunResult.errors.length}</p>
                  </div>
                </div>
              ) : null}

              {/* Errors List if any */}
              {dryRunResult && dryRunResult.errors.length > 0 && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 space-y-1 max-h-28 overflow-y-auto">
                  <p className="font-semibold">Row validation issues found:</p>
                  {dryRunResult.errors.slice(0, 5).map((e, idx) => (
                    <div key={idx}>
                      Row {e.row}: {e.reason}
                    </div>
                  ))}
                  {dryRunResult.errors.length > 5 && (
                    <p className="italic text-slate-500">
                      ...and {dryRunResult.errors.length - 5} more issues.
                    </p>
                  )}
                </div>
              )}

              {/* Column Mapping Adjuster */}
              <div>
                <h3 className="text-xs font-semibold text-slate-700 uppercase mb-2">
                  Header Matching ({rawHeaders.length} headers detected)
                </h3>
                <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-48 overflow-y-auto text-xs">
                  {rawHeaders.map((header) => {
                    const currentField = columnMapping[header] || ''
                    return (
                      <div key={header} className="p-2.5 flex items-center justify-between hover:bg-slate-50">
                        <span className="font-medium text-slate-800">{header}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">maps to</span>
                          <select
                            value={currentField}
                            onChange={(e) => {
                              const newMapping = { ...columnMapping, [header]: e.target.value }
                              setColumnMapping(newMapping)
                            }}
                            className="px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-800"
                          >
                            <option value="">(Ignore Column)</option>
                            {FIELD_OPTIONS.map((f) => (
                              <option key={f.key} value={f.key}>
                                {f.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => runDryRun(getMappedRows())}
                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                  >
                    Re-run validation preview
                  </button>
                </div>
              </div>

              {/* First 10 Rows Preview */}
              <div>
                <h3 className="text-xs font-semibold text-slate-700 uppercase mb-2">
                  Data Preview (First 10 rows)
                </h3>
                <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-44 text-xs">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        {rawHeaders.slice(0, 6).map((h) => (
                          <th key={h} className="px-3 py-2 text-left font-semibold text-slate-600">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {rawRows.slice(0, 10).map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          {rawHeaders.slice(0, 6).map((h) => (
                            <td key={h} className="px-3 py-1.5 text-slate-700 truncate max-w-[150px]">
                              {String(row[h] || '-')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: CHUNK IMPORT & SUMMARY */}
          {step === 3 && (
            <div className="space-y-6 py-4">
              {isImporting ? (
                <div className="text-center space-y-4">
                  <div className="w-12 h-12 rounded-full border-4 border-blue-600 border-t-transparent animate-spin mx-auto" />
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">Importing Leads...</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Writing records to database in chunks of 500
                    </p>
                  </div>
                  <div className="max-w-md mx-auto">
                    <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${importProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 font-mono mt-1.5">{importProgress}% completed</p>
                  </div>
                </div>
              ) : importSummary ? (
                <div className="text-center space-y-5">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Import Complete</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Batch processed successfully
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <p className="text-xs font-semibold text-emerald-700 uppercase">Added</p>
                      <p className="text-2xl font-bold text-emerald-900 mt-1">{importSummary.added}</p>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                      <p className="text-xs font-semibold text-slate-600 uppercase">Skipped</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">{importSummary.skipped}</p>
                      {importSummary.skippedArchivedCount != null && importSummary.skippedArchivedCount > 0 && (
                        <p className="text-[11px] text-amber-700 font-medium mt-0.5">
                          ({importSummary.skippedArchivedCount} archived)
                        </p>
                      )}
                    </div>
                    <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg">
                      <p className="text-xs font-semibold text-rose-700 uppercase">Errors</p>
                      <p className="text-2xl font-bold text-rose-900 mt-1">{importSummary.errors.length}</p>
                    </div>
                  </div>

                  {importSummary.errors.length > 0 && (
                    <div className="max-w-lg mx-auto text-left p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 max-h-32 overflow-y-auto">
                      <p className="font-semibold mb-1">Errors logged:</p>
                      {importSummary.errors.map((e, idx) => (
                        <div key={idx}>Row {e.row}: {e.reason}</div>
                      ))}
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      onClick={() => {
                        handleReset()
                        onSuccess()
                        onClose()
                      }}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-md transition-colors cursor-pointer shadow-xs"
                    >
                      View Leads
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        {step !== 3 && (
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            {step === 2 ? (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-md"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  handleReset()
                  onClose()
                }}
                className="px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-md"
              >
                Cancel
              </button>
            )}

            {step === 1 ? (
              <button
                type="button"
                onClick={goToPreview}
                disabled={!selectedFile || !categoryId}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-semibold disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <span>Next: Preview & Map</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={startImport}
                disabled={isDryRunning || !dryRunResult || dryRunResult.willAdd === 0}
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-semibold disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <span>Import {dryRunResult?.willAdd || 0} Leads</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
