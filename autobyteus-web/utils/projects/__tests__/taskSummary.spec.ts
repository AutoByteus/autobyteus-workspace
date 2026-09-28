import { describe, expect, it } from 'vitest'
import { taskSummary } from '../taskSummary'

describe('taskSummary', () => {
  it('uses the first non-empty line, trimmed', () => {
    expect(taskSummary('Write release notes for 1.4.87\nInclude Projects and Tasks')).toBe('Write release notes for 1.4.87')
    expect(taskSummary('\n\n   \n  Second paragraph first  \r\nmore')).toBe('Second paragraph first')
  })

  it('returns an empty string for blank input', () => {
    expect(taskSummary('   \n\t')).toBe('')
  })
})
