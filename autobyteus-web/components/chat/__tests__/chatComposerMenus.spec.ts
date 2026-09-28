import { describe, expect, it } from 'vitest'
import { detectMenuTrigger, filterTargets, rankSkills } from '../chatComposerMenus'

describe('chatComposerMenus', () => {
  it('ranks skills by name prefix, then name contains, then description', () => {
    const skills = [
      { name: 'writer', description: 'uses sk tricks' },
      { name: 'task-skill', description: '' },
      { name: 'skill-optimizer', description: '' },
      { name: 'unrelated', description: 'nothing' },
    ]
    expect(rankSkills(skills, 'sk').map((skill) => skill.name)).toEqual(['skill-optimizer', 'task-skill', 'writer'])
    expect(rankSkills(skills, '')).toHaveLength(4)
  })

  it('detects / and @ only at the start of a word and only when offered', () => {
    expect(detectMenuTrigger('/sk', { mentions: true, skills: true })).toEqual({ kind: 'skill', query: 'sk', start: 0 })
    expect(detectMenuTrigger('hello @cod', { mentions: true, skills: true })).toEqual({ kind: 'target', query: 'cod', start: 6 })
    expect(detectMenuTrigger('a/b', { mentions: true, skills: true })).toBeNull()
    expect(detectMenuTrigger('@cod', { mentions: false, skills: true })).toBeNull()
    expect(detectMenuTrigger('/sk', { mentions: true, skills: false })).toBeNull()
  })

  it('filters targets by name or id', () => {
    const targets = [
      { key: 'agent:codex', kind: 'agent' as const, id: 'codex', name: 'Codex', initials: 'C', description: '' },
      { key: 'team:t1', kind: 'team' as const, id: 't1', name: 'Product Review Team', initials: 'PR', description: '' },
    ]
    expect(filterTargets(targets, 'prod').map((target) => target.id)).toEqual(['t1'])
    expect(filterTargets(targets, 'codex').map((target) => target.id)).toEqual(['codex'])
  })
})
