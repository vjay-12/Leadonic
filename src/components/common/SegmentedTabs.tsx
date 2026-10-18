import React from 'react'

export interface TabOption<T extends string = string> {
  value: T
  label: string
  count?: number
}

const DEFAULT_OPTIONS: TabOption<any>[] = [
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
]

export interface SegmentedTabsProps<T extends string = string> {
  value: T
  onChange: (value: T) => void
  options?: TabOption<T>[]
  className?: string
  ariaLabel?: string
}

export function SegmentedTabs<T extends string = string>({
  value,
  onChange,
  options = DEFAULT_OPTIONS as TabOption<T>[],
  className = '',
  ariaLabel = 'Segmented options',
}: SegmentedTabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`inline-flex items-center bg-slate-100 p-0.5 rounded-md border border-slate-200/90 text-xs shrink-0 select-none ${className}`}
    >
      {options.map((opt) => {
        const isSelected = opt.value === value
        return (
          <button
            key={opt.value}
            role="tab"
            type="button"
            aria-selected={isSelected}
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1.5 rounded transition-all duration-150 cursor-pointer flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
              isSelected
                ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 font-medium hover:bg-slate-200/50'
            }`}
          >
            <span>{opt.label}</span>
            {typeof opt.count === 'number' && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                  isSelected ? 'bg-slate-100 text-slate-700' : 'bg-slate-200/70 text-slate-600'
                }`}
              >
                {opt.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
