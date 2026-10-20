import { test, describe } from 'node:test'
import assert from 'node:assert'
import {
  parseScore,
  priorityFromScore,
  priorityFromLabel,
  validateThresholds,
  convertPriority,
} from '../lib/priority.js'

describe('parseScore', () => {
  test('handles numeric and numeric-string boundaries within [0, 5]', () => {
    assert.strictEqual(parseScore(0), 0)
    assert.strictEqual(parseScore(1), 1)
    assert.strictEqual(parseScore(1.99), 1.99)
    assert.strictEqual(parseScore(2), 2)
    assert.strictEqual(parseScore(3), 3)
    assert.strictEqual(parseScore(3.99), 3.99)
    assert.strictEqual(parseScore(4), 4)
    assert.strictEqual(parseScore(5), 5)
    assert.strictEqual(parseScore('3'), 3)
    assert.strictEqual(parseScore(' 4.5 '), 4.5)
  })

  test('returns null for values outside [0, 5] and invalid inputs', () => {
    assert.strictEqual(parseScore(-1), null)
    assert.strictEqual(parseScore(-0.01), null)
    assert.strictEqual(parseScore(5.01), null)
    assert.strictEqual(parseScore(7), null)
    assert.strictEqual(parseScore(null), null)
    assert.strictEqual(parseScore(undefined), null)
    assert.strictEqual(parseScore('abc'), null)
    assert.strictEqual(parseScore('n/a'), null)
    assert.strictEqual(parseScore(''), null)
    assert.strictEqual(parseScore('   '), null)
    assert.strictEqual(parseScore(true), null)
    assert.strictEqual(parseScore(false), null)
  })
})

describe('priorityFromScore with default thresholds (2, 4)', () => {
  test('returns Low for scores >= 0 and < 2', () => {
    assert.strictEqual(priorityFromScore(0), 'Low')
    assert.strictEqual(priorityFromScore(1), 'Low')
    assert.strictEqual(priorityFromScore(1.5), 'Low')
    assert.strictEqual(priorityFromScore(1.99), 'Low')
  })

  test('returns Medium for scores >= 2 and < 4', () => {
    assert.strictEqual(priorityFromScore(2), 'Medium')
    assert.strictEqual(priorityFromScore(3), 'Medium')
    assert.strictEqual(priorityFromScore(3.5), 'Medium')
    assert.strictEqual(priorityFromScore(3.99), 'Medium')
  })

  test('returns High for scores >= 4 and <= 5', () => {
    assert.strictEqual(priorityFromScore(4), 'High')
    assert.strictEqual(priorityFromScore(4.5), 'High')
    assert.strictEqual(priorityFromScore(5), 'High')
  })

  test('returns null for out of range or invalid score', () => {
    assert.strictEqual(priorityFromScore(-1), null)
    assert.strictEqual(priorityFromScore(5.01), null)
    assert.strictEqual(priorityFromScore(NaN), null)
    assert.strictEqual(priorityFromScore(Infinity), null)
  })
})

describe('validateThresholds and custom thresholds', () => {
  test('validates 0 < mediumFrom <= highFrom <= 5', () => {
    assert.strictEqual(validateThresholds(2, 4), true)
    assert.strictEqual(validateThresholds(1, 1), true)
    assert.strictEqual(validateThresholds(0.5, 4.5), true)
    assert.strictEqual(validateThresholds(0.1, 5), true)

    // Invalid mediumFrom <= 0
    assert.strictEqual(validateThresholds(0, 4), false)
    assert.strictEqual(validateThresholds(-1, 4), false)

    // Invalid mediumFrom > highFrom
    assert.strictEqual(validateThresholds(4, 2), false)

    // Invalid highFrom > 5
    assert.strictEqual(validateThresholds(2, 5.01), false)
    assert.strictEqual(validateThresholds(2, 6), false)

    // Non-numbers / NaN
    assert.strictEqual(validateThresholds(NaN, 4), false)
    assert.strictEqual(validateThresholds(2, NaN), false)
  })

  test('priorityFromScore with custom valid thresholds (e.g. 3, 5)', () => {
    assert.strictEqual(priorityFromScore(2.5, 3, 5), 'Low')
    assert.strictEqual(priorityFromScore(3, 3, 5), 'Medium')
    assert.strictEqual(priorityFromScore(4.99, 3, 5), 'Medium')
    assert.strictEqual(priorityFromScore(5, 3, 5), 'High')
  })

  test('priorityFromScore returns null for invalid custom thresholds', () => {
    assert.strictEqual(priorityFromScore(2, 0, 4), null)
    assert.strictEqual(priorityFromScore(2, 4, 3), null)
    assert.strictEqual(priorityFromScore(2, 2, 6), null)
  })
})

describe('priorityFromLabel (label fallback)', () => {
  test('correctly maps low, cool, warm, hot case-insensitively', () => {
    assert.strictEqual(priorityFromLabel('low'), 'Low')
    assert.strictEqual(priorityFromLabel('LOW'), 'Low')
    assert.strictEqual(priorityFromLabel('cool'), 'Medium')
    assert.strictEqual(priorityFromLabel('Cool'), 'Medium')
    assert.strictEqual(priorityFromLabel('warm'), 'Medium')
    assert.strictEqual(priorityFromLabel('WARM '), 'Medium')
    assert.strictEqual(priorityFromLabel('hot'), 'High')
    assert.strictEqual(priorityFromLabel('HOT'), 'High')
  })

  test('accepts high/medium/low directly', () => {
    assert.strictEqual(priorityFromLabel('High'), 'High')
    assert.strictEqual(priorityFromLabel('high'), 'High')
    assert.strictEqual(priorityFromLabel('Medium'), 'Medium')
    assert.strictEqual(priorityFromLabel('MEDIUM'), 'Medium')
    assert.strictEqual(priorityFromLabel('Low'), 'Low')
  })

  test('returns null for unrecognized or empty values', () => {
    assert.strictEqual(priorityFromLabel(''), null)
    assert.strictEqual(priorityFromLabel('   '), null)
    assert.strictEqual(priorityFromLabel(null), null)
    assert.strictEqual(priorityFromLabel(undefined), null)
    assert.strictEqual(priorityFromLabel('urgent'), null)
    assert.strictEqual(priorityFromLabel('normal'), null)
  })
})

describe('convertPriority integration', () => {
  test('converts from score when valid score exists', () => {
    const res = convertPriority(4, 'warm', true)
    assert.strictEqual(res.priority, 'High')
    assert.strictEqual(res.priorityScore, 4)
    assert.strictEqual(res.source, 'score')
  })

  test('falls back to label when score is missing', () => {
    const res = convertPriority('', 'warm', true)
    assert.strictEqual(res.priority, 'Medium')
    assert.strictEqual(res.priorityScore, null)
    assert.strictEqual(res.source, 'label')
  })

  test('falls back to label when score is out-of-range or invalid', () => {
    const res = convertPriority(7, 'hot', true)
    assert.strictEqual(res.priority, 'High')
    assert.strictEqual(res.priorityScore, null)
    assert.strictEqual(res.source, 'label')
    assert.strictEqual(res.warning, 'Score 7 is outside 0-5')
  })

  test('returns null priority and warning when neither score nor label is valid', () => {
    const res = convertPriority(7, '', true)
    assert.strictEqual(res.priority, null)
    assert.strictEqual(res.priorityScore, null)
    assert.strictEqual(res.source, 'none')
    assert.strictEqual(res.warning, 'Score 7 is outside 0-5')

    const resNa = convertPriority('n/a', '', true)
    assert.strictEqual(resNa.priority, null)
    assert.strictEqual(resNa.source, 'none')
    assert.strictEqual(resNa.warning, 'Score "n/a" is not a valid number')
  })

  test('when applyConversion is false, keeps only High/Medium/Low from label', () => {
    assert.strictEqual(convertPriority(5, 'warm', false).priority, null)
    assert.strictEqual(convertPriority(5, 'hot', false).priority, null)
    assert.strictEqual(convertPriority(5, 'High', false).priority, 'High')
    assert.strictEqual(convertPriority(5, 'medium', false).priority, 'Medium')
    assert.strictEqual(convertPriority(5, 'LOW', false).priority, 'Low')
  })
})
