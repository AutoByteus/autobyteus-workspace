import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore'
import { useAgentOrgDefinitionStore, type AgentOrgDefinition } from '~/stores/agentOrgDefinitionStore'
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore'
import { useLLMProviderConfigStore } from '~/stores/llmProviderConfig'
import { useRuntimeAvailabilityStore } from '~/stores/runtimeAvailabilityStore'
import { useWorkspaceStore } from '~/stores/workspace'
import { explicitChatModelConfig } from '~/utils/runSettings/explicitModelConfig'
import { DEFAULT_AGENT_RUNTIME_KIND, runtimeKindToLabel } from '~/types/agent/AgentRunConfig'
import type { AgentTeamAddress } from '~/types/agent/AgentTeamAddress'
import type { AgentConfigOverride } from '~/types/agent/TeamRunConfig'
import type { RunWorkspaceChoice } from '~/types/runSettings/RunWorkspaceChoice'
import type {
  RunMemberSettingChange,
  RunMemberSettingReset,
  RunModelChoice,
  RunSettingsValues,
  RunStartSettings,
} from '~/types/runSettings/RunSettings'
import { normalizeDefaultLaunchConfig } from '~/types/launch/defaultLaunchConfig'
import { loadAgentOrgDefinitionReferences, type AgentOrgDefinitionReferences } from '~/services/agentOrgDefinition/agentOrgDefinitionReferences'
import { readAgentOrgRunInspection } from '~/services/agentOrgExecution/agentOrgRunInspection'
import { agentOrgLaunchService } from '~/services/agentOrgExecution/agentOrgLaunchService'
import { buildEditableAgentOrgRunSeed } from '~/services/runConfigEditing/agentOrgRunLaunchSeed'
import { startModelCatalog } from '~/services/runSettings/startModelCatalog'
import { runWorkspaceChoiceFromSelection, sameRunWorkspaceChoice } from '~/services/workspace/runWorkspaceChoice'
import { buildAgentOrgActiveRoute } from '~/services/workspace/workspaceNavigationService'
import { localizationRuntime } from '~/localization/runtime/localizationRuntime'
import { autoExecuteForNewRuntimeSelection, withNewRuntimeOverridePolicy } from '~/utils/agentRunRuntimeDraftPolicy'
import { readChatLastModel } from '~/utils/chat/chatLastModelPreference'
import { TEMP_WORKSPACE_ID } from '~/utils/chat/chatDefaults'
import { editMemberOverride, normalizeMemberOverride, resetMemberOverride, type MemberOverrideDeps } from '~/utils/runSettings/memberOverrides'
import { buildOrgMemberTree, findRunMember, type OrgMemberTree, type RunMemberNode } from '~/utils/runSettings/runMemberTree'
import { resolveStartModel } from '~/utils/runSettings/startModelDefaults'
import { normalizeModelConfig } from '~/utils/teamRunConfigUtils'

const t = (key: string, params?: Record<string, string | number>): string => localizationRuntime.translate(key, params)

/**
 * The Org launch page's draft (UIS-004). An Org has no coordinator or recipient, so it is never a
 * chat target: it starts here with the Org card's settings and its members' own settings, and Run
 * launches it with no focused recipient.
 *
 * Phases: `preparing` (references, and for "+" the source run) → `ready` ⇄ edits → `launching` →
 * cleared after navigation, or back to `ready` with an error. A newer start drops late results.
 */
export type OrgLaunchPhase = 'preparing' | 'ready' | 'launching'

export interface OrgLaunchDraft {
  key: string
  orgDefinitionId: string
  sourceOrgRunId: string | null
  phase: OrgLaunchPhase
  /** The Org (or one of its references) is not available: nothing to configure. */
  unavailable: boolean
  /** A failed launch, shown in red under the card. */
  error: string | null
  references: AgentOrgDefinitionReferences | null
  root: RunSettingsValues & { workspace: RunWorkspaceChoice }
  /** A placed team's own model/thinking/approval (only fields that differ from the Org's). */
  teamOverrides: Record<AgentTeamAddress, AgentConfigOverride>
  /** A placed team's own workspace, kept only where it differs from the Org's. */
  teamWorkspaces: Record<AgentTeamAddress, RunWorkspaceChoice>
  /** Direct agents and placed-team members. */
  agentOverrides: Record<AgentTeamAddress, AgentConfigOverride>
}

export type OrgLaunchReadiness = Readonly<{ ready: true }> | Readonly<{ ready: false; reason: string }>

export type OrgLaunchStart = Readonly<{
  orgDefinitionId: string
  sourceOrgRunId?: string | null
  /** Settings carried from the heading switcher. */
  carried?: RunStartSettings | null
}>

let draftSequence = 0

export const useAgentOrgLaunchDraftStore = defineStore('agentOrgLaunchDraft', () => {
  const draft = ref<OrgLaunchDraft | null>(null)

  const orgs = () => useAgentOrgDefinitionStore()
  const schemaFor = (runtimeKind: string, llmModelIdentifier: string) =>
    useLLMProviderConfigStore().modelConfigSchemaByIdentifier(runtimeKind, llmModelIdentifier)
  const defaultConfigFor = (choice: RunModelChoice) => explicitChatModelConfig(schemaFor(choice.runtimeKind, choice.llmModelIdentifier), null)
  const memberOverrideDeps: MemberOverrideDeps = { defaultConfigFor, schemaFor }
  const tempWorkspace = (): RunWorkspaceChoice =>
    ({ kind: 'existing', workspaceId: useWorkspaceStore().tempWorkspaceId ?? TEMP_WORKSPACE_ID })

  const isCurrent = (target: OrgLaunchDraft) => draft.value?.key === target.key

  /** Run, "+" and the switcher always start a fresh draft. */
  const start = (input: OrgLaunchStart): OrgLaunchDraft => {
    const carried = input.carried ?? null
    draft.value = {
      key: `org-launch-${++draftSequence}`,
      orgDefinitionId: input.orgDefinitionId,
      sourceOrgRunId: input.sourceOrgRunId ?? null,
      phase: 'preparing',
      unavailable: false,
      error: null,
      references: null,
      root: {
        workspace: carried?.workspace ?? tempWorkspace(),
        runtimeKind: carried?.llmModelIdentifier ? carried.runtimeKind : DEFAULT_AGENT_RUNTIME_KIND,
        llmModelIdentifier: carried?.llmModelIdentifier ?? '',
        llmConfig: carried?.llmModelIdentifier ? normalizeModelConfig(carried.llmConfig) : null,
        // REQ-021: Auto-approve for Orgs too (the Antigravity lock still applies).
        autoExecuteTools: carried?.autoExecuteTools ?? true,
      },
      teamOverrides: {},
      teamWorkspaces: {},
      agentOverrides: {},
    }
    const current = draft.value
    void prepare(current, Boolean(carried?.llmModelIdentifier))
    return current
  }

  /** The page's route intent: keep a matching draft (Run/"+" started it), otherwise start one (reload). */
  const ensureForRoute = (route: Readonly<{ orgDefinitionId: string; sourceOrgRunId: string | null }>): void => {
    const current = draft.value
    if (current && current.orgDefinitionId === route.orgDefinitionId && current.sourceOrgRunId === route.sourceOrgRunId) return
    start(route)
  }

  const prepare = async (target: OrgLaunchDraft, modelCarried: boolean): Promise<void> => {
    try {
      await orgs().fetchAll().catch(() => undefined)
      const org = orgs().byId(target.orgDefinitionId)
      if (!isCurrent(target)) return
      if (!org) {
        target.unavailable = true
        return
      }
      const selected: AgentOrgDefinition = { ...org, members: org.members.map((member) => ({ ...member })) }
      const agents = useAgentDefinitionStore()
      const teams = useAgentTeamDefinitionStore()
      const [references, source] = await Promise.all([
        loadAgentOrgDefinitionReferences(selected.id, selected.members, {
          getCatalogAgentById: agents.getAgentDefinitionById,
          getCatalogTeamById: teams.getCatalogAgentTeamDefinitionById,
        }),
        target.sourceOrgRunId
          ? readAgentOrgRunInspection(target.sourceOrgRunId).catch((error: unknown) => {
            console.warn('Could not read the source Org run; the Org defaults are used.', error)
            return null
          })
          : Promise.resolve(null),
      ])
      const copied = source && !references.unavailable.length ? copyFromRun(selected, references, source) : null
      if (!isCurrent(target)) return
      target.references = references
      if (references.unavailable.length) {
        target.unavailable = true
        return
      }
      if (copied) {
        Object.assign(target, copied)
        return
      }
      if (!modelCarried) await applyDefaultModel(target, selected)
    } catch (error) {
      console.warn('Failed to prepare the Org launch page:', error)
      if (isCurrent(target) && !target.references) target.unavailable = true
    } finally {
      if (isCurrent(target) && target.phase === 'preparing') target.phase = 'ready'
    }
  }

  /** "+" on an Org run: the run's settings and member overrides. A failed copy keeps the defaults. */
  const copyFromRun = (
    org: AgentOrgDefinition,
    references: AgentOrgDefinitionReferences,
    source: Awaited<ReturnType<typeof readAgentOrgRunInspection>>,
  ): Pick<OrgLaunchDraft, 'root' | 'teamOverrides' | 'teamWorkspaces' | 'agentOverrides'> | null => {
    try {
      const seed = buildEditableAgentOrgRunSeed(source.execution_tree, org, references,
        Object.values(useWorkspaceStore().workspaceMetadataById))
      const rootWorkspace = runWorkspaceChoiceFromSelection(seed.workspaceSelection) ?? tempWorkspace()
      const teamWorkspaces: Record<AgentTeamAddress, RunWorkspaceChoice> = {}
      for (const [address, selection] of Object.entries(seed.teamWorkspaceSelections)) {
        const choice = runWorkspaceChoiceFromSelection(selection)
        // A placed team keeps its workspace only where it differs from the Org's.
        if (choice && !sameRunWorkspaceChoice(choice, rootWorkspace)) teamWorkspaces[address] = choice
      }
      const teamOverrides = Object.fromEntries(Object.entries(seed.teamOverrides).flatMap(([address, override]) => {
        const { workspace: _workspace, ...rest } = override
        return Object.keys(rest).length ? [[address, rest as AgentConfigOverride]] : []
      }))
      return {
        root: {
          workspace: rootWorkspace,
          runtimeKind: seed.runtimeKind,
          llmModelIdentifier: seed.llmModelIdentifier,
          llmConfig: normalizeModelConfig(seed.llmConfig),
          autoExecuteTools: seed.autoExecuteTools,
        },
        teamOverrides,
        teamWorkspaces,
        agentOverrides: { ...seed.agentOverrides },
      }
    } catch (error) {
      console.warn('Could not copy the Org run settings; the Org defaults are used.', error)
      return null
    }
  }

  /** REQ-021: the Org's default launch config → last chat model → the default runtime's first model. */
  const applyDefaultModel = async (target: OrgLaunchDraft, org: AgentOrgDefinition) => {
    const defaults = normalizeDefaultLaunchConfig(org.defaultLaunchConfig)
    const choice = await resolveStartModel([defaults, readChatLastModel()], startModelCatalog(), DEFAULT_AGENT_RUNTIME_KIND)
    if (!isCurrent(target) || !choice) return
    target.root = {
      ...target.root,
      runtimeKind: choice.runtimeKind,
      llmModelIdentifier: choice.llmModelIdentifier,
      llmConfig: explicitChatModelConfig(schemaFor(choice.runtimeKind, choice.llmModelIdentifier), choice.llmConfig),
      autoExecuteTools: autoExecuteForNewRuntimeSelection(choice.runtimeKind, target.root.autoExecuteTools),
    }
  }

  const editable = (): OrgLaunchDraft | null => (draft.value?.phase === 'ready' ? draft.value : null)

  /** The Org card. */
  const setWorkspace = (workspace: RunWorkspaceChoice) => {
    const current = editable()
    if (!current) return
    current.root = { ...current.root, workspace }
    current.error = null
    // A placed team that now matches the Org follows it again.
    for (const [address, choice] of Object.entries(current.teamWorkspaces)) {
      if (sameRunWorkspaceChoice(choice, workspace)) delete current.teamWorkspaces[address]
    }
  }
  const setModel = (choice: RunModelChoice) => {
    const current = editable()
    if (!current) return
    current.root = {
      ...current.root,
      runtimeKind: choice.runtimeKind,
      llmModelIdentifier: choice.llmModelIdentifier,
      llmConfig: defaultConfigFor(choice),
      autoExecuteTools: autoExecuteForNewRuntimeSelection(choice.runtimeKind, current.root.autoExecuteTools),
    }
    current.error = null
  }
  const setModelConfig = (llmConfig: Record<string, unknown> | null) => {
    const current = editable()
    if (!current) return
    current.root = { ...current.root, llmConfig }
    current.error = null
  }
  const setAutoExecuteTools = (autoExecuteTools: boolean) => {
    const current = editable()
    if (!current) return
    current.root = { ...current.root, autoExecuteTools }
    current.error = null
  }

  const org = computed(() => (draft.value ? orgs().byId(draft.value.orgDefinitionId) : null))
  const memberTree = computed<OrgMemberTree | null>(() => {
    const current = draft.value
    if (!current?.references || !org.value) return null
    const references = current.references
    return buildOrgMemberTree({
      org: org.value,
      root: current.root,
      getTeamDefinitionById: (id) => references.teams[id] ?? null,
      getAgentDisplayNameById: (id) => references.agents[id]?.name ?? null,
      teamOverrides: current.teamOverrides,
      teamWorkspaces: current.teamWorkspaces,
      agentOverrides: current.agentOverrides,
    }, { schemaFor, sameWorkspace: sameRunWorkspaceChoice })
  })
  const memberNodes = computed<readonly RunMemberNode[]>(() => (memberTree.value?.status === 'ready' ? memberTree.value.nodes : []))

  /** A member's (or placed team's) edit in the Member settings drawer. */
  const changeMember = (address: AgentTeamAddress, change: RunMemberSettingChange) => {
    const current = editable()
    const node = findRunMember(memberNodes.value, address)
    if (!current || !node) return
    current.error = null
    if (change.field === 'workspace') {
      const next = { ...current.teamWorkspaces }
      if (sameRunWorkspaceChoice(change.choice, current.root.workspace)) delete next[address]
      else next[address] = change.choice
      current.teamWorkspaces = next
      return
    }
    const overrides = node.kind === 'team' ? current.teamOverrides : current.agentOverrides
    const next = editMemberOverride(overrides[address], node.parentValues, change, memberOverrideDeps)
    storeOverride(current, node.kind, address, next)
  }

  /** Per-field Reset, a row's reset (`all`). */
  const resetMember = (address: AgentTeamAddress, reset: RunMemberSettingReset) => {
    const current = editable()
    const node = findRunMember(memberNodes.value, address)
    if (!current || !node) return
    current.error = null
    if (node.kind === 'team' && (reset.field === 'workspace' || reset.field === 'all')) {
      const workspaces = { ...current.teamWorkspaces }
      delete workspaces[address]
      current.teamWorkspaces = workspaces
      if (reset.field === 'workspace') return
    }
    const overrides = node.kind === 'team' ? current.teamOverrides : current.agentOverrides
    storeOverride(current, node.kind, address, resetMemberOverride(overrides[address], node.parentValues, reset, memberOverrideDeps))
  }

  const storeOverride = (current: OrgLaunchDraft, kind: 'agent' | 'team', address: AgentTeamAddress, override: AgentConfigOverride | null) => {
    const next = { ...(kind === 'team' ? current.teamOverrides : current.agentOverrides) }
    if (override) next[address] = withNewRuntimeOverridePolicy(next[address], override)!
    else delete next[address]
    if (kind === 'team') current.teamOverrides = next
    else current.agentOverrides = next
  }

  /** "Reset all" and the members line's Reset. */
  const resetAllMembers = () => {
    const current = editable()
    if (!current) return
    current.teamOverrides = {}
    current.teamWorkspaces = {}
    current.agentOverrides = {}
  }

  // A broken topology blocks Run (see `readiness`); its details go to the console once, when found.
  watch(() => (memberTree.value?.status === 'blocked' ? memberTree.value.diagnostic.message : null), (message) => {
    if (message) console.warn('AgentOrg launch blocked:', message)
  })

  /** Why Run is disabled (REQ-006/AC-002): no model anywhere, an unavailable runtime, an unavailable Org. */
  const readiness = computed<OrgLaunchReadiness>(() => {
    const current = draft.value
    if (!current || current.phase === 'preparing') return { ready: false, reason: '' }
    const unavailable = t('runSettings.orgLaunch.unavailable')
    if (current.unavailable || !org.value) return { ready: false, reason: unavailable }
    const tree = memberTree.value
    if (!tree) return { ready: false, reason: '' }
    // A broken topology is not something the user can fix here (its details are logged above).
    if (tree.status === 'blocked') return { ready: false, reason: unavailable }
    const availability = useRuntimeAvailabilityStore()
    const scopes: RunSettingsValues[] = [current.root]
    const visit = (nodes: readonly RunMemberNode[]) => nodes.forEach((node) => { scopes.push(node.values); visit(node.children) })
    visit(tree.nodes)
    const offRuntime = availability.hasFetched ? scopes.find((scope) => !availability.isRuntimeEnabled(scope.runtimeKind)) : undefined
    if (offRuntime) return { ready: false, reason: t('chat.launch.runtimeUnavailable', { runtime: runtimeKindToLabel(offRuntime.runtimeKind) }) }
    if (scopes.some((scope) => !scope.llmModelIdentifier.trim())) return { ready: false, reason: t('chat.launch.chooseModel') }
    return { ready: true }
  })

  /** Run: starts the Org with no focused recipient and opens the launched Org run view. */
  const launch = async (navigate: (route: RouteLocationRaw) => Promise<unknown>): Promise<void> => {
    const current = draft.value
    if (!current || current.phase !== 'ready' || !readiness.value.ready) return
    current.phase = 'launching'
    current.error = null
    try {
      const orgRunId = await agentOrgLaunchService.launch({
        orgDefinitionId: current.orgDefinitionId,
        root: { ...current.root },
        teamOverrides: Object.fromEntries(Object.entries(current.teamOverrides)
          .map(([address, override]) => [address, normalizeMemberOverride(override, current.root) ?? {}])),
        teamWorkspaces: { ...current.teamWorkspaces },
        agentOverrides: { ...current.agentOverrides },
      })
      await navigate(buildAgentOrgActiveRoute(current.orgDefinitionId, orgRunId))
      if (draft.value === current) draft.value = null
    } catch (error) {
      // The server's validation message stays in the console; the page shows the spec copy.
      console.warn('Failed to start the Agent Org:', error)
      if (isCurrent(current)) {
        current.phase = 'ready'
        current.error = t('runSettings.orgLaunch.failed')
      }
    }
  }

  /** The draft's settings as the heading switcher carries them. */
  const startSettings = computed<RunStartSettings | null>(() => (draft.value ? {
    workspace: draft.value.root.workspace,
    runtimeKind: draft.value.root.runtimeKind,
    llmModelIdentifier: draft.value.root.llmModelIdentifier,
    llmConfig: draft.value.root.llmConfig,
    autoExecuteTools: draft.value.root.autoExecuteTools,
  } : null))

  return {
    draft: computed(() => draft.value),
    org,
    memberTree,
    memberNodes,
    readiness,
    startSettings,
    start,
    ensureForRoute,
    setWorkspace,
    setModel,
    setModelConfig,
    setAutoExecuteTools,
    changeMember,
    resetMember,
    resetAllMembers,
    launch,
  }
})
