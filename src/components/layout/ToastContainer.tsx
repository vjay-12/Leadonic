import React from 'react'
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react'
import { useLeadonic } from '../../context/LeadonicContext'

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useLeadonic()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        let icon = <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
        let borderClass = 'border-emerald-500/30'
        let bgClass = 'bg-slate-900/95'

        if (toast.type === 'error') {
          icon = <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          borderClass = 'border-rose-500/30'
        } else if (toast.type === 'warning') {
          icon = <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          borderClass = 'border-amber-500/30'
        } else if (toast.type === 'info') {
          icon = <Info className="w-5 h-5 text-sky-400 shrink-0" />
          borderClass = 'border-sky-500/30'
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border ${borderClass} ${bgClass} shadow-xl shadow-black/40 backdrop-blur-md text-sm text-slate-100 transition-all animate-in slide-in-from-bottom-2 duration-200`}
          >
            {icon}
            <div className="flex-1 text-xs leading-relaxed font-medium">{toast.message}</div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="text-slate-400 hover:text-white p-0.5 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
