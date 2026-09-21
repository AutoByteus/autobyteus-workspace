import { describe, expect, it } from 'vitest'
import { formatMemberRoleLabel } from '../memberRoleLabel'

describe('formatMemberRoleLabel', () => {
  it.each([
    ['research_group', 'research group'],
    ['Architecture-Designer', 'Architecture Designer'],
    ['  QA__lead---West  ', 'QA lead West'],
    ['sharedWorker', 'sharedWorker'],
    [' __-- ', ''],
  ])('formats %j as %j without changing casing', (value, expected) => {
    expect(formatMemberRoleLabel(value)).toBe(expected)
  })
})
