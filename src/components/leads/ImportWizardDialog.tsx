import React, { useState, useRef, useEffect, useMemo, useDeferredValue } from 'react'
import * as XLSX from 'xlsx'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import { LeadCategory, ImportRowCheckResult } from '../../types'
import { HEADER_TO_FIELD } from '../../../lib/normalize'
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  Plus,
  ChevronDown,
  ChevronRight,
  Search,
} from 'lucide-react'
import { Select, SelectOption } from '../common/Select'

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

  const categoryOptions: SelectOption<number | ''>[] = useMemo(
    () => [
      { value: '', label: 'Choose a Category...' },
      ...categories.map((c) => ({
        value: c.id,
        label: c.name,
      })),
    ],
    [categories]
  )

  const fieldSelectOptions: SelectOption<string>[] = useMemo(
    () => [
      { value: '', label: '(Not imported)' },
      ...FIELD_OPTIONS.map((f) => ({
        value: f.key,
        label: f.label,
      })),
    ],
    []
  )

  // Quick add category inline
  const [showAddCat, setShowAddCat] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [isAddingCat, setIsAddingCat] = useState(false)

  // Parsed spreadsheet data
  const [rawHeaders, setRawHeaders] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([])
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({})

  // Mapping collapsible section state
  const [isMappingOpen, setIsMappingOpen] = useState(false)

  // Dry run preview state
  const [rowCheckMap, setRowCheckMap] = useState<Map<number, ImportRowCheckResult>>(new Map())
  const [isDryRunning, setIsDryRunning] = useState(false)
  const [dryRunError, setDryRunError] = useState<string | null>(null)

  // Selection state: Set of original row indices
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())
  const [lastClickedFilteredIndex, setLastClickedFilteredIndex] = useState<number | null>(null)

  // Table filtering and search
  const [activeFilter, setActiveFilter] = useState<'all' | 'ready' | 'duplicates' | 'errors'>('all')
  const [selectedOnly, setSelectedOnly] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const deferredSearchQuery = useDeferredValue(searchQuery)

  // Step 3 progress & summary
  const [importProgress, setImportProgress] = useState(0)
  const [isImporting, setIsImporting] = useState(false)
  const [importSummary, setImportSummary] = useState<{
    added: number
    skipped: number
    skippedArchivedCount?: number
    notSelected: number
    errors: { row: number; reason: string }[]
  } | null>(null)

  // Table container ref for virtualization
  const tableContainerRef = useRef<HTMLDivElement>(null)
  const headerCheckboxRef = useRef<HTMLInputElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Auto-select first category if available
  useEffect(() => {
    if (categoryId === '' && categories.length > 0 && categories[0]?.id) {
      setCategoryId(categories[0].id)
    }
  }, [categories, categoryId])

  // Escape to close
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isImporting) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isImporting, onClose])

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [])

  const handleReset = () => {
    setStep(1)
    setSelectedFile(null)
    setCategoryId(categories[0]?.id || '')
    setRawHeaders([])
    setRawRows([])
    setColumnMapping({})
    setIsMappingOpen(false)
    setRowCheckMap(new Map())
    setIsDryRunning(false)
    setDryRunError(null)
    setSelectedIndices(new Set())
    setLastClickedFilteredIndex(null)
    setActiveFilter('all')
    setSelectedOnly(false)
    setSearchQuery('')
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

  // Map rows according to specified mapping
  const getMappedRows = (mapping: Record<string, string>) => {
    return rawRows.map((raw) => {
      const mapped: Record<string, any> = {}
      for (const [header, field] of Object.entries(mapping)) {
        if (field && raw[header] !== undefined) {
          mapped[field] = raw[header]
        }
      }
      return mapped
    })
  }

  // Trigger Dry Run
  const runDryRun = async (mapping: Record<string, string>) => {
    if (!categoryId) {
      setDryRunError('Please select a Category')
      return
    }

    try {
      setIsDryRunning(true)
      setDryRunError(null)
      const mappedRows = getMappedRows(mapping)
      const result = await api.importDryRun({
        fileName: selectedFile?.name || 'import.xlsx',
        categoryId: Number(categoryId),
        rows: mappedRows,
      })

      // Update rowCheckMap
      const newMap = new Map<number, ImportRowCheckResult>()
      result.rows.forEach((r) => newMap.set(r.index, r))

      // Update selectedIndices preserving previous user choices for rows whose check did not change
      setSelectedIndices((prev) => {
        const next = new Set<number>()
        result.rows.forEach((r) => {
          if (r.check === 'ready') {
            const prevCheck = rowCheckMap.get(r.index)
            if (prevCheck && prevCheck.check === 'ready') {
              if (prev.has(r.index)) {
                next.add(r.index)
              }
            } else {
              // Newly ready: default to selected
              next.add(r.index)
            }
          }
        })
        return next
      })

      setRowCheckMap(newMap)
    } catch (err: any) {
      setDryRunError(err.message || 'Dry run validation failed')
    } finally {
      setIsDryRunning(false)
    }
  }

  // Handle column mapping change with debounced 400ms auto validation
  const handleMappingChange = (header: string, field: string) => {
    const newMapping = { ...columnMapping, [header]: field }
    setColumnMapping(newMapping)

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    debounceTimerRef.current = setTimeout(() => {
      runDryRun(newMapping)
    }, 400)
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

    const isTitleMapped = Object.values(columnMapping).includes('title')
    setIsMappingOpen(!isTitleMapped)
    setStep(2)
    await runDryRun(columnMapping)
  }

  // Compute counts
  const matchedHeadersCount = useMemo(
    () => rawHeaders.filter((h) => Boolean(columnMapping[h])).length,
    [rawHeaders, columnMapping]
  )
  const notImportedHeadersCount = rawHeaders.length - matchedHeadersCount

  const readyIndices = useMemo(() => {
    const arr: number[] = []
    rowCheckMap.forEach((val, idx) => {
      if (val.check === 'ready') arr.push(idx)
    })
    return arr
  }, [rowCheckMap])

  const readyCount = readyIndices.length
  const duplicateCount = useMemo(() => {
    let count = 0
    rowCheckMap.forEach((val) => {
      if (val.check === 'duplicate' || val.check === 'duplicate_in_file') count++
    })
    return count
  }, [rowCheckMap])

  const errorCount = useMemo(() => {
    let count = 0
    rowCheckMap.forEach((val) => {
      if (val.check === 'error') count++
    })
    return count
  }, [rowCheckMap])

  const selectedCount = selectedIndices.size

  // Find header mapped to title for sticky title display
  const titleHeader = useMemo(
    () => Object.keys(columnMapping).find((h) => columnMapping[h] === 'title'),
    [columnMapping]
  )

  // Filtered rows for virtualization
  const filteredRows = useMemo(() => {
    const query = deferredSearchQuery.trim().toLowerCase()

    return rawRows
      .map((row, originalIndex) => {
        const checkResult = rowCheckMap.get(originalIndex)
        return {
          row,
          originalIndex,
          checkResult,
        }
      })
      .filter(({ row, originalIndex, checkResult }) => {
        // Filter by check status
        if (activeFilter === 'ready' && checkResult?.check !== 'ready') return false
        if (
          activeFilter === 'duplicates' &&
          checkResult?.check !== 'duplicate' &&
          checkResult?.check !== 'duplicate_in_file'
        ) {
          return false
        }
        if (activeFilter === 'errors' && checkResult?.check !== 'error') return false

        // Filter by selected only
        if (selectedOnly && !selectedIndices.has(originalIndex)) return false

        // Filter by search query
        if (query) {
          const titleVal = titleHeader ? row[titleHeader] : row['title'] || row['name']
          const matchTitle = String(titleVal || '').toLowerCase().includes(query)
          if (matchTitle) return true

          const hasCellMatch = Object.values(row).some((val) =>
            String(val || '').toLowerCase().includes(query)
          )
          if (!hasCellMatch) return false
        }

        return true
      })
  }, [rawRows, rowCheckMap, activeFilter, selectedOnly, deferredSearchQuery, titleHeader, selectedIndices])

  // Virtualizer for the table rows
  const rowVirtualizer = useVirtualizer({
    count: filteredRows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 52,
    overscan: 12,
  })

  // Select all / none checkbox handling with indeterminate state
  const isAllReadySelected = readyCount > 0 && readyIndices.every((idx) => selectedIndices.has(idx))
  const hasSomeSelected = selectedIndices.size > 0

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = hasSomeSelected && !isAllReadySelected
    }
  }, [hasSomeSelected, isAllReadySelected])

  const handleHeaderCheckboxToggle = () => {
    if (isAllReadySelected) {
      // Deselect all
      setSelectedIndices(new Set())
    } else {
      // Select all ready rows
      const next = new Set<number>()
      readyIndices.forEach((idx) => next.add(idx))
      setSelectedIndices(next)
    }
  }

  const handleSelectAllReady = () => {
    const next = new Set<number>()
    readyIndices.forEach((idx) => next.add(idx))
    setSelectedIndices(next)
  }

  const handleClearSelection = () => {
    setSelectedIndices(new Set())
  }

  // Row selection with Shift-Click range selection
  const handleRowCheckboxClick = (
    e: React.MouseEvent<HTMLInputElement>,
    targetOriginalIndex: number,
    filteredRowIndex: number
  ) => {
    const rowCheck = rowCheckMap.get(targetOriginalIndex)
    if (rowCheck?.check !== 'ready') return

    const isShift = e.shiftKey
    const currentlySelected = selectedIndices.has(targetOriginalIndex)
    const nextChecked = !currentlySelected

    if (isShift && lastClickedFilteredIndex !== null) {
      const start = Math.min(lastClickedFilteredIndex, filteredRowIndex)
      const end = Math.max(lastClickedFilteredIndex, filteredRowIndex)
      const nextSet = new Set(selectedIndices)

      for (let i = start; i <= end; i++) {
        const item = filteredRows[i]
        if (item) {
          const itemCheck = rowCheckMap.get(item.originalIndex)
          if (itemCheck?.check === 'ready') {
            if (nextChecked) {
              nextSet.add(item.originalIndex)
            } else {
              nextSet.delete(item.originalIndex)
            }
          }
        }
      }
      setSelectedIndices(nextSet)
    } else {
      const nextSet = new Set(selectedIndices)
      if (nextChecked) {
        nextSet.add(targetOriginalIndex)
      } else {
        nextSet.delete(targetOriginalIndex)
      }
      setSelectedIndices(nextSet)
    }

    setLastClickedFilteredIndex(filteredRowIndex)
  }

  // Execute chunked import sending ONLY selected rows in chunks of 500
  const startImport = async () => {
    if (selectedIndices.size === 0) return

    const allMapped = getMappedRows(columnMapping)
    const selectedMappedRows = allMapped.filter((_, idx) => selectedIndices.has(idx))
    const notSelectedCount = rawRows.length - selectedMappedRows.length

    const CHUNK_SIZE = 500
    const totalRows = selectedMappedRows.length
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
        const chunk = selectedMappedRows.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
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
        notSelected: notSelectedCount,
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

  const virtualRows = rowVirtualizer.getVirtualItems()
  const totalVirtualSize = rowVirtualizer.getTotalSize()
  const paddingTop = virtualRows.length > 0 ? virtualRows[0]?.start || 0 : 0
  const paddingBottom =
    virtualRows.length > 0
      ? totalVirtualSize - (virtualRows[virtualRows.length - 1]?.end || 0)
      : 0

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center sm:p-4 overflow-hidden">
      <div className="bg-white border border-slate-200 sm:rounded-[10px] w-full sm:w-[min(1200px,96vw)] h-full sm:h-[90vh] shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div>
            <h2 className="text-[15px] font-bold text-slate-900">Import Leads from Spreadsheet</h2>
            <p className="text-[12px] text-slate-500">
              Step {step} of 3:{' '}
              {step === 1
                ? 'Choose File & Category'
                : step === 2
                ? 'Column Mapping & Preview'
                : 'Summary'}
            </p>
          </div>
          <button
            onClick={() => {
              handleReset()
              onClose()
            }}
            disabled={isImporting}
            className="w-7 h-7 inline-flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 cursor-pointer disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-4 py-2 border-b border-slate-100 bg-white flex items-center justify-between text-[12px] shrink-0">
          <div className={`flex items-center gap-1.5 ${step === 1 ? 'text-blue-600 font-semibold' : 'text-slate-500'}`}>
            <span
              className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                step === 1 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              1
            </span>
            <span>Upload & Category</span>
          </div>
          <div className="h-0.5 w-6 bg-slate-200" />
          <div className={`flex items-center gap-1.5 ${step === 2 ? 'text-blue-600 font-semibold' : 'text-slate-500'}`}>
            <span
              className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                step === 2 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              2
            </span>
            <span>Mapping & Dry Run</span>
          </div>
          <div className="h-0.5 w-6 bg-slate-200" />
          <div className={`flex items-center gap-1.5 ${step === 3 ? 'text-blue-600 font-semibold' : 'text-slate-500'}`}>
            <span
              className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                step === 3 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              3
            </span>
            <span>Summary</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* STEP 1: CHOOSE FILE & CATEGORY */}
          {step === 1 && (
            <div className="p-4 space-y-4 flex-1 overflow-y-auto">
              {/* File Dropzone */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1.5">
                  Spreadsheet File (.xlsx, .csv)
                </label>
                <div className="border-2 border-dashed border-slate-300 rounded-[10px] p-5 text-center hover:border-blue-500 bg-slate-50/50 transition-colors">
                  <FileSpreadsheet className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  {selectedFile ? (
                    <div>
                      <p className="text-[13px] font-semibold text-slate-900">{selectedFile.name}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{rawRows.length} rows parsed</p>
                      <label className="inline-block mt-2.5 h-7 px-3 leading-7 bg-white border border-slate-300 rounded-lg text-[12px] font-medium text-slate-700 cursor-pointer hover:bg-slate-50">
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
                      <label className="h-8 px-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[13px] font-medium cursor-pointer inline-flex items-center gap-1.5 transition-colors shadow-xs">
                        <Upload className="w-3.5 h-3.5" />
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
                      <p className="text-[11px] text-slate-400 mt-1.5">
                        Supports standard scraper format or Google Sheet exports
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Category Picker & Quick Add */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-700 uppercase">
                    Select Target Category *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddCat(!showAddCat)}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Quick add new category</span>
                  </button>
                </div>

                {showAddCat && (
                  <form
                    onSubmit={handleQuickAddCategory}
                    className="mb-2.5 p-2.5 bg-blue-50/60 border border-blue-200 rounded-lg flex items-center gap-2"
                  >
                    <input
                      type="text"
                      placeholder="Category name (e.g. Salons)"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      className="flex-1 h-8 px-2.5 text-[12px] bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600"
                    />
                    <button
                      type="submit"
                      disabled={isAddingCat}
                      className="h-8 px-3 bg-blue-600 text-white text-[12px] font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                    >
                      {isAddingCat ? 'Adding...' : 'Add'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddCat(false)}
                      className="h-8 px-2 text-slate-500 hover:text-slate-700 text-[12px] cursor-pointer"
                    >
                      Cancel
                    </button>
                  </form>
                )}

                <Select
                  value={categoryId}
                  onChange={(val) => setCategoryId(val)}
                  options={categoryOptions}
                  width="w-full"
                  placeholder="Choose a Category..."
                  ariaLabel="Category"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  All imported leads in this batch will be assigned to this category.
                </p>
              </div>

              {/* Sample File Download Link */}
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-[10px] flex items-center justify-between text-[12px]">
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
            <div className="p-3.5 flex-1 flex flex-col min-h-0 space-y-2.5 overflow-hidden">
              {/* Collapsible Mapping Section */}
              <div className="border border-slate-200 rounded-[10px] bg-white overflow-hidden shrink-0">
                <button
                  type="button"
                  onClick={() => setIsMappingOpen(!isMappingOpen)}
                  className="w-full px-3.5 py-2.5 flex items-center justify-between bg-slate-50/80 hover:bg-slate-100/70 transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2">
                    {isMappingOpen ? (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    )}
                    <span className="text-[13px] font-semibold text-slate-900">
                      Header matching ({rawHeaders.length} headers detected)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-medium text-slate-500">
                      <span className="text-blue-600 font-semibold">{matchedHeadersCount} matched</span>,{' '}
                      <span>{notImportedHeadersCount} not imported</span>
                    </span>
                  </div>
                </button>

                {isMappingOpen && (
                  <div className="p-3 border-t border-slate-100 max-h-56 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {rawHeaders.map((header) => {
                        const currentField = columnMapping[header] || ''
                        return (
                          <div
                            key={header}
                            className="p-2 bg-slate-50 border border-slate-200/80 rounded-lg flex items-center justify-between gap-2 text-[12px]"
                          >
                            <span className="font-semibold text-slate-800 truncate" title={header}>
                              {header}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[11px] text-slate-400">maps to</span>
                              <Select
                                value={currentField}
                                onChange={(val) => handleMappingChange(header, val)}
                                options={fieldSelectOptions}
                                width={180}
                                ariaLabel={`Map ${header}`}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Compact Stat Strip & Filter Toolbar */}
              <div className="space-y-2 shrink-0">
                {/* Stat Strip */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] px-1">
                  <div className="flex items-center gap-3">
                    <div className="text-slate-700 font-medium">
                      Selected:{' '}
                      <span className="font-bold text-slate-900">{selectedCount}</span> of{' '}
                      <span className="font-semibold text-emerald-700">{readyCount} ready</span>{' '}
                      <span className="text-slate-400">({rawRows.length} total)</span>
                    </div>
                    <div className="h-3 w-px bg-slate-200" />
                    <div className="text-amber-700 font-medium">
                      Duplicates: <span className="font-bold">{duplicateCount}</span>
                    </div>
                    <div className="h-3 w-px bg-slate-200" />
                    <div className="text-rose-700 font-medium">
                      Errors: <span className="font-bold">{errorCount}</span>
                    </div>
                    {isDryRunning && (
                      <span className="text-[11px] text-blue-600 font-medium animate-pulse">
                        Validating...
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllReady}
                      className="text-[12px] font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                    >
                      Select all ready
                    </button>
                    <span className="text-slate-300">·</span>
                    <button
                      type="button"
                      onClick={handleClearSelection}
                      className="text-[12px] font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
                    >
                      Clear selection
                    </button>
                  </div>
                </div>

                {/* Filter Chips & Search Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 p-2 rounded-[10px] border border-slate-200">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(['all', 'ready', 'duplicates', 'errors'] as const).map((filter) => {
                      const count =
                        filter === 'all'
                          ? rawRows.length
                          : filter === 'ready'
                          ? readyCount
                          : filter === 'duplicates'
                          ? duplicateCount
                          : errorCount

                      const label =
                        filter === 'all'
                          ? `All (${count})`
                          : filter === 'ready'
                          ? `Ready (${count})`
                          : filter === 'duplicates'
                          ? `Duplicates (${count})`
                          : `Errors (${count})`

                      const isActive = activeFilter === filter
                      return (
                        <button
                          key={filter}
                          type="button"
                          onClick={() => setActiveFilter(filter)}
                          className={`h-7 px-2.5 rounded-md text-[12px] font-medium transition-colors cursor-pointer ${
                            isActive
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                          }`}
                        >
                          {label}
                        </button>
                      )
                    })}

                    <label className="inline-flex items-center gap-1.5 ml-2 cursor-pointer text-[12px] text-slate-700 font-medium select-none">
                      <input
                        type="checkbox"
                        checked={selectedOnly}
                        onChange={(e) => setSelectedOnly(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 cursor-pointer"
                      />
                      <span>Selected only ({selectedCount})</span>
                    </label>
                  </div>

                  {/* Search Box */}
                  <div className="relative w-full sm:w-60">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search rows..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full h-8 pl-8 pr-7 text-[12px] bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 text-slate-900 placeholder:text-slate-400"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {dryRunError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-[10px] flex items-center gap-2 text-[12px] text-rose-700 shrink-0">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{dryRunError}</span>
                </div>
              )}

              {/* Table Container: Virtualized with Sticky Checkbox, #, Check, and Title */}
              <div
                ref={tableContainerRef}
                className="flex-1 min-h-0 overflow-auto border border-slate-200 rounded-[10px] bg-white relative shadow-2xs"
              >
                <table className="w-max min-w-full text-left text-[12.5px] border-collapse">
                  <thead className="sticky top-0 bg-slate-50 z-20 border-b border-slate-200 text-[11px] text-slate-600 font-semibold uppercase tracking-wider">
                    <tr className="h-9">
                      {/* 1. Checkbox Column (Sticky left 0) */}
                      <th className="sticky left-0 bg-slate-50 z-30 w-9 min-w-[36px] max-w-[36px] text-center px-1.5 border-r border-slate-200/60">
                        <input
                          ref={headerCheckboxRef}
                          type="checkbox"
                          checked={isAllReadySelected}
                          onChange={handleHeaderCheckboxToggle}
                          disabled={readyCount === 0}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 cursor-pointer disabled:opacity-40"
                          title={isAllReadySelected ? 'Deselect all' : 'Select all ready'}
                        />
                      </th>

                      {/* 2. Row # Column (Sticky left 36px) */}
                      <th className="sticky left-[36px] bg-slate-50 z-30 w-12 min-w-[48px] max-w-[48px] text-center px-1.5 border-r border-slate-200/60">
                        #
                      </th>

                      {/* 3. Check Badge Column (Sticky left 84px) */}
                      <th className="sticky left-[84px] bg-slate-50 z-30 w-[140px] min-w-[140px] px-2.5 border-r border-slate-200/60">
                        Check
                      </th>

                      {/* 4. Title Column (Sticky left 224px) */}
                      <th className="sticky left-[224px] bg-slate-50 z-30 w-52 min-w-[208px] px-3 border-r border-slate-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                        <div>Title</div>
                        <div className="text-[10px] text-blue-600 font-semibold normal-case">→ Required</div>
                      </th>

                      {/* 5. All File Headers */}
                      {rawHeaders.map((header) => {
                        const mappedField = columnMapping[header]
                        const fieldDef = FIELD_OPTIONS.find((f) => f.key === mappedField)
                        return (
                          <th
                            key={header}
                            className="min-w-[150px] max-w-[260px] px-3 py-1.5 text-left font-semibold text-slate-700 border-r border-slate-100 last:border-r-0"
                          >
                            <div className="truncate" title={header}>
                              {header}
                            </div>
                            {mappedField ? (
                              <div className="text-[10px] text-blue-600 font-semibold normal-case truncate">
                                → {fieldDef?.label.replace(' (Required)', '') || mappedField}
                              </div>
                            ) : (
                              <span className="inline-block text-[9.5px] font-normal normal-case text-slate-400 bg-slate-100 px-1 py-0.5 rounded">
                                not imported
                              </span>
                            )}
                          </th>
                        )
                      })}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 bg-white">
                    {paddingTop > 0 && (
                      <tr>
                        <td style={{ height: `${paddingTop}px` }} colSpan={rawHeaders.length + 4} />
                      </tr>
                    )}

                    {filteredRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={rawHeaders.length + 4}
                          className="p-8 text-center text-slate-400 text-[13px]"
                        >
                          No matching rows found.
                        </td>
                      </tr>
                    ) : (
                      virtualRows.map((virtualRow) => {
                        const item = filteredRows[virtualRow.index]
                        if (!item) return null

                        const { row, originalIndex, checkResult } = item
                        const isSelected = selectedIndices.has(originalIndex)
                        const isReady = checkResult?.check === 'ready'
                        const titleVal = titleHeader
                          ? row[titleHeader]
                          : row['title'] || row['name'] || '—'

                        return (
                          <tr
                            key={originalIndex}
                            className={`group min-h-[52px] transition-colors ${
                              isSelected
                                ? 'bg-blue-50/40 hover:bg-blue-50/70'
                                : 'hover:bg-slate-50/80'
                            }`}
                          >
                            {/* 1. Checkbox */}
                            <td className="sticky left-0 bg-white group-hover:bg-slate-50 z-10 w-9 min-w-[36px] max-w-[36px] text-center px-1.5 py-2 border-r border-slate-200/60 align-top">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                disabled={!isReady}
                                onClick={(e) => handleRowCheckboxClick(e, originalIndex, virtualRow.index)}
                                onChange={() => {}} // Controlled by onClick to support Shift-click
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                              />
                            </td>

                            {/* 2. Row # */}
                            <td className="sticky left-[36px] bg-white group-hover:bg-slate-50 z-10 w-12 min-w-[48px] max-w-[48px] text-center px-1.5 py-2 text-slate-400 font-mono text-[11px] border-r border-slate-200/60 align-top">
                              {originalIndex + 1}
                            </td>

                            {/* 3. Check Badge */}
                            <td className="sticky left-[84px] bg-white group-hover:bg-slate-50 z-10 w-[140px] min-w-[140px] px-2.5 py-2 border-r border-slate-200/60 align-top">
                              {isDryRunning ? (
                                <span className="text-[11px] text-slate-400 animate-pulse">Checking...</span>
                              ) : checkResult?.check === 'ready' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                  <span>Ready</span>
                                </span>
                              ) : checkResult?.check === 'duplicate' ? (
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap cursor-help"
                                  title={checkResult.reason || 'Matches existing lead in database'}
                                >
                                  <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                                  <span>Duplicate</span>
                                </span>
                              ) : checkResult?.check === 'duplicate_in_file' ? (
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap cursor-help"
                                  title={checkResult.reason || 'Duplicate row within this file'}
                                >
                                  <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                                  <span>Duplicate in file</span>
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap cursor-help"
                                  title={checkResult?.reason || 'Validation error'}
                                >
                                  <XCircle className="w-3 h-3 text-rose-600 shrink-0" />
                                  <span>Error</span>
                                </span>
                              )}
                            </td>

                            {/* 4. Title (Sticky left 224px) */}
                            <td className="sticky left-[224px] bg-white group-hover:bg-slate-50 z-10 w-52 min-w-[208px] px-3 py-2 border-r border-slate-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] align-top font-semibold text-slate-900">
                              <div
                                className="line-clamp-2 leading-snug break-words text-[12.5px]"
                                title={String(titleVal || '')}
                              >
                                {titleVal || <span className="text-slate-400 font-normal italic">—</span>}
                              </div>
                            </td>

                            {/* 5. Original File Columns */}
                            {rawHeaders.map((header) => {
                              const isMapped = Boolean(columnMapping[header])
                              const val = row[header]
                              const text = val != null ? String(val).trim() : ''

                              return (
                                <td
                                  key={header}
                                  className={`min-w-[150px] max-w-[260px] px-3 py-2 border-r border-slate-100 last:border-r-0 align-top ${
                                    isMapped ? 'text-slate-800' : 'text-slate-400'
                                  }`}
                                >
                                  <div
                                    className="line-clamp-3 leading-snug break-words text-[12px]"
                                    title={text}
                                  >
                                    {text || <span className="text-slate-300 font-normal">—</span>}
                                  </div>
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })
                    )}

                    {paddingBottom > 0 && (
                      <tr>
                        <td style={{ height: `${paddingBottom}px` }} colSpan={rawHeaders.length + 4} />
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 3: CHUNK IMPORT & SUMMARY */}
          {step === 3 && (
            <div className="space-y-4 py-8 px-4 flex-1 overflow-y-auto flex flex-col justify-center">
              {isImporting ? (
                <div className="text-center space-y-3">
                  <div className="w-10 h-10 rounded-full border-3 border-blue-600 border-t-transparent animate-spin mx-auto" />
                  <div>
                    <h3 className="text-[15px] font-semibold text-slate-900">Importing Selected Leads...</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Writing records to database in chunks of 500
                    </p>
                  </div>
                  <div className="max-w-md mx-auto">
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${importProgress}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 font-mono mt-1">{importProgress}% completed</p>
                  </div>
                </div>
              ) : importSummary ? (
                <div className="text-center space-y-4">
                  <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-[16px] font-bold text-slate-900">Import Complete</h3>
                    <p className="text-[12px] text-slate-500 mt-0.5">Batch processed successfully</p>
                  </div>

                  <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto">
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-[10px]">
                      <p className="text-[11px] font-semibold text-emerald-700 uppercase">Added</p>
                      <p className="text-[20px] font-bold text-emerald-900 mt-0.5">{importSummary.added}</p>
                    </div>
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-[10px]">
                      <p className="text-[11px] font-semibold text-amber-700 uppercase">
                        Skipped as duplicates
                      </p>
                      <p className="text-[20px] font-bold text-amber-900 mt-0.5">{importSummary.skipped}</p>
                      {importSummary.skippedArchivedCount != null &&
                        importSummary.skippedArchivedCount > 0 && (
                          <p className="text-[10px] text-amber-700 font-medium mt-0.5">
                            ({importSummary.skippedArchivedCount} archived)
                          </p>
                        )}
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-[10px]">
                      <p className="text-[11px] font-semibold text-slate-600 uppercase">Not selected</p>
                      <p className="text-[20px] font-bold text-slate-900 mt-0.5">
                        {importSummary.notSelected}
                      </p>
                    </div>
                  </div>

                  {importSummary.errors.length > 0 && (
                    <div className="max-w-lg mx-auto text-left p-2.5 bg-rose-50 border border-rose-200 rounded-[10px] text-[11px] text-rose-800 max-h-28 overflow-y-auto">
                      <p className="font-semibold mb-1">Errors logged:</p>
                      {importSummary.errors.map((e, idx) => (
                        <div key={idx}>
                          Row {e.row}: {e.reason}
                        </div>
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
                      className="h-8 px-5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-[13px] rounded-lg transition-colors cursor-pointer shadow-xs"
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
          <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
            {step === 2 ? (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1.5 h-8 px-3 text-[13px] font-medium text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  handleReset()
                  onClose()
                }}
                className="h-8 px-3 text-[13px] font-medium text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
            )}

            {step === 1 ? (
              <button
                type="button"
                onClick={goToPreview}
                disabled={!selectedFile || !categoryId}
                className="inline-flex items-center gap-1.5 h-8 px-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[13px] font-medium disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <span>Next: Preview & Map</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={startImport}
                disabled={isDryRunning || selectedIndices.size === 0}
                className="inline-flex items-center gap-1.5 h-8 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[13px] font-semibold disabled:opacity-50 cursor-pointer shadow-xs transition-colors"
              >
                <span>
                  {selectedIndices.size === 1
                    ? 'Import 1 Lead'
                    : `Import ${selectedIndices.size} Leads`}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
