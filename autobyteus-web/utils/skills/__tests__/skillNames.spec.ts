import { describe, expect, it } from 'vitest'
import {
  SkillNameConflictError,
  newlyShadowedRuntimeDefaultPaths,
  readSkillNameConflictError,
  runtimeDefaultFolderLabel,
  toSkillNameConflict,
  type SkillNameIssue,
} from '~/utils/skills/skillNames'

const conflicts = [{ name: 'dup', existingPath: '/skills/dup', incomingPath: '/pkg/agents/a/skills/dup' }]

describe('skillNames (D-19)', () => {
  it('reads SKILL_NAME_CONFLICT from an Apollo error and from a raw errors array', () => {
    const apollo = { graphQLErrors: [{ message: 'Duplicate skill names: dup', extensions: { code: 'SKILL_NAME_CONFLICT', conflicts } }] }
    const fromApollo = readSkillNameConflictError(apollo)
    expect(fromApollo).toBeInstanceOf(SkillNameConflictError)
    expect(fromApollo).toMatchObject({ message: 'Duplicate skill names: dup', conflicts })
    expect(readSkillNameConflictError(apollo.graphQLErrors)?.conflicts).toEqual(conflicts)
  })

  it('ignores other errors and malformed conflict rows', () => {
    expect(readSkillNameConflictError({ graphQLErrors: [{ message: 'x', extensions: { code: 'OTHER' } }] })).toBeNull()
    expect(readSkillNameConflictError(new Error('network'))).toBeNull()
    expect(readSkillNameConflictError([{ message: 'm', extensions: { code: 'SKILL_NAME_CONFLICT', conflicts: [{ name: 'x' }, ...conflicts] } }])?.conflicts)
      .toEqual(conflicts)
    const typed = new SkillNameConflictError('m', conflicts)
    expect(toSkillNameConflict(typed)).toBe(typed)
  })

  it('finds runtime default copies ignored after, but not before, an action', () => {
    const before: SkillNameIssue[] = [{ name: 'a', usedPath: '/s/a', ignoredPaths: ['/h/.codex/skills/a'], kind: 'shadowed_runtime_default' }]
    const after: SkillNameIssue[] = [
      ...before,
      { name: 'b', usedPath: '/s/b', ignoredPaths: ['/h/.codex/skills/b'], kind: 'shadowed_runtime_default' },
      { name: 'c', usedPath: '/s/c', ignoredPaths: ['/added/c'], kind: 'conflict' },
    ]
    expect(newlyShadowedRuntimeDefaultPaths(before, after)).toEqual(['/h/.codex/skills/b'])
  })

  it('labels the runtime default folder only when every path shares one', () => {
    expect(runtimeDefaultFolderLabel(['/Users/me/.codex/skills/a', '/Users/me/.codex/skills/b'])).toBe('Codex')
    expect(runtimeDefaultFolderLabel(['/Users/me/.claude/skills/a'])).toBe('Claude')
    expect(runtimeDefaultFolderLabel(['/Users/me/.codex/skills/a', '/Users/me/.grok/skills/b'])).toBeNull()
  })
})
