import React, { useEffect } from 'react'
import { X, Keyboard, Phone, CheckCircle, ArrowRight, CornerDownLeft } from 'lucide-react'

export const ShortcutsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const shortcuts = [
    { key: '1', label: 'No answer', desc: 'Auto-schedules follow-up in 2 days' },
    { key: '2', label: 'Callback', desc: 'Auto-schedules follow-up for tomorrow 11 AM' },
    { key: '3', label: 'Interested', desc: 'Promotes lead status to Interested & confetti' },
    { key: '4', label: 'Not interested', desc: 'Moves status to Lost' },
    { key: '5', label: 'Wrong number', desc: 'Moves status to Lost' },
    { key: '6', label: 'Do not call', desc: 'Flags DND and marks Lost' },
    { key: 'Enter or Ctrl+Enter', label: 'Save & Next', desc: 'Saves current log & advances to next lead' },
    { key: 'Alt + N', label: 'Skip to Next', desc: 'Advances without logging a call' },
    { key: 'Alt + P', label: 'Previous Lead', desc: 'Navigates back to prior lead in queue' },
    { key: 'Alt + C', label: 'Tap to Call', desc: 'Triggers phone tel: dialer' },
    { key: 'Esc', label: 'Close Dialogs', desc: 'Dismiss active modal or drawer' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Call Queue Keyboard Shortcuts</h3>
              <p className="text-xs text-slate-400">Power-dialing without touching the mouse</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-3">
          <p className="text-xs text-slate-300 bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            💡 When focused in the Call Queue workstation, press the outcome keys <span className="text-amber-400 font-mono font-bold">1–6</span> to quickly select the call outcome, then press <span className="text-emerald-400 font-mono font-bold">Ctrl+Enter</span> to save and instantly advance!
          </p>

          <div className="divide-y divide-slate-800/80">
            {shortcuts.map((sc, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-200">{sc.label}</div>
                  <div className="text-xs text-slate-400">{sc.desc}</div>
                </div>
                <kbd className="px-2.5 py-1 text-xs font-mono font-bold text-indigo-300 bg-slate-800 border border-slate-700 rounded-lg shadow-inner">
                  {sc.key}
                </kbd>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
          >
            Got it, Let's Call
          </button>
        </div>
      </div>
    </div>
  )
}
