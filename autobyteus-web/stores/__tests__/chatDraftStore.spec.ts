import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  definitions: [] as Array<{ id: string; name: string; avatarUrl?: string | null; defaultLaunchConfig?: unknown; ownershipScope?: string }>,
  teams: [] as Array<{ id: string; name: string; coordinatorMemberName: string; nodes: Array<{ memberName: string; ref: string; refScope?: string }>; defaultLaunchConfig?: unknown }>,
  enabledRuntimes: new Set<string>(['autobyteus', 'codex_app_server']),
  modelsByRuntime: {} as Record<string, string[]>,
  workspacesByRoot: {} as Record<string, { workspaceId: string }>,
  schemas: {} as Record<string, unknown>,
  fetchAvailability: vi.fn(async () => []),
  fetchModels: vi.fn(async (_runtimeKind: string) => undefined),
}))

vi.mock('~/stores/agentDefinitionStore', () => ({
  useAgentDefinitionStore: () => ({
    get agentDefinitions() { return mocks.definitions },
    fetchAllAgentDefinitions: vi.fn(async () => undefined),
    getAgentDefinitionById: (id: string) => mocks.definitions.find((definition) => definition.id === id),
  }),
}))
vi.mock('~/stores/agentTeamDefinitionStore', () => ({
  useAgentTeamDefinitionStore: () => ({
    get agentTeamDefinitions() { return mocks.teams },
    fetchAllAgentTeamDefinitions: vi.fn(async () => undefined),
  }),
}))
vi.mock('~/stores/workspace', () => ({
  useWorkspaceStore: () => ({
    tempWorkspaceId: 'temp_ws_default',
    findWorkspaceInfoByRootPath: (rootPath: string) => mocks.workspacesByRoot[rootPath] ?? null,
  }),
}))
vi.mock('~/stores/runtimeAvailabilityStore', () => ({
  useRuntimeAvailabilityStore: () => ({
    fetchRuntimeAvailabilities: mocks.fetchAvailability,
    isRuntimeEnabled: (runtimeKind: string) => mocks.enabledRuntimes.has(runtimeKind),
  }),
}))
vi.mock('~/stores/llmProviderConfig', () => ({
  useLLMProviderConfigStore: () => ({
    fetchProvidersWithModels: mocks.fetchModels,
    models: (runtimeKind: string) => mocks.modelsByRuntime[runtimeKind] ?? [],
    modelConfigSchemaByIdentifier: (runtimeKind: string, id: string) => mocks.schemas[`${runtimeKind}/${id}`] ?? null,
  }),
}))

import { chatDraftHasText, useChatDraftStore, type ChatDraft } from '../chatDraftStore'
import { useAgentContextsStore } from '../agentContextsStore'
import { writeChatLastModel } from '~/utils/chat/chatLastModelPreference'
import { applyModelConfigSchemaDefaults } from '~/utils/llmConfigSchema'

describe('chatDraftStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    window.localStorage.clear()
    mocks.definitions = [
      { id: 'autobyteus-daily-assistant', name: 'Daily Assistant', defaultLaunchConfig: null },
      { id: 'codex', name: 'Codex', avatarUrl: '/codex.png' },
    ]
    mocks.enabledRuntimes = new Set(['autobyteus', 'codex_app_server'])
    mocks.modelsByRuntime = { autobyteus: ['gpt-5.5', 'claude-sonnet-5'], codex_app_server: ['gpt-5.5-codex'] }
    mocks.workspacesByRoot = {}
    mocks.schemas = {}
    mocks.teams = [{
      id: 'team-1', name: 'Writers', coordinatorMemberName: 'lead',
      nodes: [{ memberName: 'lead', ref: 'codex', refScope: 'SHARED' }, { memberName: 'writer', ref: 'writer-agent', refScope: 'SHARED' }],
    }]
  })

  it('starts an unregistered Daily Assistant draft in the temp workspace with Auto-approve', async () => {
    const store = useChatDraftStore()
    const draft = store.startNewChat()
    await flushPromises()

    expect(draft.context.state.runId.startsWith('temp-')).toBe(true)
    expect(draft.target).toEqual({ kind: 'agent', agentDefinitionId: 'autobyteus-daily-assistant' })
    expect(draft.workspace).toEqual({ kind: 'existing', workspaceId: 'temp_ws_default' })
    expect(draft.autoExecuteTools).toBe(true)
    // No tree row exists before send.
    expect(useAgentContextsStore().runs.size).toBe(0)
  })

  it('preselects the last-used runtime + model when its runtime is enabled and the model exists', async () => {
    writeChatLastModel({ runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-5.5-codex' })
    const draft = useChatDraftStore().startNewChat()
    await flushPromises()

    expect(draft.context.config.runtimeKind).toBe('codex_app_server')
    expect(draft.context.config.llmModelIdentifier).toBe('gpt-5.5-codex')
  })

  it('falls back to the Daily Assistant default launch config, then to the runtime default', async () => {
    writeChatLastModel({ runtimeKind: 'grok_build', llmModelIdentifier: 'grok-9' })
    mocks.definitions[0]!.defaultLaunchConfig = { runtimeKind: 'autobyteus', llmModelIdentifier: 'claude-sonnet-5', llmConfig: null }
    const withDefault = useChatDraftStore().startNewChat()
    await flushPromises()
    expect(withDefault.context.config.llmModelIdentifier).toBe('claude-sonnet-5')

    mocks.definitions[0]!.defaultLaunchConfig = null
    const withRuntimeDefault = useChatDraftStore().startNewChat()
    await flushPromises()
    expect(withRuntimeDefault.context.config.runtimeKind).toBe('autobyteus')
    expect(withRuntimeDefault.context.config.llmModelIdentifier).toBe('gpt-5.5')
  })

  it('never lets a late default resolution override an explicit model choice', async () => {
    const store = useChatDraftStore()
    const draft = store.startNewChat()
    store.setModel({ runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-5.5-codex' })
    await flushPromises()

    expect(draft.context.config.runtimeKind).toBe('codex_app_server')
    expect(draft.context.config.llmModelIdentifier).toBe('gpt-5.5-codex')
    expect(draft.context.config.llmConfig).toBeNull()
  })

  it('presets the agent and workspace from the tree +, matching an existing workspace by root path', () => {
    mocks.workspacesByRoot['/ws/a'] = { workspaceId: 'ws-a' }
    const store = useChatDraftStore()

    expect(store.startNewChat({ agentDefinitionId: 'codex', workspaceRootPath: '/ws/a' })).toMatchObject({
      target: { kind: 'agent', agentDefinitionId: 'codex' },
      workspace: { kind: 'existing', workspaceId: 'ws-a' },
    })
    expect(store.startNewChat({ agentDefinitionId: 'codex', workspaceRootPath: '/ws/new' }).workspace)
      .toEqual({ kind: 'folder', rootPath: '/ws/new' })
  })

  it('re-addresses the draft: both definition ids change; text, files, id, workspace, approval and model are kept; tags are cleared', () => {
    const store = useChatDraftStore()
    const draft = store.startNewChat()
    const runId = draft.context.state.runId
    draft.context.requirement = 'hello'
    draft.context.contextFilePaths = [{ path: '/tmp/a.txt', type: 'Text' } as any]
    draft.context.requestedSkillNames = ['writer']
    draft.context.config.llmModelIdentifier = 'gpt-5.5'
    store.setAutoExecuteTools(false)

    store.retarget({ kind: 'agent', agentDefinitionId: 'codex' })

    const current = store.draft!
    expect(current.context.state.runId).toBe(runId)
    expect(current.context.config.agentDefinitionId).toBe('codex')
    expect(current.context.config.agentDefinitionName).toBe('Codex')
    expect(current.context.state.conversation.agentDefinitionId).toBe('codex')
    expect(current.context.requirement).toBe('hello')
    expect(current.context.contextFilePaths).toHaveLength(1)
    expect(current.context.requestedSkillNames).toEqual([])
    expect(current.context.config.llmModelIdentifier).toBe('gpt-5.5')
    expect(current.autoExecuteTools).toBe(false)

    current.context.requestedSkillNames = ['writer']
    store.retarget({ kind: 'team', teamDefinitionId: 'team-1' })
    expect(store.draft!.target).toEqual({ kind: 'team', teamDefinitionId: 'team-1' })
    expect(store.draft!.context.requestedSkillNames).toEqual([])
  })

  describe('Run, "+" and the heading switcher (REQ-013/019/021)', () => {
    it('opens a definition with its default launch config when its model is available', async () => {
      mocks.definitions.push({ id: 'researcher', name: 'Researcher',
        defaultLaunchConfig: { runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-5.5-codex', llmConfig: null } })
      writeChatLastModel({ runtimeKind: 'autobyteus', llmModelIdentifier: 'claude-sonnet-5' })
      const draft = useChatDraftStore().startForDefinition({ kind: 'agent', agentDefinitionId: 'researcher' })
      await flushPromises()

      expect(draft.context.config.agentDefinitionId).toBe('researcher')
      expect(draft.context.config.runtimeKind).toBe('codex_app_server')
      expect(draft.context.config.llmModelIdentifier).toBe('gpt-5.5-codex')
      expect(draft.workspace).toEqual({ kind: 'existing', workspaceId: 'temp_ws_default' })
      expect(draft.autoExecuteTools).toBe(true)
    })

    it('falls back to the last chat model, then the default runtime’s first model, never an empty model', async () => {
      mocks.definitions.push({ id: 'researcher', name: 'Researcher',
        defaultLaunchConfig: { runtimeKind: 'codex_app_server', llmModelIdentifier: 'retired-model' } })
      writeChatLastModel({ runtimeKind: 'autobyteus', llmModelIdentifier: 'claude-sonnet-5' })
      const first = useChatDraftStore().startForDefinition({ kind: 'agent', agentDefinitionId: 'researcher' })
      await flushPromises()
      expect(first.context.config.llmModelIdentifier).toBe('claude-sonnet-5')

      window.localStorage.clear()
      const second = useChatDraftStore().startForDefinition({ kind: 'team', teamDefinitionId: 'team-1' })
      await flushPromises()
      expect(second.context.config.runtimeKind).toBe('autobyteus')
      expect(second.context.config.llmModelIdentifier).toBe('gpt-5.5')
    })

    it('uses copied settings as they are, including a Team run’s member overrides', async () => {
      const draft = useChatDraftStore().startForDefinition({ kind: 'team', teamDefinitionId: 'team-1' }, {
        copied: {
          workspace: { kind: 'folder', rootPath: '/ws/x' },
          runtimeKind: 'codex_app_server',
          llmModelIdentifier: 'gpt-5.5-codex',
          llmConfig: { reasoning_effort: 'high', service_tier: 'fast' },
          autoExecuteTools: false,
          teamAgentOverrides: { '/writer': { llmModelIdentifier: 'gpt-5.5', runtimeKind: 'autobyteus', llmConfig: null } },
        },
      })
      await flushPromises()

      expect(draft.workspace).toEqual({ kind: 'folder', rootPath: '/ws/x' })
      expect(draft.context.config.llmModelIdentifier).toBe('gpt-5.5-codex')
      expect(draft.context.config.llmConfig).toEqual({ reasoning_effort: 'high', service_tier: 'fast' })
      expect(draft.autoExecuteTools).toBe(false)
      expect(draft.teamAgentOverrides['/writer']).toMatchObject({ llmModelIdentifier: 'gpt-5.5' })
    })

    it('CR-004: a copied Team start loads availability and the root’s and members’ catalogs, keeping its values', async () => {
      mocks.fetchAvailability.mockClear()
      mocks.fetchModels.mockClear()
      const draft = useChatDraftStore().startForDefinition({ kind: 'team', teamDefinitionId: 'team-1' }, {
        copied: {
          workspace: null, runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-5.5-codex',
          llmConfig: { reasoning_effort: 'low', service_tier: 'fast' }, autoExecuteTools: true,
          teamAgentOverrides: {
            '/writer': { runtimeKind: 'autobyteus', llmModelIdentifier: 'gpt-5.5', llmConfig: null },
            '/lead': { runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'opus', llmConfig: null },
          },
        },
      })
      await flushPromises()

      expect(mocks.fetchAvailability).toHaveBeenCalled()
      expect(mocks.fetchModels.mock.calls.map(([runtimeKind]) => runtimeKind).sort()).toEqual(['autobyteus', 'codex_app_server'])
      // A disabled runtime's catalog is not fetched; its values are kept for the readiness rule to report.
      expect(draft.teamAgentOverrides['/lead']).toMatchObject({ runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'opus' })
      expect(draft.context.config).toMatchObject({ runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-5.5-codex' })
      expect(draft.context.config.llmConfig).toEqual({ reasoning_effort: 'low', service_tier: 'fast' })
    })

    it('CR-004: a carried (switcher) Agent start loads its runtime’s catalog too', async () => {
      mocks.fetchAvailability.mockClear()
      mocks.fetchModels.mockClear()
      useChatDraftStore().startForDefinition({ kind: 'agent', agentDefinitionId: 'autobyteus-daily-assistant' }, {
        carried: { workspace: null, runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-5.5-codex', llmConfig: null, autoExecuteTools: true },
      })
      await flushPromises()
      expect(mocks.fetchAvailability).toHaveBeenCalled()
      expect(mocks.fetchModels).toHaveBeenCalledWith('codex_app_server')
    })

    it('retargeting keeps text and settings but resets member overrides', () => {
      const store = useChatDraftStore()
      const draft = store.startForDefinition({ kind: 'team', teamDefinitionId: 'team-1' }, {
        carried: { workspace: null, runtimeKind: 'autobyteus', llmModelIdentifier: 'gpt-5.5', llmConfig: null, autoExecuteTools: true },
      })
      draft.context.requirement = 'draft text'
      store.changeTeamMember('/writer', { field: 'approval', value: false })
      expect(store.draft!.teamAgentOverrides).toEqual({ '/writer': { autoExecuteTools: false } })

      store.retarget({ kind: 'agent', agentDefinitionId: 'codex' })
      expect(store.draft!.context.requirement).toBe('draft text')
      expect(store.draft!.context.config.llmModelIdentifier).toBe('gpt-5.5')
      expect(store.draft!.teamAgentOverrides).toEqual({})
    })

    it('keeps a chosen mention the new Team target places, and drops one that becomes the target itself (its text stays)', () => {
      mocks.definitions.push({ id: 'writer-agent', name: 'Writer', ownershipScope: 'SHARED' })
      const store = useChatDraftStore()
      const draft = store.startForDefinition({ kind: 'agent', agentDefinitionId: 'codex' }, {
        carried: { workspace: null, runtimeKind: 'autobyteus', llmModelIdentifier: 'gpt-5.5', llmConfig: null, autoExecuteTools: true },
      })
      draft.context.requirement = '@Writer please'
      const writer = { kind: 'agent' as const, definitionId: 'writer-agent', name: 'Writer' }
      draft.context.requestedMentions = [writer]

      // A member of the Team being launched can be mentioned (REQ-005).
      store.retarget({ kind: 'team', teamDefinitionId: 'team-1' })
      expect(store.draft!.context.requestedMentions).toEqual([writer])
      // The target's own definition never can.
      store.retarget({ kind: 'agent', agentDefinitionId: 'writer-agent' })
      expect(store.draft!.context.requestedMentions).toEqual([])
      expect(store.draft!.context.requirement).toBe('@Writer please')
    })
  })

  describe('Team member overrides (REQ-009, REQ-022)', () => {
    const codexSchema = {
      reasoning_effort: { type: 'string', enum: ['low', 'medium', 'high'], default: 'medium' },
      service_tier: { type: 'string', enum: ['fast'], title: 'Fast mode' },
    }
    const startTeam = () => {
      mocks.schemas = { 'codex_app_server/gpt-5.5-codex': codexSchema }
      return useChatDraftStore().startForDefinition({ kind: 'team', teamDefinitionId: 'team-1' }, {
        carried: { workspace: null, runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-5.5-codex',
          llmConfig: { reasoning_effort: 'medium' }, autoExecuteTools: true },
      })
    }

    it('stores only what differs and follows the parent again when it matches', () => {
      const store = useChatDraftStore()
      startTeam()
      store.changeTeamMember('/writer', { field: 'thinking', llmConfig: { reasoning_effort: 'medium', service_tier: 'fast' } })
      expect(store.draft!.teamAgentOverrides['/writer']).toEqual({ llmConfig: { reasoning_effort: 'medium', service_tier: 'fast' } })

      store.changeTeamMember('/writer', { field: 'thinking', llmConfig: { reasoning_effort: 'medium' } })
      expect(store.draft!.teamAgentOverrides).toEqual({})
    })

    it('resets thinking without losing the member’s own Fast mode, and each on its own', () => {
      const store = useChatDraftStore()
      startTeam()
      store.changeTeamMember('/writer', { field: 'thinking', llmConfig: { reasoning_effort: 'high', service_tier: 'fast' } })
      store.resetTeamMember('/writer', { field: 'thinking' })
      expect(store.draft!.teamAgentOverrides['/writer']).toEqual({ llmConfig: { reasoning_effort: 'medium', service_tier: 'fast' } })
      store.resetTeamMember('/writer', { field: 'option', key: 'service_tier' })
      expect(store.draft!.teamAgentOverrides).toEqual({})
    })

    it('a member’s own model carries that model’s default config; Reset all clears every member', () => {
      const store = useChatDraftStore()
      startTeam()
      store.changeTeamMember('/writer', { field: 'model', choice: { runtimeKind: 'autobyteus', llmModelIdentifier: 'gpt-5.5' } })
      expect(store.draft!.teamAgentOverrides['/writer']).toEqual({ runtimeKind: 'autobyteus', llmModelIdentifier: 'gpt-5.5', llmConfig: null })
      store.resetTeamMembers()
      expect(store.draft!.teamAgentOverrides).toEqual({})
    })
  })

  describe('explicit model config (D-18, IC-3)', () => {
    const codexSchema = { reasoning_effort: { type: 'string', enum: ['low', 'medium', 'high'], default: 'medium' } }
    const claudeSchema = {
      temperature: { type: 'number', default: 0.7 },
      max_tokens: { type: 'integer' },
      thinking_enabled: { type: 'boolean', default: false },
      thinking_budget_tokens: { type: 'integer', default: 1024 },
    }

    it('records a thinking-only schema’s default thinking explicitly, never null or {}', async () => {
      mocks.schemas['codex_app_server/gpt-5.5-codex'] = codexSchema
      const store = useChatDraftStore()
      const draft = store.startNewChat()
      store.setModel({ runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-5.5-codex' })
      await flushPromises()
      expect(draft.context.config.llmConfig).toEqual({ reasoning_effort: 'medium' })
    })

    it('records the launch form’s non-thinking defaults plus the schema’s default thinking', async () => {
      mocks.schemas['autobyteus/claude-sonnet-5'] = claudeSchema
      const store = useChatDraftStore()
      const draft = store.startNewChat()
      store.setModel({ runtimeKind: 'autobyteus', llmModelIdentifier: 'claude-sonnet-5' })
      await flushPromises()

      const recorded = draft.context.config.llmConfig!
      const launchForm = applyModelConfigSchemaDefaults(claudeSchema as any, null)!
      // Non-thinking keys equal the launch form; thinking keys equal the schema defaults.
      expect({ temperature: recorded.temperature }).toEqual(launchForm)
      expect(recorded.thinking_enabled).toBe(false)
      expect(recorded).not.toHaveProperty('thinking_budget_tokens')
    })

    it('records the default resolution’s model config too, keeping a preset’s own thinking', async () => {
      mocks.schemas['autobyteus/claude-sonnet-5'] = claudeSchema
      mocks.definitions[0]!.defaultLaunchConfig = { runtimeKind: 'autobyteus', llmModelIdentifier: 'claude-sonnet-5',
        llmConfig: { thinking_enabled: true, thinking_budget_tokens: 4096 } }
      const draft = useChatDraftStore().startNewChat()
      await flushPromises()
      expect(draft.context.config.llmConfig).toEqual({ temperature: 0.7, thinking_enabled: true, thinking_budget_tokens: 4096 })
    })

    it('keeps null for a model without a config schema', async () => {
      const store = useChatDraftStore()
      const draft = store.startNewChat()
      store.setModel({ runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-5.5-codex' })
      await flushPromises()
      expect(draft.context.config.llmConfig).toBeNull()
    })
  })

  describe('Draft collection (chat-new-draft-kept-on-navigation)', () => {
    const type = (draft: ChatDraft, text: string) => { draft.context.requirement = text }
    const ids = () => useChatDraftStore().drafts.map((draft) => draft.id)
    const image = () => [{ path: '/tmp/a.png', type: 'Image' } as any]

    it('counts typed text only: a lone /command, blanks, attachments and skills are not text (REQ-001)', () => {
      const draft = useChatDraftStore().startNewChat()
      for (const [text, expected] of [['/rev', false], ['  ', false], ['', false], ['/review this', true], ['hi', true]] as const) {
        type(draft, text)
        expect(chatDraftHasText(draft)).toBe(expected)
      }
      type(draft, '')
      draft.context.contextFilePaths = image()
      draft.context.requestedSkillNames = ['writer']
      expect(chatDraftHasText(draft)).toBe(false)
    })

    it('lists a draft at its first text and keeps it when any start opens a fresh one (REQ-004/005)', () => {
      const store = useChatDraftStore()
      const first = store.startNewChat()
      expect(first.listed).toBe(false)
      type(first, 'copy the details from the other run')
      expect(store.draft!.listed).toBe(true)

      const second = store.startForDefinition({ kind: 'team', teamDefinitionId: 'team-1' })
      expect(store.openDraftId).toBe(second.id)
      expect(ids()).toEqual([first.id, second.id])

      // A New chat without text (only an attachment) is not kept when another chat starts.
      store.draft!.context.contextFilePaths = image()
      const third = store.startNewChat({ agentDefinitionId: 'codex' })
      expect(ids()).toEqual([first.id, third.id])
      // The draft id is its own, not the context's temp run id (which changes on send).
      expect(first.id).not.toBe(first.context.state.runId)
    })

    it('re-enters a kept draft exactly as left and drops the textless New chat it leaves (REQ-003)', async () => {
      const store = useChatDraftStore()
      const kept = store.startForDefinition({ kind: 'team', teamDefinitionId: 'team-1' }, {
        carried: { workspace: { kind: 'folder', rootPath: '/ws/x' }, runtimeKind: 'codex_app_server',
          llmModelIdentifier: 'gpt-5.5-codex', llmConfig: { reasoning_effort: 'high' }, autoExecuteTools: false },
      })
      type(kept, 'review this')
      kept.context.contextFilePaths = image()
      store.changeTeamMember('/writer', { field: 'approval', value: true })
      const blank = store.startNewChat()
      await flushPromises()

      store.openDraft(kept.id)

      expect(store.draft).toStrictEqual(kept)
      expect(ids()).toEqual([kept.id])
      expect(blank.id).not.toBe(kept.id)
      expect(store.draft).toMatchObject({
        target: { kind: 'team', teamDefinitionId: 'team-1' },
        workspace: { kind: 'folder', rootPath: '/ws/x' },
        autoExecuteTools: false,
        teamAgentOverrides: { '/writer': { autoExecuteTools: true } },
      })
      expect(store.draft!.context.requirement).toBe('review this')
      expect(store.draft!.context.contextFilePaths).toHaveLength(1)
      expect(store.draft!.context.config).toMatchObject({ llmModelIdentifier: 'gpt-5.5-codex', llmConfig: { reasoning_effort: 'high' } })

      // Unknown or already open: nothing changes.
      store.openDraft('chat-draft-unknown')
      store.openDraft(kept.id)
      expect(store.openDraftId).toBe(kept.id)
      expect(ids()).toEqual([kept.id])
    })

    it('keeps a cleared open draft listed until it is left, then drops it (REQ-008)', () => {
      const store = useChatDraftStore()
      const draft = store.startNewChat()
      type(draft, 'hello')
      type(draft, '')
      expect(store.drafts).toHaveLength(1)
      expect(store.draft!.listed).toBe(true)

      store.startNewChat()
      expect(ids()).not.toContain(draft.id)
    })

    it('discards a draft without confirmation; the open one leaves a blank New chat (REQ-007)', () => {
      const store = useChatDraftStore()
      const listed = store.startNewChat()
      type(listed, 'listed')
      const open = store.startNewChat()
      type(open, 'open')

      store.discardDraft(listed.id)
      expect(ids()).toEqual([open.id])
      expect(store.openDraftId).toBe(open.id)

      store.discardDraft(open.id)
      expect(store.drafts).toHaveLength(1)
      expect(store.draft!.id).not.toBe(open.id)
      expect(store.draft!.context.requirement).toBe('')
      expect(store.draft!.target).toEqual({ kind: 'agent', agentDefinitionId: 'autobyteus-daily-assistant' })
    })

    it('never discards or drops a draft while it is being sent', () => {
      const store = useChatDraftStore()
      const sending = store.startNewChat()
      sending.context.contextFilePaths = image()
      store.markStarting(sending)

      store.discardDraft(sending.id)
      expect(ids()).toEqual([sending.id])
      store.startNewChat()
      expect(ids()).toContain(sending.id)
    })

    it('finishes a sent draft: its row goes; a fresh New chat opens only if it was still open (REQ-006)', () => {
      const store = useChatDraftStore()
      const other = store.startNewChat()
      type(other, 'other')
      const sent = store.startNewChat()
      type(sent, 'send me')
      store.markStarting(sent)

      // The user opens another draft while the send is in flight; it stays open.
      store.openDraft(other.id)
      store.finishSentDraft(sent)
      expect(ids()).toEqual([other.id])
      expect(store.openDraftId).toBe(other.id)

      store.finishSentDraft(other)
      expect(store.drafts).toHaveLength(1)
      expect(store.draft!.id).not.toBe(other.id)
    })

    it('keeps resolving a kept draft’s default model after another chat starts', async () => {
      mocks.definitions[0]!.defaultLaunchConfig = { runtimeKind: 'autobyteus', llmModelIdentifier: 'claude-sonnet-5', llmConfig: null }
      const store = useChatDraftStore()
      const kept = store.startNewChat()
      type(kept, 'keep me')
      store.startForDefinition({ kind: 'agent', agentDefinitionId: 'codex' })
      await flushPromises()

      expect(kept.context.config.llmModelIdentifier).toBe('claude-sonnet-5')
    })

    it('stores nothing outside the session (REQ-011)', () => {
      const store = useChatDraftStore()
      type(store.startNewChat(), 'session only')
      store.startNewChat()
      expect(window.localStorage.length).toBe(0)
      setActivePinia(createPinia())
      expect(useChatDraftStore().drafts).toEqual([])
    })
  })
})
