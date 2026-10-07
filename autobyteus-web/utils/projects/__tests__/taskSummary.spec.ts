import { describe, expect, it } from 'vitest'
import {
  TASK_CARD_TEXT_MAX_CHARS, TASK_SUMMARY_LABEL_MAX_CHARS, boundTaskText, taskCardPreview, taskCardSummary, taskPreview, taskSummary, taskSummaryLabel,
} from '../taskSummary'

const words = (count: number) => Array.from({ length: count }, (_, i) => `word${i}`).join(' ')

describe('taskSummary', () => {
  it('uses the first non-empty line, trimmed', () => {
    expect(taskSummary('Write release notes for 1.4.87\nInclude Projects and Tasks')).toBe('Write release notes for 1.4.87')
    expect(taskSummary('\n\n   \n  Second paragraph first  \r\nmore')).toBe('Second paragraph first')
  })

  it('returns an empty string for blank input', () => {
    expect(taskSummary('   \n\t')).toBe('')
  })
})

describe('taskPreview', () => {
  it('joins the non-empty lines after the summary with spaces', () => {
    expect(taskPreview('\n Summary \nfirst detail\n\n  second detail  \r\nthird')).toBe('first detail second detail third')
  })
  it('is empty for a single line or blank input', () => {
    expect(taskPreview('Only a summary')).toBe('')
    expect(taskPreview('  \n ')).toBe('')
  })
})

describe('boundTaskText', () => {
  it('returns text that fits unchanged', () => {
    expect(boundTaskText('Short enough', 12)).toBe('Short enough')
  })
  it('cuts at the last word boundary and ends with "…", within the limit', () => {
    expect(boundTaskText('alpha beta gamma delta', 13)).toBe('alpha beta…')
    expect(boundTaskText('alpha beta gamma delta', 12)).toBe('alpha beta…')
    // The cut falls exactly before a space: the whole last word is kept.
    expect(boundTaskText('alpha beta gamma', 11)).toBe('alpha beta…')
  })
  it('hard-cuts a single word longer than the limit', () => {
    expect(boundTaskText('x'.repeat(50), 10)).toBe(`${'x'.repeat(9)}…`)
  })
  it('never ends on half of a surrogate pair', () => {
    const bounded = boundTaskText(`${'a'.repeat(8)}😀😀😀`, 10)
    expect(bounded).toBe(`${'a'.repeat(8)}…`)
  })
})

describe('card text and labels (REQ-001, REQ-002)', () => {
  const huge = words(10_000)

  it('bounds a ~10,000-word single paragraph to a short summary and no preview', () => {
    const summary = taskCardSummary(huge)
    expect(summary.length).toBeLessThanOrEqual(TASK_CARD_TEXT_MAX_CHARS)
    expect(summary.endsWith('…')).toBe(true)
    expect(summary).toMatch(/^word0 word1 /)
    expect(summary.slice(0, -1)).toMatch(/word\d+$/) // ends on a whole word
    expect(taskCardPreview(huge)).toBe('')
  })

  it('bounds a long multi-line description: summary and preview each at most the card limit', () => {
    const description = `${words(400)}\n${words(3000)}\n\n${words(3000)}`
    expect(taskCardSummary(description).length).toBeLessThanOrEqual(TASK_CARD_TEXT_MAX_CHARS)
    expect(taskCardPreview(description).length).toBeLessThanOrEqual(TASK_CARD_TEXT_MAX_CHARS)
    expect(taskCardPreview(description).endsWith('…')).toBe(true)
  })

  it('keeps short card text exactly as before (AC-006)', () => {
    expect(taskCardSummary('Write release notes\nInclude Projects')).toBe('Write release notes')
    expect(taskCardPreview('Write release notes\nInclude Projects')).toBe('Include Projects')
  })

  it('shortens the one-line label for a long first line and keeps a short one whole (AC-003)', () => {
    const label = taskSummaryLabel(huge)
    expect(label.length).toBeLessThanOrEqual(TASK_SUMMARY_LABEL_MAX_CHARS)
    expect(label.endsWith('…')).toBe(true)
    expect(taskSummaryLabel('Review the docs site.\nDetails')).toBe('Review the docs site.')
  })
})
