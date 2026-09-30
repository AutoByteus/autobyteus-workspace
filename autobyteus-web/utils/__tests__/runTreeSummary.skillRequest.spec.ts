import { describe, expect, it } from 'vitest'
import { resolveFirstUserMessageSummary } from '../runTreeSummary'

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
