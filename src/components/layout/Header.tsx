import React, { useState } from 'react'
import {
  Menu,
  Keyboard,
  Download,
  RotateCcw,
  Sparkles,
  PhoneCall,
  Search,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useLeadonic } from '../../context/LeadonicContext'
import { downloadSampleExcel } from '../../lib/excel'
import { ShortcutsModal } from './ShortcutsModal'

export const Header: React.FC<{ onToggleSidebar: () => void }> = ({ onToggleSidebar }) => {
  const { stats, queueLeads, refreshData, showToast } = useLeadonic()
  const [showShortcuts, setShowShortcuts] = useState(false)
  const navigate = useNavigate()

  const handleDownloadSample = () => {
    downloadSampleExcel()
    showToast('Downloaded sample Bangalore leads Excel file!', 'info')
  }

  return (
    <>
      <header className="h-16 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden focus:outline-none"
            title="Toggle Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="hidden sm:flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-slate-300">Phase 1 Demo</span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-400">Indiranagar · Koramangala · HSR</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Download Sample File */}
          <button
            onClick={handleDownloadSample}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700/60 transition-all hover:text-white"
            title="Download test Excel with Bangalore leads"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Sample .xlsx</span>
          </button>

          {/* Keyboard shortcuts trigger */}
          <button
            onClick={() => setShowShortcuts(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-800 transition-all"
            title="View keyboard shortcuts (hotkeys)"
          >
            <Keyboard className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Shortcuts</span>
            <kbd className="hidden sm:inline px-1.5 py-0.5 text-[10px] bg-slate-800 text-slate-300 rounded border border-slate-700">
              ?
            </kbd>
          </button>

          {/* Call queue quick trigger */}
          <Link
            to="/queue"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-950 transition-all"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Call Queue</span>
            <span className="px-1.5 py-0.2 bg-emerald-700/80 rounded-full text-[11px]">
              {queueLeads.length}
            </span>
          </Link>
        </div>
      </header>

      {/* Shortcuts Modal */}
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
    </>
  )
}
