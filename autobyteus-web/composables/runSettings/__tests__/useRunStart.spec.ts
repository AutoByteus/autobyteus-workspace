import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  push: vi.fn(async () => undefined),
  chat: {
    draft: null as any,
    startForDefinition: vi.fn(),
    startNewChat: vi.fn(),
    retarget: vi.fn(),
  },
  org: { start: vi.fn(), startSettings: null as any },
  seed: vi.fn(),
}))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: mocks.push }) }))
vi.mock('~/stores/chatDraftStore', () => ({
  useChatDraftStore: () => mocks.chat,
  chatStartSettingsOf: (draft: any) => ({ carriedFrom: draft.id }),
}))
vi.mock('~/stores/agentOrgLaunchDraftStore', () => ({ useAgentOrgLaunchDraftStore: () => mocks.org }))
vi.mock('~/services/runConfigEditing/teamRunLaunchSeed', () => ({ loadTeamRunLaunchSeed: mocks.seed }))
vi.mock('~/services/workspace/runWorkspaceChoice', () => ({
  runWorkspaceChoiceFromRootPath: (path: string | null | undefined) => (path ? { kind: 'folder', rootPath: path } : null),
  runWorkspaceChoiceFromTeamWorkspace: (workspace: any) => (workspace?.workspaceId ? { kind: 'existing', workspaceId: workspace.workspaceId } : null),
}))

import { useRunStart } from '../useRunStart'

const orgRoute = (definitionId: string, sourceOrgRunId?: string) => ({
  path: '/workspace',
  query: { rootSubjectKind: 'agent_org', definitionId, ...(sourceOrgRunId ? { sourceOrgRunId } : {}), mode: 'configuration' },
})

describe('useRunStart (the single start intent)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.chat.draft = null
    mocks.org.startSettings = null
  })

  it('Run on an Agent or Team opens New chat for it; Run on an Org opens the Org launch page', async () => {
    const start = useRunStart()
    await start.runAgent('agent-1')
    expect(mocks.chat.startForDefinition).toHaveBeenLastCalledWith({ kind: 'agent', agentDefinitionId: 'agent-1' }, {})
    expect(mocks.push).toHaveBeenLastCalledWith('/chat')

    await start.runTeam('team-1')
    expect(mocks.chat.startForDefinition).toHaveBeenLastCalledWith({ kind: 'team', teamDefinitionId: 'team-1' }, {})

    await start.runOrg('org-1')
    expect(mocks.org.start).toHaveBeenLastCalledWith({ orgDefinitionId: 'org-1', sourceOrgRunId: null, carried: null })
    expect(mocks.push).toHaveBeenLastCalledWith(orgRoute('org-1'))
  })

  const agentConfig = (overrides: Record<string, unknown> = {}): any => ({
    agentDefinitionId: 'agent-1', agentDefinitionName: 'Agent One', runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-codex',
    llmConfig: { reasoning_effort: 'high', service_tier: 'fast' }, autoExecuteTools: false, isLocked: true,
    workspaceId: 'ws-a', workspaceMetadata: { workspaceId: 'ws-a', workspaceRootPath: '/work/a' }, ...overrides,
  })

  it('"+" on an Agent run copies the agent on screen: workspace, runtime, model, model config and approval', async () => {
    await useRunStart().copyAgentFromConfig(agentConfig())
    expect(mocks.chat.startForDefinition).toHaveBeenCalledWith({ kind: 'agent', agentDefinitionId: 'agent-1' }, {
      copied: {
        workspace: { kind: 'folder', rootPath: '/work/a' }, runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-codex',
        llmConfig: { reasoning_effort: 'high', service_tier: 'fast' }, autoExecuteTools: false,
      },
    })
    expect(mocks.push).toHaveBeenCalledWith('/chat')
  })

  it('CR-001: "+" on an `@` collaborator copies that collaborator (no run lookup); no workspace path → temp', async () => {
    // A task child's context lives in the run's collaboration package, never in agentContextsStore.
    await useRunStart().copyAgentFromConfig(agentConfig({
      agentDefinitionId: 'computer-use', runtimeKind: 'autobyteus', llmModelIdentifier: 'm', llmConfig: undefined,
      autoExecuteTools: true, workspaceId: null, workspaceMetadata: null,
    }))
    expect(mocks.chat.startForDefinition).toHaveBeenCalledWith({ kind: 'agent', agentDefinitionId: 'computer-use' }, {
      copied: { workspace: null, runtimeKind: 'autobyteus', llmModelIdentifier: 'm', llmConfig: null, autoExecuteTools: true },
    })
    expect(mocks.push).toHaveBeenCalledWith('/chat')
  })

  it('"+" on a Team run copies its settings and member overrides; a failed read opens the defaults; a late one opens nothing', async () => {
    mocks.seed.mockResolvedValueOnce({
      rootConfig: { runtimeKind: 'autobyteus', llmModelIdentifier: 'm', llmConfig: null, autoExecuteTools: true, workspace: { workspaceId: 'ws-1', workspaceMetadata: null } },
      agentOverrides: { '/writer': { llmConfig: { service_tier: 'fast' } } },
    })
    const start = useRunStart()
    await start.copyTeamRun({ teamRunId: 'team-run-1', teamDefinitionId: 'team-1' })
    expect(mocks.chat.startForDefinition).toHaveBeenLastCalledWith({ kind: 'team', teamDefinitionId: 'team-1' }, {
      copied: expect.objectContaining({ workspace: { kind: 'existing', workspaceId: 'ws-1' }, teamAgentOverrides: { '/writer': { llmConfig: { service_tier: 'fast' } } } }),
    })

    mocks.seed.mockRejectedValueOnce(new Error('offline'))
    await start.copyTeamRun({ teamRunId: 'team-run-1', teamDefinitionId: 'team-1' })
    expect(mocks.chat.startForDefinition).toHaveBeenLastCalledWith({ kind: 'team', teamDefinitionId: 'team-1' }, { copied: null })

    mocks.seed.mockResolvedValueOnce({ rootConfig: { workspace: {} }, agentOverrides: {} })
    mocks.push.mockClear()
    await start.copyTeamRun({ teamRunId: 'team-run-1', teamDefinitionId: 'team-1', isCurrent: () => false })
    expect(mocks.push).not.toHaveBeenCalled()
  })

  it('"+" on an Org run opens the Org launch page with the source run', async () => {
    await useRunStart().copyOrgRun('org-run-9', 'org-1')
    expect(mocks.org.start).toHaveBeenCalledWith({ orgDefinitionId: 'org-1', sourceOrgRunId: 'org-run-9', carried: null })
    expect(mocks.push).toHaveBeenCalledWith(orgRoute('org-1', 'org-run-9'))
  })

  it('the heading switcher retargets New chat in place, carries settings to and from the Org page (REQ-019)', async () => {
    const start = useRunStart()
    mocks.chat.draft = { id: 'chat-draft' }
    await start.switchTarget({ kind: 'team', definitionId: 'team-1' }, 'chat')
    expect(mocks.chat.retarget).toHaveBeenCalledWith({ kind: 'team', teamDefinitionId: 'team-1' })
    expect(mocks.push).not.toHaveBeenCalled()

    await start.switchTarget({ kind: 'org', definitionId: 'org-1' }, 'chat')
    expect(mocks.org.start).toHaveBeenCalledWith({ orgDefinitionId: 'org-1', sourceOrgRunId: null, carried: { carriedFrom: 'chat-draft' } })

    mocks.org.startSettings = { runtimeKind: 'autobyteus' }
    await start.switchTarget({ kind: 'agent', definitionId: 'agent-1' }, 'org')
    expect(mocks.chat.startForDefinition).toHaveBeenLastCalledWith({ kind: 'agent', agentDefinitionId: 'agent-1' }, { carried: { runtimeKind: 'autobyteus' } })
    expect(mocks.push).toHaveBeenLastCalledWith('/chat')
  })

  it('the workspace tree "+" opens New chat for the agent in that workspace with today’s New chat rule', async () => {
    await useRunStart().newChatInWorkspace({ agentDefinitionId: 'agent-1', workspaceRootPath: '/work/a' })
    expect(mocks.chat.startNewChat).toHaveBeenCalledWith({ agentDefinitionId: 'agent-1', workspaceRootPath: '/work/a' })
    expect(mocks.push).toHaveBeenCalledWith('/chat')
  })
})
