import { describe, expect, it } from 'vitest'
import { TASK_ROOT_KIND_LABEL_KEYS, TASK_ROOT_STATE_LABEL_KEYS, isTaskRootHostListed, presentTaskRoot } from '../taskRootPresentation'
import en from '~/localization/messages/en/projects'
import zhCN from '~/localization/messages/zh-CN/projects'
import type { TaskRootView } from '~/types/project'

const root = (overrides: Partial<TaskRootView> = {}): TaskRootView => ({
  kind: 'agent', recipientAddress: '/product_team/release_writer', ingressAgentRunId: 'worker', teamRunId: null,
  hostRoot: { kind: 'agent', runId: 'manager-root' }, start: 'started', startError: null, closed: false, status: 'running', ...overrides,
})

describe('presentTaskRoot (AR-002 openable rule, DEC-006 statuses)', () => {
  it('a started, open root hosted by a listed run shows the worker status and opens', () => {
    expect(presentTaskRoot(root(), true)).toEqual({ name: 'release writer', state: 'running', muted: false, openable: true, error: null })
  })

  it('a starting root shows Initializing and is not openable', () => {
    expect(presentTaskRoot(root({ start: 'starting', status: 'initializing' }), true)).toMatchObject({ state: 'initializing', openable: false })
  })

  it('a root whose hosting run was deleted (not listed) shows its status but is not openable', () => {
    expect(presentTaskRoot(root({ status: 'idle' }), false)).toMatchObject({ state: 'idle', openable: false })
  })

  it('a closed root is muted Offline and not openable, whatever status it last had', () => {
    expect(presentTaskRoot(root({ closed: true, status: 'running' }), true)).toMatchObject({ state: 'offline', muted: true, openable: false })
  })

  it('a root that could not start shows Couldn\'t start with its error and is not openable', () => {
    expect(presentTaskRoot(root({ start: 'failed', startError: { code: 'NO_MODEL', message: 'No model is set.' }, status: 'offline' }), true))
      .toEqual({ name: 'release writer', state: 'failed', muted: false, openable: false, error: 'No model is set.' })
  })

  it('an assignment recorded before addresses were kept has no name (the line shows its kind)', () => {
    expect(presentTaskRoot(root({ recipientAddress: null }), true).name).toBeNull()
  })
})

describe('isTaskRootHostListed', () => {
  const history = {
    workspaceGroups: [{
      agentDefinitions: [{ runs: [{ runId: 'manager-root' }] }],
      teamDefinitions: [{ runs: [{ teamRunId: 'team-root' }] }],
    }],
    agentOrgHistory: [{ rootRunId: 'org-root' }],
  } as any
  it.each([
    ['agent', 'manager-root', true], ['agent', 'team-root', false],
    ['agent_team', 'team-root', true], ['agent_team', 'manager-root', false],
    ['agent_org', 'org-root', true], ['agent_org', 'deleted-org', false],
  ] as const)('%s host %s → %s', (kind, runId, listed) => {
    expect(isTaskRootHostListed(history, { kind, runId })).toBe(listed)
  })
})

describe('root label keys (CR-002: literal keys the localization audit resolves)', () => {
  it('every root state and kind has a literal key present in the en and zh-CN catalogs', () => {
    const keys = [...Object.values(TASK_ROOT_STATE_LABEL_KEYS), ...Object.values(TASK_ROOT_KIND_LABEL_KEYS)]
    expect(Object.keys(TASK_ROOT_STATE_LABEL_KEYS).sort()).toEqual(['error', 'failed', 'idle', 'initializing', 'offline', 'running'])
    for (const key of keys) {
      expect((en as Record<string, string>)[key], key).toBeTruthy()
      expect((zhCN as Record<string, string>)[key], key).toBeTruthy()
    }
  })
})
