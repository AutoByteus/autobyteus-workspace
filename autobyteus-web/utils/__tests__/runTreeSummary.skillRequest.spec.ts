import { describe, expect, it } from 'vitest'
import { resolveFirstUserMessageSummary, resolveStoredTitleSummary } from '../runTreeSummary'

const conversation = (text: string) => ({ messages: [{ type: 'user', text, timestamp: new Date(), contextFilePaths: [] }] }) as any

describe('resolveFirstUserMessageSummary with skill tags', () => {
  it('reads the summary from the user text after a skill instruction', () => {
    expect(resolveFirstUserMessageSummary(conversation('Use the writer skill for this request.\n\nDraft a note')))
      .toBe('Draft a note')
  })

  it('falls back to the instruction for a tags-only message', () => {
    expect(resolveFirstUserMessageSummary(conversation('Use these skills for this request: a, b.')))
      .toBe('Use these skills for this request: a, b.')
  })

  it('keeps plain messages unchanged', () => {
    expect(resolveFirstUserMessageSummary(conversation('  hello  '))).toBe('hello')
  })
})

describe('resolveStoredTitleSummary', () => {
  it('reads a compacted skill-tagged title from the user text after the instruction', () => {
    expect(resolveStoredTitleSummary('Use the writer skill for this request. Draft a note')).toBe('Draft a note')
    expect(resolveStoredTitleSummary('Use these skills for this request: a, b. Draft a note')).toBe('Draft a note')
  })

  it('reads a compacted tags-only title as the instruction itself', () => {
    expect(resolveStoredTitleSummary('Use the writer skill for this request.'))
      .toBe('Use the writer skill for this request.')
  })

  it('keeps plain and peer-started titles unchanged', () => {
    expect(resolveStoredTitleSummary('  Write the report  ')).toBe('Write the report')
  })

  it('is null for an empty stored title', () => {
    expect(resolveStoredTitleSummary('   ')).toBeNull()
    expect(resolveStoredTitleSummary(null)).toBeNull()
    expect(resolveStoredTitleSummary(undefined)).toBeNull()
  })
})
