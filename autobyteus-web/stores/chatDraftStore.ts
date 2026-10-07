import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { AgentContext } from '~/types/agent/AgentContext'
import { AgentRunState } from '~/types/agent/AgentRunState'
import { DEFAULT_AGENT_RUNTIME_KIND, type AgentRunConfig } from '~/types/agent/AgentRunConfig'
import type { AgentTeamAddress } from '~/types/agent/AgentTeamAddress'
import type { AgentConfigOverride } from '~/types/agent/TeamRunConfig'
import type { Conversation } from '~/types/conversation'
import type { RunWorkspaceChoice } from '~/types/runSettings/RunWorkspaceChoice'
import type { RunMemberSettingChange, RunMemberSettingReset, RunSettingsValues, RunStartSettings } from '~/types/runSettings/RunSettings'
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore'
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore'
import { useWorkspaceStore } from '~/stores/workspace'
import { useLLMProviderConfigStore } from '~/stores/llmProviderConfig'
import { normalizeDefaultLaunchConfig } from '~/types/launch/defaultLaunchConfig'
import { readChatLastModel } from '~/utils/chat/chatLastModelPreference'
import { DEFAULT_CHAT_AGENT_DEFINITION_ID, TEMP_WORKSPACE_ID } from '~/utils/chat/chatDefaults'
import { explicitChatModelConfig } from '~/utils/runSettings/explicitModelConfig'
import { runWorkspaceChoiceFromRootPath } from '~/services/workspace/runWorkspaceChoice'
import { startModelCatalog } from '~/services/runSettings/startModelCatalog'
import { chatNavStartOrder, definitionStartOrder, loadStartRuntimes, resolveStartModel } from '~/utils/runSettings/startModelDefaults'
import { editMemberOverride, resetMemberOverride, type MemberOverrideDeps } from '~/utils/runSettings/memberOverrides'
import { draftMentionCandidates } from '~/utils/collaborators/draftMentionEligibility'
import { normalizeModelConfig } from '~/utils/teamRunConfigUtils'

/** Who a New chat is addressed to. Agent Orgs are never chat targets (they start on the Org launch page). */
export type ChatTarget =
  | Readonly<{ kind: 'agent'; agentDefinitionId: string }>
  | Readonly<{ kind: 'team'; teamDefinitionId: string }>

export interface ChatDraft {
  /** Stable identity of this New chat (its Draft row); never the context's run id, which changes on send. */
  id: string
  /** Set at the draft's first typed text; it stays set, so a cleared open draft still shows its row (REQ-008). */
  listed: boolean
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

/**
 * A New chat is a Draft once it has typed text (REQ-001). Attachments, `/` skills, mentions, target
 * and settings alone are not; a lone `/command` being typed (the skill menu is open) is not text yet.
 */
export const chatDraftHasText = (draft: ChatDraft): boolean => {
  const text = draft.context.requirement.trim()
  return text.length > 0 && !/^\/\S*$/.test(text)
}

let chatDraftSequence = 0
const nextDraftRunId = (): string => `temp-chat-${Date.now()}-${++chatDraftSequence}`
let chatDraftIdSequence = 0
const nextDraftId = (): string => `chat-draft-${++chatDraftIdSequence}`

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
 * @description Owns the New chat drafts: each an unregistered agent context plus target, workspace,
 * approval and Team member overrides, and the rules for its initial settings (REQ-021), retargeting
 * (REQ-019) and member customization. One draft is open (shown by New chat); every draft with typed
 * text is kept, for this app session only, until it is sent or discarded. It never sends or routes;
 * `chatLaunchService` launches and `useRunStart` routes.
 */
export const useChatDraftStore = defineStore('chatDraft', () => {
  // Deeply reactive: the composer edits the open draft's text, tags and attachments in place.
  // Array order is start order.
  const drafts = ref<ChatDraft[]>([])
  const openDraftId = ref<string | null>(null)
  const draft = computed<ChatDraft | null>(() => drafts.value.find((entry) => entry.id === openDraftId.value) ?? null)
  // Per draft, bumped whenever its model is chosen explicitly, so a late default resolution never
  // overrides it. A draft that is no longer kept has none.
  const modelChoiceGenerations = new Map<string, number>()
  const bumpModelChoice = (draftId: string): number => {
    const next = (modelChoiceGenerations.get(draftId) ?? 0) + 1
    modelChoiceGenerations.set(draftId, next)
    return next
  }

  // A draft is listed from its first typed text on (REQ-001); only the open draft is edited.
  watch(() => draft.value !== null && chatDraftHasText(draft.value), (hasText) => {
    if (hasText && draft.value) draft.value.listed = true
  }, { flush: 'sync' })

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

  const removeDraft = (draftId: string) => {
    drafts.value = drafts.value.filter((entry) => entry.id !== draftId)
    modelChoiceGenerations.delete(draftId)
  }

  /** Leaving the open draft: one without typed text is not kept (REQ-004, REQ-008) unless it is being sent. */
  const leaveOpenDraft = () => {
    const current = draft.value
    if (current && !current.starting && !chatDraftHasText(current)) removeDraft(current.id)
    openDraftId.value = null
  }

  /** Every start leaves the open draft and opens a fresh one; earlier drafts with text stay kept. */
  const install = (target: ChatTarget, workspace: RunWorkspaceChoice, autoExecuteTools: boolean): ChatDraft => {
    leaveOpenDraft()
    const id = nextDraftId()
    drafts.value.push({
      id,
      listed: false,
      context: buildDraftContext(agentIdentity(contextAgentFor(target))),
      target,
      workspace,
      autoExecuteTools,
      teamAgentOverrides: {},
      starting: false,
    })
    openDraftId.value = id
    bumpModelChoice(id)
    return draft.value!
  }

  const modelChoiceOf = (target: ChatDraft): number => modelChoiceGenerations.get(target.id) ?? 0

  const applyCarriedModel = (target: ChatDraft, settings: RunStartSettings) => {
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
    void resolveChatNavDefaultModel(next, modelChoiceOf(next))
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
    options: { carried?: RunStartSettings | null; copied?: RunStartSettings | null } = {},
  ): ChatDraft => {
    const settings = options.copied ?? options.carried ?? null
    const next = install(target, settings?.workspace ?? tempWorkspace(), settings?.autoExecuteTools ?? true)
    if (target.kind === 'team' && options.copied?.teamAgentOverrides) {
      next.teamAgentOverrides = Object.fromEntries(Object.entries(options.copied.teamAgentOverrides)
        .map(([address, override]) => [address, { ...override }]))
    }
    if (settings && applyCarriedModel(next, settings)) {
      void loadCarriedStart(next, modelChoiceOf(next))
      return next
    }
    // Show the likely model at once; the checked choice (availability, catalog) follows.
    const provisional = loadedDefinitionDefaults(target) ?? readChatLastModel()
    if (provisional?.runtimeKind && provisional.llmModelIdentifier) {
      applyModel(next, { runtimeKind: provisional.runtimeKind, llmModelIdentifier: provisional.llmModelIdentifier },
        'llmConfig' in provisional ? provisional.llmConfig ?? null : null)
    }
    void resolveDefinitionDefaultModel(next, modelChoiceOf(next))
    return next
  }

  const loadedDefinitionDefaults = (target: ChatTarget) => normalizeDefaultLaunchConfig(target.kind === 'agent'
    ? agentDefinitions().getAgentDefinitionById(target.agentDefinitionId)?.defaultLaunchConfig
    : useAgentTeamDefinitionStore().agentTeamDefinitions.find((team) => team.id === target.teamDefinitionId)?.defaultLaunchConfig)

  const ensureDraft = (): ChatDraft => draft.value ?? startNewChat()

  /** Re-enter a kept draft as it was left (REQ-003). */
  const openDraft = (draftId: string) => {
    if (openDraftId.value === draftId || !drafts.value.some((entry) => entry.id === draftId)) return
    leaveOpenDraft()
    openDraftId.value = draftId
  }

  /** Removes a draft; when it was the open one, a plain fresh New chat opens in its place. */
  const removeAndReplaceIfOpen = (draftId: string) => {
    const wasOpen = openDraftId.value === draftId
    removeDraft(draftId)
    if (!wasOpen) return
    openDraftId.value = null
    startNewChat()
  }

  /** The row's × (REQ-007): no confirmation; a draft being sent is not discarded. */
  const discardDraft = (draftId: string) => {
    const target = drafts.value.find((entry) => entry.id === draftId)
    if (!target || target.starting) return
    removeAndReplaceIfOpen(draftId)
  }

  /**
   * A launched draft belongs to its run now (REQ-006): it and its row go. A draft the user opened
   * while it was being sent stays open.
   */
  const finishSentDraft = (sent: ChatDraft) => {
    removeAndReplaceIfOpen(sent.id)
  }

  const isCurrent = (target: ChatDraft, generation: number) =>
    modelChoiceGenerations.get(target.id) === generation

  /** REQ-021 for Run: definition default → last chat model → default runtime's first model. */
  const resolveDefinitionDefaultModel = async (target: ChatDraft, generation: number): Promise<void> => {
    try {
      const definitionDefaults = await definitionDefaultLaunchConfig(target.target)
      if (!isCurrent(target, generation)) return
      refreshAgentIdentity(target)
      const choice = await resolveStartModel(definitionStartOrder({ definitionDefaults, lastChatModel: readChatLastModel() }),
        startModelCatalog(), DEFAULT_AGENT_RUNTIME_KIND)
      if (isCurrent(target, generation) && choice) applyModel(target, choice, choice.llmConfig)
    } catch (error) {
      console.warn('Failed to resolve the New chat default model:', error)
    }
  }

  /** The target's definitions (identity, a Team's members), loaded once. */
  const ensureTargetDefinitions = async (target: ChatTarget): Promise<void> => {
    if (target.kind === 'agent') {
      if (!agentDefinitions().agentDefinitions.length) await agentDefinitions().fetchAllAgentDefinitions().catch(() => undefined)
      return
    }
    const teams = useAgentTeamDefinitionStore()
    if (!teams.agentTeamDefinitions.length) await teams.fetchAllAgentTeamDefinitions().catch(() => undefined)
  }

  const definitionDefaultLaunchConfig = async (target: ChatTarget) => {
    await ensureTargetDefinitions(target)
    return target.kind === 'agent'
      ? normalizeDefaultLaunchConfig(agentDefinitions().getAgentDefinitionById(target.agentDefinitionId)?.defaultLaunchConfig)
      : normalizeDefaultLaunchConfig(useAgentTeamDefinitionStore().agentTeamDefinitions
        .find((team) => team.id === target.teamDefinitionId)?.defaultLaunchConfig)
  }

  /**
   * CR-004: a copied ("+") or carried (switcher) start keeps its settings, and loads what they need:
   * runtime availability and the catalogs of the root's and every member's runtime (model labels,
   * Thinking and other-setting chips, and the readiness check), plus the target's definitions.
   */
  const loadCarriedStart = async (target: ChatDraft, generation: number): Promise<void> => {
    try {
      const runtimeKinds = [target.context.config.runtimeKind,
        ...Object.values(target.teamAgentOverrides).map((override) => override.runtimeKind)]
      await Promise.all([loadStartRuntimes(runtimeKinds, startModelCatalog()), ensureTargetDefinitions(target.target)])
      if (isCurrent(target, generation)) refreshAgentIdentity(target)
    } catch (error) {
      console.warn('Failed to load the copied New chat settings:', error)
    }
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
      const choice = await resolveStartModel(chatNavStartOrder({ lastChatModel: lastModel, assistantDefaults }),
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
    bumpModelChoice(draft.value.id)
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
    /** Every kept draft, in start order; the open draft is included even without text until it is left. */
    drafts: computed<readonly ChatDraft[]>(() => drafts.value),
    openDraftId: computed(() => openDraftId.value),
    /** The open draft, which New chat shows. */
    draft,
    startNewChat,
    startForDefinition,
    ensureDraft,
    openDraft,
    discardDraft,
    finishSentDraft,
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
export const chatStartSettingsOf = (draft: ChatDraft): RunStartSettings => ({
  workspace: draft.workspace,
  runtimeKind: draft.context.config.runtimeKind,
  llmModelIdentifier: draft.context.config.llmModelIdentifier,
  llmConfig: draft.context.config.llmConfig ?? null,
  autoExecuteTools: draft.autoExecuteTools,
})
