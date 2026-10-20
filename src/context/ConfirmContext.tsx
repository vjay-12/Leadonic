import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { AlertCircle, Archive } from 'lucide-react'

export interface ConfirmOptions {
  title: string
  message: React.ReactNode
  confirmText?: string
  cancelText?: string
  isDestructive?: boolean
  icon?: 'alert' | 'archive' | 'info'
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined)

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean
    options: ConfirmOptions
    resolve: (value: boolean) => void
  } | null>(null)

  const cancelRef = useRef<HTMLButtonElement | null>(null)
  const confirmRef = useRef<HTMLButtonElement | null>(null)

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setDialogState({
        isOpen: true,
        options,
        resolve,
      })
    })
  }, [])

  const handleClose = (result: boolean) => {
    if (dialogState) {
      dialogState.resolve(result)
      setDialogState(null)
    }
  }

  // Focus management, Escape key, and focus trap
  useEffect(() => {
    if (!dialogState?.isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose(false)
        return
      }
      if (e.key === 'Tab') {
        const cancelBtn = cancelRef.current
        const confirmBtn = confirmRef.current
        if (!cancelBtn || !confirmBtn) return

        if (e.shiftKey) {
          if (document.activeElement === cancelBtn) {
            e.preventDefault()
            confirmBtn.focus()
          }
        } else {
          if (document.activeElement === confirmBtn) {
            e.preventDefault()
            cancelBtn.focus()
          }
        }
      }
    }

    // Set initial focus: Cancel button for destructive, Confirm button otherwise
    const timer = setTimeout(() => {
      if (dialogState.options.isDestructive) {
        cancelRef.current?.focus()
      } else {
        confirmRef.current?.focus()
      }
    }, 50)

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [dialogState])

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {dialogState?.isOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => handleClose(false)}
        >
          <div
            className="bg-white border border-slate-200 rounded-[10px] max-w-md w-full p-5 shadow-xl space-y-3.5"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  dialogState.options.isDestructive
                    ? 'bg-rose-100 text-rose-700'
                    : dialogState.options.icon === 'archive'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                {dialogState.options.icon === 'archive' ? (
                  <Archive className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 id="confirm-dialog-title" className="text-[15px] font-bold text-slate-900 truncate">
                  {dialogState.options.title}
                </h3>
              </div>
            </div>

            <div className="text-[12px] text-slate-600 leading-relaxed">
              {dialogState.options.message}
            </div>

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
              <button
                ref={cancelRef}
                type="button"
                onClick={() => handleClose(false)}
                className="px-3.5 h-8 text-[12px] font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
              >
                {dialogState.options.cancelText || 'Cancel'}
              </button>
              <button
                ref={confirmRef}
                type="button"
                onClick={() => handleClose(true)}
                className={`px-3.5 h-8 text-[12px] font-semibold text-white rounded-lg cursor-pointer transition-colors shadow-xs ${
                  dialogState.options.isDestructive
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : dialogState.options.icon === 'archive'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {dialogState.options.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider')
  return ctx.confirm
}
