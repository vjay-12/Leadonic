import { Lead, ScoringRules } from '../types'

export const DEFAULT_SCORING_RULES: ScoringRules = {
  ratingThreshold: 4.0,
  ratingPoints: 2,
  websitePoints: 1,
  targetCategories: ['Dental Clinic', 'Real Estate Agency', 'Gym & Fitness', 'Boutique Cafe', 'Coaching Institute'],
  categoryPoints: 2,
  previouslyInterestedPoints: 3,
  noAnswerPenaltyThreshold: 3,
  noAnswerPenaltyPoints: -2,
}

export interface ScoreBreakdownItem {
  label: string
  points: number
  matched: boolean
}

export interface ScoreResult {
  total: number
  breakdown: ScoreBreakdownItem[]
}

/**
 * Calculates lead score based on configurable rules and returns itemized breakdown.
 */
export function calculateLeadScore(
  lead: Partial<Lead>,
  rules: ScoringRules = DEFAULT_SCORING_RULES,
  noAnswerCount: number = 0
): ScoreResult {
  const breakdown: ScoreBreakdownItem[] = []

  // 1. Rating 4.0+
  const ratingMatched = Boolean(lead.rating && lead.rating >= rules.ratingThreshold)
  breakdown.push({
    label: `Rating ≥ ${rules.ratingThreshold} (${lead.rating ?? 0}★)`,
    points: rules.ratingPoints,
    matched: ratingMatched,
  })

  // 2. Has website
  const hasWebsite = Boolean(lead.website && lead.website.trim().length > 3)
  breakdown.push({
    label: 'Has active website',
    points: rules.websitePoints,
    matched: hasWebsite,
  })

  // 3. Category in target list
  const categoryMatched = Boolean(
    lead.category &&
      rules.targetCategories.some(
        (tc) => tc.toLowerCase().trim() === lead.category?.toLowerCase().trim()
      )
  )
  breakdown.push({
    label: `Target industry (${lead.category || 'None'})`,
    points: rules.categoryPoints,
    matched: categoryMatched,
  })

  // 4. Previously interested
  const interestedMatched = lead.status === 'Interested'
  breakdown.push({
    label: 'Pipeline status is Interested',
    points: rules.previouslyInterestedPoints,
    matched: interestedMatched,
  })

  // 5. 3+ No-answer penalty
  const penaltyMatched = noAnswerCount >= rules.noAnswerPenaltyThreshold
  breakdown.push({
    label: `Repeated no-answers (≥${rules.noAnswerPenaltyThreshold} attempts)`,
    points: rules.noAnswerPenaltyPoints,
    matched: penaltyMatched,
  })

  const total = breakdown.reduce((sum, item) => sum + (item.matched ? item.points : 0), 0)

  return {
    total: Math.max(0, total), // Non-negative score
    breakdown,
  }
}
