import React, { useState, useRef, useEffect, useCallback, useId } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check } from 'lucide-react'

export interface SelectOption<T = string | number> {
  value: T
  label: string
  color?: string
  icon?: React.ReactNode
  disabled?: boolean
}

export interface SelectProps<T = string | number> {
  value: T | null | undefined
  onChange: (value: T) => void
  options: SelectOption<T>[]
  placeholder?: string
  disabled?: boolean
  className?: string
  width?: string | number // Explicit width, e.g. 180, '180px', 'w-full'
  fitToOptions?: boolean // If true, calculates width based on longest label (110px-200px)
  prefixIcon?: React.ReactNode
  ariaLabel?: string
  id?: string
}

export function Select<T extends string | number = string | number>({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  disabled = false,
  className = '',
  width,
  fitToOptions = false,
  prefixIcon,
  ariaLabel,
  id,
}: SelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1)
  const [popoverCoords, setPopoverCoords] = useState<{ top?: number; bottom?: number; left: number; width: number }>({
    left: 0,
    width: 0,
  })

  const generatedId = useId()
  const selectId = id || generatedId
  const listboxId = `${selectId}-listbox`

  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const popoverRef = useRef<HTMLDivElement | null>(null)
  const searchTimeoutRef = useRef<any>(null)
  const searchStringRef = useRef('')

  const selectedIndex = options.findIndex((opt) => opt.value === value)
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : null

  // Compute trigger width
  let computedWidthStyle: React.CSSProperties = {}
  let computedWidthClass = ''

  if (typeof width === 'number') {
    computedWidthStyle.width = `${width}px`
  } else if (typeof width === 'string') {
    if (width.startsWith('w-')) {
      computedWidthClass = width
    } else {
      computedWidthStyle.width = width
    }
  } else if (fitToOptions && options.length > 0) {
    // Calculate width based on longest label
    const maxChars = Math.max(...options.map((o) => (o.label || '').length))
    // ~7.5px per char + 20px padding + 16px chevron + 16px icons/dots + 12px margin
    const hasColorOrIcon = options.some((o) => o.color || o.icon) || Boolean(prefixIcon)
    const basePadding = hasColorOrIcon ? 56 : 42
    const calculatedWidth = Math.round(maxChars * 7.5) + basePadding
    const clampedWidth = Math.max(110, Math.min(200, calculatedWidth))
    computedWidthStyle.width = `${clampedWidth}px`
  }

  // Position calculation for popover
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const viewportHeight = window.innerHeight
    const viewportWidth = window.innerWidth

    const maxOptionLen = options.length > 0 ? Math.max(...options.map((o) => (o.label || '').length)) : 0
    const estimatedOptionWidth = Math.round(maxOptionLen * 7.5) + 48
    let popoverWidth = Math.min(280, Math.max(rect.width, estimatedOptionWidth, 140))
    if (popoverWidth > viewportWidth - 16) {
      popoverWidth = Math.max(100, viewportWidth - 16)
    }

    const spaceBelow = viewportHeight - rect.bottom
    const spaceAbove = rect.top
    const openUpward = spaceBelow < 220 && spaceAbove > spaceBelow

    let left = rect.left
    if (left + popoverWidth > viewportWidth - 8) {
      left = Math.max(8, viewportWidth - popoverWidth - 8)
    }

    if (openUpward) {
      setPopoverCoords({
        bottom: viewportHeight - rect.top + 4,
        left,
        width: popoverWidth,
      })
    } else {
      setPopoverCoords({
        top: rect.bottom + 4,
        left,
        width: popoverWidth,
      })
    }
  }, [options])

  const handleOpen = () => {
    if (disabled) return
    updatePosition()
    setIsOpen(true)
    setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0)
  }

  const handleClose = () => {
    setIsOpen(false)
    searchStringRef.current = ''
  }

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node
      if (
        triggerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return
      }
      handleClose()
    }

    const handleScrollOrResize = (e: Event) => {
      // Don't close if scrolling inside the popover itself
      if (popoverRef.current && popoverRef.current.contains(e.target as Node)) {
        return
      }
      updatePosition()
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('touchstart', handlePointerDown)
    window.addEventListener('scroll', handleScrollOrResize, true)
    window.addEventListener('resize', handleScrollOrResize)

    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('touchstart', handlePointerDown)
      window.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize)
    }
  }, [isOpen, updatePosition])

  // Intercept Escape key while dropdown is open so parent modals do not close simultaneously
  useEffect(() => {
    if (!isOpen) return
    const handleCaptureKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        handleClose()
        triggerRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleCaptureKeyDown, true)
    return () => window.removeEventListener('keydown', handleCaptureKeyDown, true)
  }, [isOpen])

  // Scroll highlighted item into view
  useEffect(() => {
    if (!isOpen || highlightedIndex < 0 || !popoverRef.current) return
    const container = popoverRef.current
    const item = container.children[highlightedIndex] as HTMLElement
    if (item) {
      item.scrollIntoView({ block: 'nearest' })
    }
  }, [isOpen, highlightedIndex])

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        handleOpen()
      }
      return
    }

    if (e.key === 'Escape') {
      e.preventDefault()
      handleClose()
      triggerRef.current?.focus()
      return
    }

    if (e.key === 'Tab') {
      handleClose()
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((prev) => {
        let next = prev + 1
        while (next < options.length && options[next]?.disabled) next++
        return next < options.length ? next : prev
      })
      return
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((prev) => {
        let prevIdx = prev - 1
        while (prevIdx >= 0 && options[prevIdx]?.disabled) prevIdx--
        return prevIdx >= 0 ? prevIdx : prev
      })
      return
    }

    if (e.key === 'Home') {
      e.preventDefault()
      const first = options.findIndex((o) => !o.disabled)
      if (first >= 0) setHighlightedIndex(first)
      return
    }

    if (e.key === 'End') {
      e.preventDefault()
      for (let i = options.length - 1; i >= 0; i--) {
        if (!options[i]?.disabled) {
          setHighlightedIndex(i)
          break
        }
      }
      return
    }

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (highlightedIndex >= 0 && options[highlightedIndex] && !options[highlightedIndex]?.disabled) {
        onChange(options[highlightedIndex].value)
        handleClose()
        triggerRef.current?.focus()
      }
      return
    }

    // Typeahead support
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      clearTimeout(searchTimeoutRef.current)
      searchStringRef.current += e.key.toLowerCase()
      searchTimeoutRef.current = setTimeout(() => {
        searchStringRef.current = ''
      }, 500)

      const matchIdx = options.findIndex(
        (opt, idx) =>
          !opt.disabled &&
          idx >= 0 &&
          opt.label.toLowerCase().startsWith(searchStringRef.current)
      )
      if (matchIdx >= 0) {
        setHighlightedIndex(matchIdx)
      }
    }
  }

  const selectOption = (opt: SelectOption<T>) => {
    if (opt.disabled) return
    onChange(opt.value)
    handleClose()
    triggerRef.current?.focus()
  }

  return (
    <>
      <button
        ref={triggerRef}
        id={selectId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-label={ariaLabel || placeholder}
        disabled={disabled}
        onClick={() => (isOpen ? handleClose() : handleOpen())}
        onKeyDown={handleKeyDown}
        style={computedWidthStyle}
        className={`h-8 px-2.5 bg-white border rounded-lg text-[13px] text-slate-900 flex items-center justify-between gap-1.5 transition-colors cursor-pointer select-none text-left shrink-0 ${
          isOpen
            ? 'border-blue-600 ring-2 ring-blue-600'
            : 'border-slate-300 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600'
        } ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-50' : ''} ${computedWidthClass} ${className}`}
      >
        <span className="min-w-0 flex-1 flex items-center gap-1.5 truncate">
          {prefixIcon && <span className="shrink-0 text-slate-500">{prefixIcon}</span>}
          {selectedOption ? (
            <>
              {selectedOption.icon && <span className="shrink-0">{selectedOption.icon}</span>}
              {selectedOption.color && (
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: selectedOption.color }}
                />
              )}
              <span className="truncate" title={selectedOption.label}>
                {selectedOption.label}
              </span>
            </>
          ) : (
            <span className="text-slate-400 truncate">{placeholder}</span>
          )}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 ml-1 transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-blue-600' : ''
          }`}
        />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={popoverRef}
            id={listboxId}
            role="listbox"
            tabIndex={-1}
            onKeyDown={handleKeyDown}
            style={{
              position: 'fixed',
              top: popoverCoords.top !== undefined ? `${popoverCoords.top}px` : undefined,
              bottom: popoverCoords.bottom !== undefined ? `${popoverCoords.bottom}px` : undefined,
              left: `${popoverCoords.left}px`,
              width: `${popoverCoords.width}px`,
              maxHeight: '240px',
              zIndex: 9999,
            }}
            className="bg-white border border-slate-200 rounded-[10px] p-1 shadow-lg overflow-y-auto animate-in fade-in-50 zoom-in-95 duration-100 focus:outline-none"
          >
            {options.map((option, idx) => {
              const isSelected = option.value === value
              const isHighlighted = idx === highlightedIndex

              return (
                <div
                  key={String(option.value)}
                  role="option"
                  aria-selected={isSelected}
                  title={option.label}
                  onClick={() => selectOption(option)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`h-8 px-2 rounded-md text-[13px] flex items-center justify-between gap-2 cursor-pointer select-none transition-colors ${
                    option.disabled
                      ? 'opacity-40 cursor-not-allowed'
                      : isHighlighted
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-700 hover:bg-slate-50'
                  } ${isSelected ? 'font-semibold text-blue-600' : ''}`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {option.icon && <span className="shrink-0">{option.icon}</span>}
                    {option.color && (
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: option.color }}
                      />
                    )}
                    <span className="truncate">{option.label}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 ml-1.5" />}
                </div>
              )
            })}
          </div>,
          document.body
        )}
    </>
  )
}
