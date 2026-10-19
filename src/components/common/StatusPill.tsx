import React, { useEffect } from 'react'

let cachedMeasureCanvas: HTMLCanvasElement | null = null

export function measureTextWidth(text: string, font = '600 12px Inter, system-ui, sans-serif'): number {
  if (typeof document === 'undefined') return text.length * 7.2
  try {
    if (!cachedMeasureCanvas) {
      cachedMeasureCanvas = document.createElement('canvas')
    }
    const ctx = cachedMeasureCanvas.getContext('2d')
    if (!ctx) return text.length * 7.2
    ctx.font = font
    return ctx.measureText(text).width
  } catch {
    return text.length * 7.2
  }
}

export function computeSharedPillWidth(
  items: ({ name?: string | null } | string | null | undefined)[],
  fallbackMin = 84
): number {
  const extractedNames = items.map((item) => {
    if (!item) return null
    if (typeof item === 'string') return item
    return item.name || null
  })
  const candidateNames = [...extractedNames.filter(Boolean) as string[], 'Not called', 'Not started']
  let maxTextWidth = 0
  for (const name of candidateNames) {
    const w = measureTextWidth(name, '600 12px Inter, system-ui, sans-serif')
    if (w > maxTextWidth) maxTextWidth = w
  }
  // Exact requirement: Width = the longest status name measured at 12px plus 28px padding, minimum 84px
  const width = Math.ceil(maxTextWidth + 28)
  return Math.max(fallbackMin, width)
}

export function setStatusPillWidthCssVar(
  items: ({ name?: string | null } | string | null | undefined)[]
): number {
  const width = computeSharedPillWidth(items, 84)
  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--status-pill-width', `${width}px`)
    document.documentElement.style.setProperty('--status-col-width', `${width + 24}px`)
  }
  return width
}

/**
 * Hook to automatically update the CSS variable --status-pill-width and --status-col-width
 * based on the provided list of status objects, stage objects, or string names.
 */
export function useStatusPillWidth(
  items: ({ name?: string | null } | string | null | undefined)[]
) {
  useEffect(() => {
    if (items.length > 0) {
      setStatusPillWidthCssVar(items)
    }
  }, [items])
}

export interface StatusPillProps {
  status?: { name?: string | null; color?: string | null } | null
  name?: string | null
  color?: string | null
  defaultName?: string
  fallbackText?: string
  className?: string
  style?: React.CSSProperties
}

export const StatusPill: React.FC<StatusPillProps> = ({
  status,
  name,
  color,
  defaultName = 'Not called',
  fallbackText,
  className = '',
  style,
}) => {
  const resolvedName = status?.name ?? name
  const resolvedColor = status?.color ?? color
  const fallback = fallbackText || defaultName
  const displayName = resolvedName || fallback
  const activeColor = resolvedColor || (resolvedName ? '#64748B' : '#94A3B8')
  const isDefaultEmpty = !resolvedName

  return (
    <span
      className={`inline-flex items-center justify-center gap-1.5 h-6 px-2.5 rounded-full text-[12px] font-semibold border shrink-0 text-center select-none leading-none ${
        isDefaultEmpty
          ? 'bg-slate-100 text-slate-500 border-slate-200'
          : ''
      } ${className}`}
      style={{
        width: 'var(--status-pill-width, 110px)',
        minWidth: 'var(--status-pill-width, 110px)',
        maxWidth: 'var(--status-pill-width, 110px)',
        backgroundColor: !isDefaultEmpty ? `${activeColor}15` : undefined,
        borderColor: !isDefaultEmpty ? `${activeColor}40` : undefined,
        color: !isDefaultEmpty ? activeColor : undefined,
        ...style,
      }}
      title={displayName}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: activeColor }}
      />
      <span className="whitespace-nowrap truncate">{displayName}</span>
    </span>
  )
}
