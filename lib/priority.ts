export type Priority = 'High' | 'Medium' | 'Low'

/**
 * Validates threshold values:
 * 0 < mediumFrom <= highFrom <= 5
 */
export function validateThresholds(mediumFrom: number, highFrom: number): boolean {
  if (
    typeof mediumFrom !== 'number' ||
    isNaN(mediumFrom) ||
    !isFinite(mediumFrom) ||
    typeof highFrom !== 'number' ||
    isNaN(highFrom) ||
    !isFinite(highFrom)
  ) {
    return false
  }
  return mediumFrom > 0 && mediumFrom <= highFrom && highFrom <= 5
}

/**
 * Accepts numbers and numeric text ("3", " 4.5 "),
 * returns null for empty, non-numeric, below 0 or above 5.
 */
export function parseScore(value: any): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'boolean') return null

  let num: number
  if (typeof value === 'number') {
    num = value
  } else if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    num = Number(trimmed)
  } else {
    return null
  }

  if (isNaN(num) || !isFinite(num)) return null
  if (num < 0 || num > 5) return null
  return num
}

/**
 * Returns "Low" when the score is >= 0 and < mediumFrom,
 * "Medium" when >= mediumFrom and < highFrom,
 * and "High" when >= highFrom and <= 5.
 * Defaults are 0-1 Low, 2-3 Medium, 4-5 High, with decimals like 1.5 -> Low and 3.5 -> Medium.
 * Returns null if score is outside [0, 5] or if thresholds are invalid.
 */
export function priorityFromScore(
  score: number,
  mediumFrom = 2,
  highFrom = 4
): Priority | null {
  if (typeof score !== 'number' || isNaN(score) || !isFinite(score)) return null
  if (score < 0 || score > 5) return null
  if (!validateThresholds(mediumFrom, highFrom)) return null

  if (score < mediumFrom) {
    return 'Low'
  }
  if (score < highFrom) {
    return 'Medium'
  }
  return 'High'
}

/**
 * Used only when a row has no valid score:
 * low -> Low, cool -> Medium, warm -> Medium, hot -> High (case-insensitive, trimmed).
 * Also accepts high/medium/low as they are. Anything else -> null.
 */
export function priorityFromLabel(text: string | null | undefined): Priority | null {
  if (!text || typeof text !== 'string') return null
  const normalized = text.trim().toLowerCase()
  if (!normalized) return null

  switch (normalized) {
    case 'low':
      return 'Low'
    case 'cool':
    case 'medium':
    case 'warm':
      return 'Medium'
    case 'hot':
    case 'high':
      return 'High'
    default:
      return null
  }
}

export interface PriorityConversionResult {
  priority: Priority | null
  priorityScore: number | null
  source: 'score' | 'label' | 'none'
  rawScore: any
  rawPriority: any
  warning?: string | null
}

/**
 * High-level converter for a spreadsheet row combining score and label logic.
 */
export function convertPriority(
  rawScore: any,
  rawLabel: any,
  applyConversion: boolean,
  mediumFrom = 2,
  highFrom = 4
): PriorityConversionResult {
  if (!applyConversion) {
    const parsedSc = parseScore(rawScore)
    let pri: Priority | null = null
    if (typeof rawLabel === 'string') {
      const lower = rawLabel.trim().toLowerCase()
      if (lower === 'high') pri = 'High'
      else if (lower === 'medium') pri = 'Medium'
      else if (lower === 'low') pri = 'Low'
    }
    return {
      priority: pri,
      priorityScore: parsedSc,
      source: pri ? 'label' : 'none',
      rawScore,
      rawPriority: rawLabel,
    }
  }

  // 1. Try score conversion
  const parsedScore = parseScore(rawScore)
  if (parsedScore !== null) {
    const pri = priorityFromScore(parsedScore, mediumFrom, highFrom)
    return {
      priority: pri,
      priorityScore: parsedScore,
      source: 'score',
      rawScore,
      rawPriority: rawLabel,
    }
  }

  // Score is not a valid score in [0, 5]
  let scoreWarning: string | null = null
  if (rawScore !== null && rawScore !== undefined && String(rawScore).trim() !== '') {
    const rawNum = typeof rawScore === 'number' ? rawScore : Number(String(rawScore).trim())
    if (isNaN(rawNum)) {
      scoreWarning = `Score "${rawScore}" is not a valid number`
    } else if (rawNum < 0 || rawNum > 5) {
      scoreWarning = `Score ${rawNum} is outside 0-5`
    }
  }

  // 2. Fallback to label
  const labelPri = priorityFromLabel(rawLabel)
  if (labelPri !== null) {
    return {
      priority: labelPri,
      priorityScore: null,
      source: 'label',
      rawScore,
      rawPriority: rawLabel,
      warning: scoreWarning,
    }
  }

  // 3. No usable score or label
  const warning =
    scoreWarning ||
    (rawLabel && String(rawLabel).trim()
      ? `Unrecognized priority label "${rawLabel}"`
      : 'No priority score or label')

  return {
    priority: null,
    priorityScore: null,
    source: 'none',
    rawScore,
    rawPriority: rawLabel,
    warning,
  }
}
