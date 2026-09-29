import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const { apolloClientMock, addToast } = vi.hoisted(() => ({
  apolloClientMock: { query: vi.fn() },
  addToast: vi.fn(),
}))

vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => apolloClientMock }))
vi.mock('~/graphql/skills', () => ({ GET_SKILL_NAME_ISSUES: {} }))
vi.mock('~/composables/useToasts', () => ({ useToasts: () => ({ addToast }) }))
vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({ t: (key: string, params?: Record<string, unknown>) => `${key}:${JSON.stringify(params ?? {})}` }),
}))

import { useSkillNamesStore } from '../skillNamesStore'
import { SkillNameConflictError } from '~/utils/skills/skillNames'

const shadow = (name: string) => ({ name, usedPath: `/s/${name}`, ignoredPaths: [`/h/.codex/skills/${name}`], kind: 'shadowed_runtime_default' })
const respond = (...issueLists: unknown[][]) => {
  for (const issues of issueLists) apolloClientMock.query.mockResolvedValueOnce({ data: { skillNameIssues: issues } })
}

describe('skillNamesStore (D-19)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('loads the banner issues', async () => {
    respond([shadow('a')])
    const store = useSkillNamesStore()
    await store.fetchIssues()
    expect(store.issues).toEqual([shadow('a')])
  })

  it('opens the conflict pop-up and rethrows when the action is rejected with a duplicate name', async () => {
    respond([])
    const store = useSkillNamesStore()
    const conflicts = [{ name: 'dup', existingPath: '/skills/dup', incomingPath: '/pkg/dup' }]
    const rejection = new SkillNameConflictError('Duplicate skill names: dup', conflicts)

    await expect(store.runWithSkillNameChecks(() => Promise.reject(rejection))).rejects.toBe(rejection)
    expect(store.conflicts).toEqual(conflicts)
    store.dismissConflicts()
    expect(store.conflicts).toEqual([])
  })

  it('announces runtime default copies the action newly ignores (tier-4 notice)', async () => {
    respond([shadow('a')], [shadow('a'), shadow('b'), shadow('c')])
    const store = useSkillNamesStore()

    await expect(store.runWithSkillNameChecks(async () => 'done')).resolves.toBe('done')

    expect(addToast).toHaveBeenCalledWith('skills.nameNotice.ignoredManyFromFolder:{"count":2,"folder":"Codex"}', 'info', 6000)
    expect(store.issues).toHaveLength(3)
  })

  it('announces nothing when no new runtime default copy is ignored, and other failures leave the pop-up closed', async () => {
    respond([shadow('a')], [shadow('a')], [])
    const store = useSkillNamesStore()
    await store.runWithSkillNameChecks(async () => undefined)
    expect(addToast).not.toHaveBeenCalled()

    await expect(store.runWithSkillNameChecks(() => Promise.reject(new Error('network')))).rejects.toThrow('network')
    expect(store.conflicts).toEqual([])
  })
})
