import { describe, expect, it } from 'vitest'
import { isRunnableWorkspaceKind } from '../runnableWorkspaceKind'

describe('isRunnableWorkspaceKind (autobyteus-576 DEC-003)', () => {
  it.each([
    ['filesystem', true],
    ['temp', true],
    ['skill', false],
    ['semantic_memory', false],
  ])('%s → %s', (kind, runnable) => {
    expect(isRunnableWorkspaceKind(kind)).toBe(runnable)
  })
})
