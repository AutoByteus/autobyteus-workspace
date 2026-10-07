import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import { AgentContext } from '~/types/agent/AgentContext'
import { AgentRunState } from '~/types/agent/AgentRunState'
import type { ChatDraft } from '~/stores/chatDraftStore'

const mocks = vi.hoisted(() => ({
  events: [] as string[],
  selection: { selectedType: null as string | null, selectedRunId: null as string | null },
  sendBehavior: 'promote' as 'promote' | 'fail',
  runtimeEnabled: true,
  disabledRuntimes: new Set<string>(),
  teams: [] as any[],
  createDraft: vi.fn(),
  setRuntimeModelCatalog: vi.fn(),
  removeDraft: vi.fn(),
  sendToFocusedMember: vi.fn(),
  resolveWorkspace: vi.fn(),
  showChat: vi.fn(),
}))

vi.mock('~/stores/chatDraftStore', () => ({
  useChatDraftStore: () => ({
    markStarting: (draft: ChatDraft) => { draft.starting = true; mocks.events.push('starting') },
    clearStarting: (draft: ChatDraft) => { draft.starting = false; mocks.events.push('clear-starting') },
    finishSentDraft: (draft: ChatDraft) => { mocks.events.push(`finish-draft:${draft.id}`) },
  }),
}))
vi.mock('~/stores/agentSelectionStore', () => ({
  useAgentSelectionStore: () => ({
    get selectedType() { return mocks.selection.selectedType },
    get selectedRunId() { return mocks.selection.selectedRunId },
    beginSelectionIntent: () => ({ isCurrent: () => true }),
    get selectedDraftId() { return mocks.selection.selectedType === 'team_draft' ? 'team-draft-1' : null },
    clearSelectionWithoutShellNavigation: () => { mocks.events.push('clear-selection'); mocks.selection.selectedType = null },
    selectTeamDraftWithoutShellNavigation: (id: string) => {
      mocks.events.push(`select-team-draft:${id}`)
      mocks.selection.selectedType = 'team_draft'
    },
  }),
}))
let registered: AgentContext | null = null
vi.mock('~/stores/agentContextsStore', () => ({
  useAgentContextsStore: () => ({
    registerDraftRun: (context: AgentContext) => {
      registered = context
      mocks.events.push(`register:${context.state.runId}`)
      mocks.selection.selectedType = 'agent'
      mocks.selection.selectedRunId = context.state.runId
    },
  }),
}))
vi.mock('~/stores/agentRunStore', () => ({
  useAgentRunStore: () => ({
    sendUserInputAndSubscribe: async () => {
      mocks.events.push('send')
      if (mocks.sendBehavior === 'promote' && registered) {
        registered.state.promoteTemporaryId('run-9')
        mocks.selection.selectedRunId = 'run-9'
      }
    },
  }),
}))
vi.mock('~/stores/agentDefinitionStore', () => ({
  useAgentDefinitionStore: () => ({
    agentDefinitions: [{ id: 'autobyteus-daily-assistant', name: 'Daily Assistant' }],
    getAgentDefinitionById: (id: string) => (id === 'autobyteus-daily-assistant' ? { id } : undefined),
  }),
}))
vi.mock('~/stores/agentTeamDefinitionStore', () => ({
  useAgentTeamDefinitionStore: () => ({ get agentTeamDefinitions() { return mocks.teams } }),
}))
vi.mock('~/stores/teamRunConfigStore', () => ({
  useTeamRunConfigStore: () => ({ createDraft: mocks.createDraft, setRuntimeModelCatalog: mocks.setRuntimeModelCatalog, removeDraft: mocks.removeDraft }),
}))
vi.mock('~/stores/llmProviderConfig', () => ({
  useLLMProviderConfigStore: () => ({
    fetchProvidersWithModels: vi.fn(async () => undefined),
    models: () => ['gpt-5.5-codex'],
    modelConfigSchemaByIdentifier: () => null,
  }),
}))
vi.mock('~/stores/agentTeamRunStore', () => ({
  useAgentTeamRunStore: () => ({ sendMessageToFocusedMember: mocks.sendToFocusedMember }),
}))
vi.mock('~/stores/runtimeAvailabilityStore', () => ({
  useRuntimeAvailabilityStore: () => ({ hasFetched: true, isRuntimeEnabled: (kind: string) => mocks.runtimeEnabled && !mocks.disabledRuntimes.has(kind) }),
}))
vi.mock('~/stores/workspace', () => ({
  useWorkspaceStore: () => ({ workspaces: {}, workspaceMetadataById: {} }),
}))
vi.mock('~/stores/workspaceCenterViewStore', () => ({
  useWorkspaceCenterViewStore: () => ({ showChat: mocks.showChat }),
}))
vi.mock('~/stores/runHistoryLoadActions', () => ({
  ensureRunHistoryWorkspaceByRootPath: (rootPath: string) => mocks.resolveWorkspace(rootPath),
  resolveRunHistoryWorkspaceMetadataByRootPath: async (rootPath: string) => ({
    workspaceId: 'ws-folder', workspaceRootPath: rootPath, displayName: 'folder', kind: 'filesystem',
  }),
}))

import { launchAgentChat, launchTeamChat, resolveChatLaunchReadiness } from '../chatLaunchService'
import { readChatLastModel } from '~/utils/chat/chatLastModelPreference'

const buildDraft = (overrides: Partial<ChatDraft> = {}): ChatDraft => {
  const context = new AgentContext({
    agentDefinitionId: 'autobyteus-daily-assistant',
    agentDefinitionName: 'Daily Assistant',
    llmModelIdentifier: 'gpt-5.5-codex',
    runtimeKind: 'codex_app_server',
    workspaceId: null,
    workspaceMetadata: null,
    autoExecuteTools: true,
    isLocked: false,
    llmConfig: { reasoning_effort: 'high' },
  }, new AgentRunState('temp-chat-1', {
    id: 'temp-chat-1', messages: [], createdAt: '', updatedAt: '', agentDefinitionId: 'autobyteus-daily-assistant',
  }))
  context.requirement = 'hello'
  return reactive({
    id: 'chat-draft-1',
    listed: true,
    context,
    target: { kind: 'agent', agentDefinitionId: 'autobyteus-daily-assistant' },
    workspace: { kind: 'folder', rootPath: '/Users/me/project' },
    autoExecuteTools: false,
    teamAgentOverrides: {},
    starting: false,
    sentText: null,
    ...overrides,
  }) as ChatDraft
}

describe('chatLaunchService', () => {
  beforeEach(() => {
    mocks.events = []
    mocks.selection = { selectedType: null, selectedRunId: null }
    mocks.sendBehavior = 'promote'
    mocks.runtimeEnabled = true
    mocks.disabledRuntimes = new Set()
    mocks.teams = []
    mocks.createDraft.mockReset().mockReturnValue('team-draft-1')
    mocks.setRuntimeModelCatalog.mockReset()
    mocks.sendToFocusedMember.mockReset().mockImplementation(async () => {
      mocks.events.push('team-send')
      mocks.selection.selectedType = 'team'
      mocks.selection.selectedRunId = 'team-run-1'
    })
    mocks.resolveWorkspace.mockReset().mockResolvedValue('ws-folder')
    registered = null
    window.localStorage.clear()
  })

  it('launches in order: starting → register → send → route to the promoted id → finish the sent draft', async () => {
    const draft = buildDraft()
    const navigate = vi.fn(async (route: unknown) => { mocks.events.push(`navigate:${JSON.stringify(route)}`) })

    const result = await launchAgentChat(draft, { navigate })

    expect(result).toEqual({ runId: 'run-9' })
    expect(mocks.events).toEqual([
      'starting',
      'register:temp-chat-1',
      'send',
      'navigate:{"path":"/chat","query":{"id":"run-9"}}',
      'finish-draft:chat-draft-1',
    ])
    expect(draft.context.config).toMatchObject({
      workspaceId: 'ws-folder',
      workspaceMetadata: { workspaceRootPath: '/Users/me/project' },
      autoExecuteTools: false,
    })
    expect(readChatLastModel()).toEqual({ runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-5.5-codex' })
  })

  it('launches an Antigravity chat and team chat with auto-approve on even when the draft stores it off', async () => {
    const agentDraft = buildDraft()
    agentDraft.context.config.runtimeKind = 'antigravity_cli'
    await launchAgentChat(agentDraft, { navigate: vi.fn(async () => undefined) })
    expect(agentDraft.context.config.autoExecuteTools).toBe(true)

    mocks.teams = [{ id: 'team-1', name: 'Product Review Team', coordinatorMemberName: 'lead', nodes: [], defaultLaunchConfig: null }]
    const teamDraft = buildDraft({ target: { kind: 'team', teamDefinitionId: 'team-1' } })
    teamDraft.context.config.runtimeKind = 'antigravity_cli'
    await launchTeamChat(teamDraft, { navigate: vi.fn(async () => undefined) })
    expect(mocks.createDraft.mock.calls[0]![0]).toMatchObject({ rootConfig: { runtimeKind: 'antigravity_cli', autoExecuteTools: true } })
  })

  it('lands a failed first send on the still-registered temp chat and does not record the model', async () => {
    mocks.sendBehavior = 'fail'
    const navigate = vi.fn(async () => undefined)

    const result = await launchAgentChat(buildDraft(), { navigate })

    expect(result).toEqual({ runId: 'temp-chat-1' })
    expect(navigate).toHaveBeenCalledWith({ path: '/chat', query: { id: 'temp-chat-1' } })
    expect(readChatLastModel()).toBeNull()
    // The message belongs to the registered run, which shows the error: the draft is finished.
    expect(mocks.events.at(-1)).toBe('finish-draft:chat-draft-1')
  })

  it('keeps the New chat intact when the workspace cannot be resolved', async () => {
    mocks.resolveWorkspace.mockResolvedValue(null)
    const draft = buildDraft()

    await expect(launchAgentChat(draft, { navigate: vi.fn() })).rejects.toThrow()
    expect(mocks.events).toEqual(['starting', 'clear-starting'])
    expect(registered).toBeNull()
    expect(draft.context.requirement).toBe('hello')
  })

  it('blocks launch with a reason when the runtime is unavailable or no model is chosen', () => {
    mocks.runtimeEnabled = false
    expect(resolveChatLaunchReadiness(buildDraft())).toMatchObject({ ready: false })
    mocks.runtimeEnabled = true
    const noModel = buildDraft()
    noModel.context.config.llmModelIdentifier = ''
    expect(resolveChatLaunchReadiness(noModel)).toMatchObject({ ready: false })
    expect(resolveChatLaunchReadiness(buildDraft())).toEqual({ ready: true })
  })

  it('DI-004: a Team is checked over every member, in AC-002 order (team → runtime → model)', () => {
    const team = { id: 'team-1', name: 'Writers', coordinatorMemberName: 'lead', nodes: [{ memberName: 'lead', ref: 'a' }, { memberName: 'writer', ref: 'b' }], defaultLaunchConfig: null }
    const teamDraft = (overrides: Partial<ChatDraft> = {}) => buildDraft({ target: { kind: 'team', teamDefinitionId: 'team-1' }, ...overrides })

    expect(resolveChatLaunchReadiness(teamDraft())).toEqual({ ready: false, reason: expect.stringMatching(/team/i) })
    mocks.teams = [team]
    expect(resolveChatLaunchReadiness(teamDraft())).toEqual({ ready: true })

    // A member customized to a runtime that is now disabled blocks the launch (e.g. a Team "+" copy).
    mocks.disabledRuntimes = new Set(['claude_agent_sdk'])
    const memberOff = teamDraft({ teamAgentOverrides: { '/writer': { runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'opus' } } as any })
    const runtimeReason = resolveChatLaunchReadiness(memberOff)
    expect(runtimeReason).toMatchObject({ ready: false })
    expect((runtimeReason as { reason: string }).reason).toContain('Claude')

    // The runtime reason comes before the model reason.
    memberOff.context.config.llmModelIdentifier = ''
    expect(resolveChatLaunchReadiness(memberOff)).toEqual(runtimeReason)
    mocks.disabledRuntimes = new Set()
    expect(resolveChatLaunchReadiness(memberOff)).toMatchObject({ ready: false })
    expect(resolveChatLaunchReadiness(memberOff)).not.toEqual(runtimeReason)
  })

  it('launches a team with one root config for all members, focused on the coordinator, and opens the Team view', async () => {
    mocks.teams = [{ id: 'team-1', name: 'Product Review Team', coordinatorMemberName: 'lead', nodes: [], defaultLaunchConfig: null }]
    const draft = buildDraft({ target: { kind: 'team', teamDefinitionId: 'team-1' } })
    draft.context.contextFilePaths = [{ id: 'a', kind: 'draft_upload', locator: 'x', type: 'Text' } as any]
    const navigate = vi.fn(async (route: unknown) => { mocks.events.push(`navigate:${String(route)}`) })

    await launchTeamChat(draft, { navigate })

    const [config, focus] = mocks.createDraft.mock.calls[0]!
    expect(config).toMatchObject({
      teamDefinitionId: 'team-1',
      rootConfig: {
        runtimeKind: 'codex_app_server',
        llmModelIdentifier: 'gpt-5.5-codex',
        llmConfig: { reasoning_effort: 'high' },
        autoExecuteTools: false,
        workspace: { workspaceId: 'ws-folder' },
      },
      teamOverrides: {},
      agentOverrides: {},
    })
    expect(String(focus)).toContain('lead')
    expect(mocks.setRuntimeModelCatalog).toHaveBeenCalledWith('codex_app_server', ['gpt-5.5-codex'])
    expect(mocks.sendToFocusedMember).toHaveBeenCalledWith('hello', draft.context.contextFilePaths, {
      attachmentDraftOwner: { kind: 'agent_draft', draftRunId: 'temp-chat-1' },
      mentions: [],
    })
    expect(mocks.events).toEqual(['starting', 'select-team-draft:team-draft-1', 'team-send', 'navigate:/workspace', 'finish-draft:chat-draft-1'])
    // The Team view opens on the conversation, not on settings left open for another run (CR-005).
    expect(mocks.showChat).toHaveBeenCalled()
  })

  it('launches customized members with their own settings, loads every member runtime and keeps the first message’s mentions', async () => {
    mocks.teams = [{ id: 'team-1', name: 'T', coordinatorMemberName: 'lead', nodes: [], defaultLaunchConfig: null }]
    const draft = buildDraft({
      target: { kind: 'team', teamDefinitionId: 'team-1' },
      teamAgentOverrides: {
        '/writer': { runtimeKind: 'autobyteus', llmModelIdentifier: 'gpt-5.5', llmConfig: null },
        '/reviewer': { llmConfig: { reasoning_effort: 'high', service_tier: 'fast' } },
      },
    })
    draft.context.requirement = '@Researcher please help'
    draft.context.requestedMentions = [
      { kind: 'agent', definitionId: 'researcher', name: 'Researcher' },
      { kind: 'agent', definitionId: 'removed', name: 'Removed' },
    ]

    await launchTeamChat(draft, { navigate: vi.fn(async () => undefined) })

    expect(mocks.createDraft.mock.calls[0]![0].agentOverrides).toEqual({
      '/writer': { runtimeKind: 'autobyteus', llmModelIdentifier: 'gpt-5.5', llmConfig: null },
      '/reviewer': { llmConfig: { reasoning_effort: 'high', service_tier: 'fast' } },
    })
    expect(mocks.setRuntimeModelCatalog.mock.calls.map(([runtimeKind]) => runtimeKind).sort()).toEqual(['autobyteus', 'codex_app_server'])
    expect(mocks.sendToFocusedMember.mock.calls[0]![2].mentions).toEqual([{ kind: 'agent', definitionId: 'researcher', name: 'Researcher' }])
  })

  it('stays on New chat when the team launch throws before any message is recorded', async () => {
    mocks.teams = [{ id: 'team-1', name: 'T', coordinatorMemberName: 'lead', nodes: [], defaultLaunchConfig: null }]
    mocks.sendToFocusedMember.mockRejectedValue(new Error('launch failed'))
    const navigate = vi.fn()

    await expect(launchTeamChat(buildDraft({ target: { kind: 'team', teamDefinitionId: 'team-1' } }), { navigate }))
      .rejects.toThrow('launch failed')
    expect(navigate).not.toHaveBeenCalled()
    expect(mocks.events).toContain('clear-starting')
    expect(mocks.removeDraft).toHaveBeenCalledWith('team-draft-1')
    expect(mocks.events).toContain('clear-selection')
    // REQ-006: a failed send keeps the draft and its row.
    expect(mocks.events.some((event) => event.startsWith('finish-draft'))).toBe(false)
  })
})
