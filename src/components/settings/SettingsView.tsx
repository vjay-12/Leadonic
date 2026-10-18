import React, { useState } from 'react'
import {
  Settings,
  Sparkles,
  RotateCcw,
  Download,
  Upload,
  Trash2,
  Save,
  CheckCircle,
  AlertTriangle,
  Sliders,
  Database,
  FileSpreadsheet,
} from 'lucide-react'
import { useLeadonic } from '../../context/LeadonicContext'
import { ScoringRules } from '../../types'
import { settingsRepo } from '../../repos/settingsRepo'
import { DEFAULT_SCORING_RULES } from '../../lib/scoring'
import { downloadSampleExcel } from '../../lib/excel'

export const SettingsView: React.FC = () => {
  const { rules, refreshData, showToast, stats } = useLeadonic()

  const [formRules, setFormRules] = useState<ScoringRules>(rules)
  const [newCategory, setNewCategory] = useState<string>('')
  const [isExporting, setIsExporting] = useState<boolean>(false)

  // Save rules
  const handleSaveRules = async () => {
    try {
      await settingsRepo.saveScoringRules(formRules)
      showToast('Scoring rules saved & all lead scores recalculated!', 'success')
      await refreshData()
    } catch {
      showToast('Failed to save scoring rules', 'error')
    }
  }

  // Reset rules to default
  const handleResetDefaultRules = () => {
    setFormRules(DEFAULT_SCORING_RULES)
  }

  // Category chip management
  const handleAddCategory = () => {
    if (!newCategory.trim()) return
    if (!formRules.targetCategories.includes(newCategory.trim())) {
      setFormRules({
        ...formRules,
        targetCategories: [...formRules.targetCategories, newCategory.trim()],
      })
    }
    setNewCategory('')
  }

  const handleRemoveCategory = (cat: string) => {
    setFormRules({
      ...formRules,
      targetCategories: formRules.targetCategories.filter((c) => c !== cat),
    })
  }

  // Load Demo Data
  const handleLoadDemoData = async () => {
    if (!window.confirm('Reload 60 Bangalore demo leads? This will reset demo data.')) return
    try {
      await settingsRepo.seedDemoData()
      showToast('Loaded 60 realistic Bangalore demo leads!', 'success')
      await refreshData()
    } catch {
      showToast('Failed to load demo data', 'error')
    }
  }

  // Reset Database
  const handleWipeDatabase = async () => {
    if (
      !window.confirm(
        'Are you sure you want to completely clear all data? This deletes all leads, calls, and tasks from this browser.'
      )
    )
      return
    try {
      await settingsRepo.resetAll()
      showToast('All local data wiped cleanly', 'info')
      await refreshData()
    } catch {
      showToast('Failed to reset database', 'error')
    }
  }

  // Export JSON Backup
  const handleExportBackup = async () => {
    try {
      setIsExporting(true)
      const jsonStr = await settingsRepo.exportBackupJson()
      const blob = new Blob([jsonStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `leadonic_backup_${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      showToast('Backup JSON exported successfully!', 'success')
    } catch {
      showToast('Failed to export backup', 'error')
    } finally {
      setIsExporting(false)
    }
  }

  // Import JSON Backup
  const handleImportBackup = async (file: File) => {
    try {
      const text = await file.text()
      await settingsRepo.importBackupJson(text)
      showToast('Backup restored successfully!', 'success')
      await refreshData()
    } catch (err: any) {
      showToast('Invalid backup file: ' + err.message, 'error')
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-slate-400" />
            <span>Rules & Workspace Settings</span>
          </h1>
          <p className="text-xs text-slate-400">
            Customize lead scoring algorithms, manage browser IndexedDB storage, and export backups
          </p>
        </div>
      </div>

      {/* Section 1: Lead Scoring Engine Configuration */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <span>Configurable Lead Scoring Engine</span>
            </h2>
            <p className="text-xs text-slate-400">
              Rules determine priority in the Power Calling workstation
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetDefaultRules}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs border border-slate-700"
            >
              Reset Rules
            </button>
            <button
              onClick={handleSaveRules}
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-950"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save & Recalculate</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Rating rule */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
            <div className="font-semibold text-slate-200">Google Star Rating Threshold</div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Rating ≥</span>
              <input
                type="number"
                step="0.1"
                min="1"
                max="5"
                value={formRules.ratingThreshold}
                onChange={(e) =>
                  setFormRules({ ...formRules, ratingThreshold: parseFloat(e.target.value) || 4.0 })
                }
                className="w-16 bg-slate-900 border border-slate-700 rounded p-1.5 text-center text-white font-bold"
              />
              <span className="text-slate-400">gives:</span>
              <input
                type="number"
                value={formRules.ratingPoints}
                onChange={(e) =>
                  setFormRules({ ...formRules, ratingPoints: parseInt(e.target.value, 10) || 0 })
                }
                className="w-16 bg-slate-900 border border-slate-700 rounded p-1.5 text-center text-emerald-400 font-bold"
              />
              <span className="text-slate-400">pts</span>
            </div>
          </div>

          {/* Website rule */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
            <div className="font-semibold text-slate-200">Has Active Website</div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Presence of URL gives:</span>
              <input
                type="number"
                value={formRules.websitePoints}
                onChange={(e) =>
                  setFormRules({ ...formRules, websitePoints: parseInt(e.target.value, 10) || 0 })
                }
                className="w-16 bg-slate-900 border border-slate-700 rounded p-1.5 text-center text-emerald-400 font-bold"
              />
              <span className="text-slate-400">pts</span>
            </div>
          </div>

          {/* Previously interested */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
            <div className="font-semibold text-slate-200">Interested Pipeline Status</div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Status is 'Interested':</span>
              <input
                type="number"
                value={formRules.previouslyInterestedPoints}
                onChange={(e) =>
                  setFormRules({
                    ...formRules,
                    previouslyInterestedPoints: parseInt(e.target.value, 10) || 0,
                  })
                }
                className="w-16 bg-slate-900 border border-slate-700 rounded p-1.5 text-center text-emerald-400 font-bold"
              />
              <span className="text-slate-400">pts</span>
            </div>
          </div>

          {/* Repeated no-answers penalty */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
            <div className="font-semibold text-slate-200">No-Answer Attempt Penalty</div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">≥</span>
              <input
                type="number"
                min="1"
                value={formRules.noAnswerPenaltyThreshold}
                onChange={(e) =>
                  setFormRules({
                    ...formRules,
                    noAnswerPenaltyThreshold: parseInt(e.target.value, 10) || 3,
                  })
                }
                className="w-14 bg-slate-900 border border-slate-700 rounded p-1.5 text-center text-white font-bold"
              />
              <span className="text-slate-400">attempts applies:</span>
              <input
                type="number"
                value={formRules.noAnswerPenaltyPoints}
                onChange={(e) =>
                  setFormRules({
                    ...formRules,
                    noAnswerPenaltyPoints: parseInt(e.target.value, 10) || -2,
                  })
                }
                className="w-16 bg-slate-900 border border-slate-700 rounded p-1.5 text-center text-rose-400 font-bold"
              />
              <span className="text-slate-400">pts</span>
            </div>
          </div>

          {/* Target Categories */}
          <div className="sm:col-span-2 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-slate-200">
                Target Industries (+{formRules.categoryPoints} pts each)
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Industry bonus:</span>
                <input
                  type="number"
                  value={formRules.categoryPoints}
                  onChange={(e) =>
                    setFormRules({
                      ...formRules,
                      categoryPoints: parseInt(e.target.value, 10) || 2,
                    })
                  }
                  className="w-14 bg-slate-900 border border-slate-700 rounded p-1 text-center text-emerald-400 font-bold"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {formRules.targetCategories.map((cat) => (
                <span
                  key={cat}
                  className="px-2.5 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs flex items-center gap-1.5"
                >
                  <span>{cat}</span>
                  <button
                    onClick={() => handleRemoveCategory(cat)}
                    className="text-slate-400 hover:text-rose-400"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-1 max-w-sm">
              <input
                type="text"
                placeholder="Add custom target category..."
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white"
              />
              <button
                type="button"
                onClick={handleAddCategory}
                className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Demo Data & Testing Tools */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
        <div className="border-b border-slate-800 pb-3">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Demo Data & Testing Utilities</span>
          </h2>
          <p className="text-xs text-slate-400">
            Instant presets to test the end-to-end acceptance workflow
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
            <div className="text-xs font-semibold text-white">Load 60 Demo Bangalore Leads</div>
            <p className="text-[11px] text-slate-400">
              Populates realistic leads across Indiranagar, Koramangala, and HSR Layout with existing
              call logs, follow-ups, and scores.
            </p>
            <button
              onClick={handleLoadDemoData}
              className="mt-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Load 60 Leads</span>
            </button>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
            <div className="text-xs font-semibold text-white">Download Sample Excel Sheet</div>
            <p className="text-[11px] text-slate-400">
              Download the .xlsx file to test the 4-step import wizard, column auto-mapping, and duplicate detection.
            </p>
            <button
              onClick={downloadSampleExcel}
              className="mt-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-400" />
              <span>Download .xlsx Template</span>
            </button>
          </div>
        </div>
      </div>

      {/* Section 3: Backup & Database Management */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
        <div className="border-b border-slate-800 pb-3">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-sky-400" />
            <span>Browser IndexedDB Storage & JSON Backup</span>
          </h2>
          <p className="text-xs text-slate-400">
            Currently storing {stats.totalLeads} leads, {stats.callsToday} calls today, and tasks locally in IndexedDB.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          {/* Export JSON */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
            <div className="font-semibold text-white">Export Full JSON Backup</div>
            <p className="text-[11px] text-slate-400">
              Exports entire database snapshot to JSON file.
            </p>
            <button
              onClick={handleExportBackup}
              disabled={isExporting}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>
          </div>

          {/* Import JSON */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
            <div className="font-semibold text-white">Restore from JSON</div>
            <p className="text-[11px] text-slate-400">
              Upload a previously exported Leadonic JSON backup.
            </p>
            <label className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer border border-slate-700">
              <Upload className="w-3.5 h-3.5" />
              <span>Select File</span>
              <input
                type="file"
                accept=".json"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleImportBackup(f)
                }}
                className="hidden"
              />
            </label>
          </div>

          {/* Reset All */}
          <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-900/50 space-y-2">
            <div className="font-semibold text-rose-300">Wipe All Local Data</div>
            <p className="text-[11px] text-slate-400">
              Clears all leads, call logs, and tasks permanently.
            </p>
            <button
              onClick={handleWipeDatabase}
              className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Reset Database</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
