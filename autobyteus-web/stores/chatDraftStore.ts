import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { AgentContext } from '~/types/agent/AgentContext'
import { AgentRunState } from '~/types/agent/AgentRunState'
import { DEFAULT_AGENT_RUNTIME_KIND, type AgentRunConfig } from '~/types/agent/AgentRunConfig'
import type { AgentTeamAddress } from '~/types/agent/AgentTeamAddress'
import type { AgentConfigOverride } from '~/types/agent/TeamRunConfig'
import type { Conversation } from '~/types/conversation'
import type { RunWorkspaceChoice } from '~/types/runSettings/RunWorkspaceChoice'
import type { RunMemberSettingChange, RunMemberSettingReset, RunSettingsValues } from '~/types/runSettings/RunSettings'
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore'
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore'
import { useWorkspaceStore } from '~/stores/workspace'
import { useLLMProviderConfigStore } from '~/stores/llmProviderConfig'
import { normalizeDefaultLaunchConfig } from '~/types/launch/defaultLaunchConfig'
import { readChatLastModel } from '~/utils/chat/chatLastModelPreference'
import { DEFAULT_CHAT_AGENT_DEFINITION_ID, TEMP_WORKSPACE_ID } from '~/utils/chat/chatDefaults'
import { applyModelConfigSchemaDefaults, type UiModelConfigSchema } from '~/utils/llmConfigSchema'
import { getDefaultThinkingConfig, getThinkingParamKeys } from '~/utils/llmThinkingConfigAdapter'
import { runWorkspaceChoiceFromRootPath } from '~/services/workspace/runWorkspaceChoice'
import { startModelCatalog } from '~/services/runSettings/startModelCatalog'
import { resolveStartModel } from '~/utils/runSettings/startModelDefaults'
import { editMemberOverride, resetMemberOverride, type MemberOverrideDeps } from '~/utils/runSettings/memberOverrides'
import { draftMentionCandidates } from '~/utils/collaborators/draftMentionEligibility'
import { normalizeModelConfig } from '~/utils/teamRunConfigUtils'

/** Who a New chat is addressed to. Agent Orgs are never chat targets (they start on the Org launch page). */
export type ChatTarget =
  | Readonly<{ kind: 'agent'; agentDefinitionId: string }>
  | Readonly<{ kind: 'team'; teamDefinitionId: string }>

export interface ChatDraft {
  /** The unregistered `temp-*` context: text, tags, mentions, attachments, runtime, model and model config. */
  context: AgentContext
  target: ChatTarget
  workspace: RunWorkspaceChoice
  autoExecuteTools: boolean
  /** Team target only: each customized member's own settings, by member address (REQ-009). */
  teamAgentOverrides: Record<AgentTeamAddress, AgentConfigOverride>
  /** Set while the first send is in flight; the New chat page renders the starting state from it. */
  starting: boolean
}

export interface ChatModelSelection {
  runtimeKind: string
  llmModelIdentifier: string
}

/** Settings a start keeps from where the user came from: the heading switcher, or "+" on a run. */
export type ChatStartSettings = Readonly<{
  workspace: RunWorkspaceChoice | null
  runtimeKind: string
  llmModelIdentifier: string
  llmConfig: Record<string, unknown> | null
  autoExecuteTools: boolean
  /** "+" on a Team run only: its members' own settings. */
  teamAgentOverrides?: Readonly<Record<AgentTeamAddress, AgentConfigOverride>>
}>

/**
 * The model config a New chat records for a model (D-18, IC-3): the non-thinking schema defaults
 * plus the model's default thinking parameters, written explicitly, over any preset config (a
 * definition's default launch config keeps its own values). A model without a config schema
 * records the preset.
 */
export const explicitChatModelConfig = (
  schema: UiModelConfigSchema | null,
  preset: Record<string, unknown> | null = null,
): Record<string, unknown> | null => {
  if (!schema || Object.keys(schema).length === 0) return preset
  const next: Record<string, unknown> = { ...(applyModelConfigSchemaDefaults(schema, preset) ?? {}) }
  // A preset that already chose thinking keeps its choice; otherwise record the default thinking.
  if (!getThinkingParamKeys(schema).some((key) => next[key] !== undefined)) {
    Object.assign(next, getDefaultThinkingConfig(schema))
  }
  return Object.keys(next).length > 0 ? next : preset
}

let chatDraftSequence = 0
const nextDraftRunId = (): string => `temp-chat-${Date.now()}-${++chatDraftSequence}`

const buildDraftContext = (agent: { id: string; name: string; avatarUrl?: string | null }): AgentContext => {
  const runId = nextDraftRunId()
  const now = new Date().toISOString()
  const conversation: Conversation = {
    id: runId,
    messages: [],
    createdAt: now,
    updatedAt: now,
    agentDefinitionId: agent.id,
  }
  const config: AgentRunConfig = {
    agentDefinitionId: agent.id,
    agentDefinitionName: agent.name,
    agentAvatarUrl: agent.avatarUrl ?? null,
    llmModelIdentifier: '',
    runtimeKind: DEFAULT_AGENT_RUNTIME_KIND,
    workspaceId: null,
    workspaceMetadata: null,
    autoExecuteTools: true,
    isLocked: false,
    llmConfig: null,
  }
  return new AgentContext(config, new AgentRunState(runId, conversation))
}

/**
 * @store chatDraft
 * @description Owns the New chat draft: an unregistered agent context plus target, workspace,
 * approval and Team member overrides, and the rules for its initial settings (REQ-021), retargeting
 * (REQ-019) and member customization. It never sends or routes; `chatLaunchService` launches and
 * `useRunStart` routes.
 */
export const useChatDraftStore = defineStore('chatDraft', () => {
  // Deeply reactive: the composer edits the draft context's text, tags and attachments in place.
  const draft = ref<ChatDraft | null>(null)
  // Bumped whenever the model is chosen explicitly, so a late default resolution never overrides it.
  let modelChoiceGeneration = 0

  const agentDefinitions = () => useAgentDefinitionStore()
  const catalogs = () => useLLMProviderConfigStore()
  const schemaFor = (runtimeKind: string, llmModelIdentifier: string) =>
    catalogs().modelConfigSchemaByIdentifier(runtimeKind, llmModelIdentifier)
  const memberOverrideDeps: MemberOverrideDeps = {
    defaultConfigFor: (choice) => explicitChatModelConfig(schemaFor(choice.runtimeKind, choice.llmModelIdentifier), null),
    schemaFor,
  }

  const agentIdentity = (agentDefinitionId: string) => {
    const definition = agentDefinitions().getAgentDefinitionById(agentDefinitionId)
    return {
      id: agentDefinitionId,
      name: definition?.name ?? '',
      avatarUrl: definition?.avatarUrl ?? null,
    }
  }

  const tempWorkspace = (): RunWorkspaceChoice =>
    ({ kind: 'existing', workspaceId: useWorkspaceStore().tempWorkspaceId ?? TEMP_WORKSPACE_ID })

  /** The context's agent: the target agent, or Daily Assistant for a Team (its context only carries text). */
  const contextAgentFor = (target: ChatTarget): string =>
    target.kind === 'agent' ? target.agentDefinitionId : DEFAULT_CHAT_AGENT_DEFINITION_ID

  const install = (target: ChatTarget, workspace: RunWorkspaceChoice, autoExecuteTools: boolean): ChatDraft => {
    draft.value = {
      context: buildDraftContext(agentIdentity(contextAgentFor(target))),
      target,
      workspace,
      autoExecuteTools,
      teamAgentOverrides: {},
      starting: false,
    }
    modelChoiceGeneration += 1
    return draft.value!
  }

  const applyCarriedModel = (target: ChatDraft, settings: ChatStartSettings) => {
    if (!settings.llmModelIdentifier) return false
    target.context.config.runtimeKind = settings.runtimeKind
    target.context.config.llmModelIdentifier = settings.llmModelIdentifier
    target.context.config.llmConfig = normalizeModelConfig(settings.llmConfig)
    return true
  }

  /**
   * Plain New chat (the Chat nav) and the workspace tree "+": Daily Assistant or a preset agent, the
   * temp or preset workspace, Auto-approve, and the last-used model. Unchanged by REQ-021.
   */
  const startNewChat = (preset: { agentDefinitionId?: string; workspaceRootPath?: string } = {}): ChatDraft => {
    const agentDefinitionId = preset.agentDefinitionId ?? DEFAULT_CHAT_AGENT_DEFINITION_ID
    const next = install(
      { kind: 'agent', agentDefinitionId },
      runWorkspaceChoiceFromRootPath(preset.workspaceRootPath) ?? tempWorkspace(),
      true,
    )
    const lastModel = readChatLastModel()
    if (lastModel) {
      next.context.config.runtimeKind = lastModel.runtimeKind
      next.context.config.llmModelIdentifier = lastModel.llmModelIdentifier
    }
    void resolveChatNavDefaultModel(next, modelChoiceGeneration)
    return next
  }

  /**
   * Run, "+" and the heading switcher (REQ-005/013/019/021): a fresh draft addressed to the
   * definition. Copied ("+") or carried (switcher) settings are used as they are; otherwise the
   * definition's default launch config, then the last chat model, then the default runtime's first
   * model, on the temp workspace with Auto-approve.
   */
  const startForDefinition = (
    target: ChatTarget,
    options: { carried?: ChatStartSettings | null; copied?: ChatStartSettings | null } = {},
  ): ChatDraft => {
    const settings = options.copied ?? options.carried ?? null
    const next = install(target, settings?.workspace ?? tempWorkspace(), settings?.autoExecuteTools ?? true)
    if (target.kind === 'team' && options.copied?.teamAgentOverrides) {
      next.teamAgentOverrides = Object.fromEntries(Object.entries(options.copied.teamAgentOverrides)
        .map(([address, override]) => [address, { ...override }]))
    }
    if (settings && applyCarriedModel(next, settings)) return next
    // Show the likely model at once; the checked choice (availability, catalog) follows.
    const provisional = loadedDefinitionDefaults(target) ?? readChatLastModel()
    if (provisional?.runtimeKind && provisional.llmModelIdentifier) {
      applyModel(next, { runtimeKind: provisional.runtimeKind, llmModelIdentifier: provisional.llmModelIdentifier },
        'llmConfig' in provisional ? provisional.llmConfig ?? null : null)
    }
    void resolveDefinitionDefaultModel(next, modelChoiceGeneration)
    return next
  }

  const loadedDefinitionDefaults = (target: ChatTarget) => normalizeDefaultLaunchConfig(target.kind === 'agent'
    ? agentDefinitions().getAgentDefinitionById(target.agentDefinitionId)?.defaultLaunchConfig
    : useAgentTeamDefinitionStore().agentTeamDefinitions.find((team) => team.id === target.teamDefinitionId)?.defaultLaunchConfig)

  const ensureDraft = (): ChatDraft => draft.value ?? startNewChat()

  const isCurrent = (target: ChatDraft, generation: number) => draft.value === target && generation === modelChoiceGeneration

  /** REQ-021 for Run: definition default → last chat model → default runtime's first model. */
  const resolveDefinitionDefaultModel = async (target: ChatDraft, generation: number): Promise<void> => {
    try {
      const definitionDefaults = await definitionDefaultLaunchConfig(target.target)
      if (!isCurrent(target, generation)) return
      refreshAgentIdentity(target)
      const choice = await resolveStartModel([definitionDefaults, readChatLastModel()], startModelCatalog(), DEFAULT_AGENT_RUNTIME_KIND)
      if (isCurrent(target, generation) && choice) applyModel(target, choice, choice.llmConfig)
    } catch (error) {
      console.warn('Failed to resolve the New chat default model:', error)
    }
  }

  const definitionDefaultLaunchConfig = async (target: ChatTarget) => {
    if (target.kind === 'agent') {
      if (!agentDefinitions().agentDefinitions.length) await agentDefinitions().fetchAllAgentDefinitions().catch(() => undefined)
      return normalizeDefaultLaunchConfig(agentDefinitions().getAgentDefinitionById(target.agentDefinitionId)?.defaultLaunchConfig)
    }
    const teams = useAgentTeamDefinitionStore()
    if (!teams.agentTeamDefinitions.length) await teams.fetchAllAgentTeamDefinitions().catch(() => undefined)
    return normalizeDefaultLaunchConfig(teams.agentTeamDefinitions.find((team) => team.id === target.teamDefinitionId)?.defaultLaunchConfig)
  }

  /**
   * Plain New chat preselection: the last-used runtime + model when its runtime is enabled and the
   * model exists; otherwise Daily Assistant's default launch config; otherwise the runtime default.
   */
  const resolveChatNavDefaultModel = async (target: ChatDraft, generation: number): Promise<void> => {
    try {
      const lastModel = readChatLastModel()
      if (!agentDefinitions().agentDefinitions.length) {
        await agentDefinitions().fetchAllAgentDefinitions().catch(() => undefined)
      }
      if (!isCurrent(target, generation)) return
      // Late-loaded definitions: fill in the draft agent's display identity.
      refreshAgentIdentity(target)
      const assistantDefaults = normalizeDefaultLaunchConfig(
        agentDefinitions().getAgentDefinitionById(DEFAULT_CHAT_AGENT_DEFINITION_ID)?.defaultLaunchConfig,
      )
      const choice = await resolveStartModel([lastModel ? { ...lastModel, llmConfig: null } : null, assistantDefaults],
        startModelCatalog(), DEFAULT_AGENT_RUNTIME_KIND)
      if (isCurrent(target, generation)) {
        applyModel(target, choice ?? { runtimeKind: DEFAULT_AGENT_RUNTIME_KIND, llmModelIdentifier: '' }, choice?.llmConfig ?? null)
      }
    } catch (error) {
      console.warn('Failed to resolve the New chat default model:', error)
    }
  }

  const refreshAgentIdentity = (target: ChatDraft) => {
    const identity = agentIdentity(target.context.config.agentDefinitionId)
    if (!identity.name) return
    target.context.config.agentDefinitionName = identity.name
    target.context.config.agentAvatarUrl = identity.avatarUrl
  }

  const applyModel = (target: ChatDraft, selection: ChatModelSelection, llmConfig: Record<string, unknown> | null = null) => {
    target.context.config.runtimeKind = selection.runtimeKind
    target.context.config.llmModelIdentifier = selection.llmModelIdentifier
    // Choosing a model applies that model's defaults (thinking and other settings reset), recorded
    // explicitly so the run's settings show them.
    target.context.config.llmConfig = explicitChatModelConfig(schemaFor(selection.runtimeKind, selection.llmModelIdentifier), llmConfig)
  }

  /** An explicit model choice from the model menu. */
  const setModel = (selection: ChatModelSelection) => {
    if (!draft.value) return
    modelChoiceGeneration += 1
    applyModel(draft.value, selection)
  }

  /** Thinking and the other model settings: the whole model config. */
  const setModelConfig = (llmConfig: Record<string, unknown> | null) => {
    if (!draft.value) return
    draft.value.context.config.llmConfig = llmConfig
  }

  /**
   * The heading switcher between an Agent and a Team (REQ-019): typed text, attachments (same draft
   * id), workspace, approval and model config are kept; member overrides reset; requested skills are
   * cleared because the skill pool follows the target; a mention of a definition the new target
   * already places is dropped (its text stays).
   */
  const retarget = (target: ChatTarget) => {
    const current = draft.value
    if (!current) return
    if (JSON.stringify(current.target) === JSON.stringify(target)) return
    const identity = agentIdentity(contextAgentFor(target))
    current.context.config = {
      ...current.context.config,
      agentDefinitionId: identity.id,
      agentDefinitionName: identity.name,
      agentAvatarUrl: identity.avatarUrl,
    }
    // PrepareAgentRun reads the conversation's definition id.
    current.context.state.conversation.agentDefinitionId = identity.id
    current.context.requestedSkillNames = []
    const eligible = new Set(draftMentionCandidates(target, {
      agents: agentDefinitions().agentDefinitions,
      teams: useAgentTeamDefinitionStore().agentTeamDefinitions,
    }).map((candidate) => `${candidate.kind}:${candidate.definitionId}`))
    current.context.requestedMentions = current.context.requestedMentions
      .filter((mention) => eligible.has(`${mention.kind}:${mention.definitionId}`))
    current.target = target
    current.teamAgentOverrides = {}
  }

  const rootSettings = (current: ChatDraft): RunSettingsValues => ({
    workspace: current.workspace,
    runtimeKind: current.context.config.runtimeKind,
    llmModelIdentifier: current.context.config.llmModelIdentifier,
    llmConfig: current.context.config.llmConfig ?? null,
    autoExecuteTools: current.autoExecuteTools,
  })

  const storeTeamOverride = (current: ChatDraft, address: AgentTeamAddress, override: AgentConfigOverride | null) => {
    const next = { ...current.teamAgentOverrides }
    if (override) next[address] = override
    else delete next[address]
    current.teamAgentOverrides = next
  }

  /** One Team member's edit in the Member settings drawer; only fields that differ are kept. */
  const changeTeamMember = (address: AgentTeamAddress, change: Exclude<RunMemberSettingChange, { field: 'workspace' }>) => {
    const current = draft.value
    if (current?.target.kind !== 'team') return
    storeTeamOverride(current, address,
      editMemberOverride(current.teamAgentOverrides[address], rootSettings(current), change, memberOverrideDeps))
  }

  /** Per-field Reset, the row reset (`all`). */
  const resetTeamMember = (address: AgentTeamAddress, reset: RunMemberSettingReset) => {
    const current = draft.value
    if (current?.target.kind !== 'team') return
    storeTeamOverride(current, address,
      resetMemberOverride(current.teamAgentOverrides[address], rootSettings(current), reset, memberOverrideDeps))
  }

  /** "Reset all" / the members line's Reset. */
  const resetTeamMembers = () => {
    if (draft.value) draft.value.teamAgentOverrides = {}
  }

  const setWorkspace = (workspace: RunWorkspaceChoice) => {
    if (!draft.value) return
    draft.value.workspace = workspace
  }

  const setAutoExecuteTools = (autoExecuteTools: boolean) => {
    if (!draft.value) return
    draft.value.autoExecuteTools = autoExecuteTools
  }

  const markStarting = (target: ChatDraft) => {
    target.starting = true
  }

  const clearStarting = (target: ChatDraft) => {
    target.starting = false
  }

  return {
    draft: computed(() => draft.value),
    startNewChat,
    startForDefinition,
    ensureDraft,
    retarget,
    changeTeamMember,
    resetTeamMember,
    resetTeamMembers,
    setWorkspace,
    setAutoExecuteTools,
    setModel,
    setModelConfig,
    markStarting,
    clearStarting,
  }
})

/** The draft's settings as a start carries them (the heading switcher, "+"). */
export const chatStartSettingsOf = (draft: ChatDraft): ChatStartSettings => ({
  workspace: draft.workspace,
  runtimeKind: draft.context.config.runtimeKind,
  llmModelIdentifier: draft.context.config.llmModelIdentifier,
  llmConfig: draft.context.config.llmConfig ?? null,
  autoExecuteTools: draft.autoExecuteTools,
})
