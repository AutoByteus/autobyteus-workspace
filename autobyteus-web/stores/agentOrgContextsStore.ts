import { useAgentActivityStore } from '~/stores/agentActivityStore';
import type { TeamWorkspacePatch } from '~/services/runConfigEditing/existingAgentOrgWorkspaceDraft'
import type { WorkspaceMetadata } from '~/types/workspace/WorkspaceMetadata'
import type { AgentOrgExecutionTree } from '~/types/collaboration/agentOrgExecution'
import { assertAgentOrgRunConfigChange } from '~/services/agentOrgExecution/agentOrgRunConfigAdoption'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { readAgentOrgRunConfig, updateStoppedAgentOrgRunConfig } from '~/services/runConfigEditing/agentOrgRunConfigClient'
import type { ExistingAgentOrgModelConfigPatch } from '~/services/runConfigEditing/existingAgentOrgModelConfigDraft'
import type { WorkspaceSelectionIntent } from '~/stores/agentSelectionStore'
import { isDraftUploadedContextAttachment, coerceDraftUploadedContextAttachment } from '~/utils/contextFiles/contextAttachmentModel'
import { defineStore } from 'pinia'
import { ref, shallowReactive, watch } from 'vue'
import type { AgentContext } from '~/types/agent/AgentContext'
import type { ContextFilePath } from '~/types/conversation'
import type { ActiveAgentWorkspaceTarget, WorkspaceAccess } from '~/types/workspace/activeAgentWorkspaceTarget'
import type { OrgWorkspaceSelection } from '~/services/agentOrgExecution/agentOrgExecutionViewIndex'
import type { AgentOrgExecutionContext } from '~/services/agentOrgExecution/agentOrgExecutionContext'
import { hydrateRemoteOrgMember, stageAgentOrgExecutionContext } from '~/services/agentOrgExecution/agentOrgContextHydration'
import { useRemoteRunsStore, type RemoteRunRetryAdapter } from '~/stores/remoteRunsStore'
import { AgentOrgStreamingService } from '~/services/agentOrgExecution/agentOrgStreamingService'
import { acceptLocalSubmission, beginLocalUserSubmission, failLocalSubmission, finalizeLocalSubmissionAttachments, type LocalUserSubmissionHandle } from '~/services/runSubmission/localUserSubmission'
import { upsertUserMessageByIdentity } from '~/services/agentStreaming/handlers/userMessageProjection'
import { readAgentOrgRunInspection } from '~/services/agentOrgExecution/agentOrgRunInspection'
import { useRunHistoryStore } from '~/stores/runHistoryStore'
import { useContextFileUploadStore } from '~/stores/contextFileUploadStore'
import { buildOrgMemberDraftContextFileOwner, buildOrgMemberFinalContextFileOwner } from '~/utils/contextFiles/contextFileOwner'
import { useAgentOrgRunStore } from '~/stores/agentOrgRunStore'
import { parseAgentOrgExecutionTree } from '~/types/collaboration/agentOrgExecution'
import { mentionsPresentInText, toCollaboratorMentionDtos } from '~/utils/collaborators/collaboratorMentionText'

const MAX_CONFIG_READ_ATTEMPTS = 3

export const useAgentOrgContextsStore = defineStore('agentOrgContexts', () => {
  const contexts = ref<Record<string, AgentOrgExecutionContext>>({})
  const errors = ref<Record<string, string | null>>({})
  const pendingFocus = ref<Record<string, OrgWorkspaceSelection | string | null | undefined>>({})
  const operations = ref<Record<string, 'continuation' | 'stop' | 'configuration'>>({})
  const services = new Map<string, AgentOrgStreamingService>()
  const inspections = new Map<string, Promise<void>>()
  const generations = new Map<string, symbol>()
  const submissions = new Map<string, LocalUserSubmissionHandle>()
  const deferredReleases = new Set<string>()
  const keyFor = (root: string, agent: string) => `${root}\0${agent}`
  const remoteRuns = useRemoteRunsStore()
  const report = (id: string, cause: unknown) => {
    errors.value = { ...errors.value, [id]: cause instanceof Error ? cause.message : String(cause) }
  }

  const retainSubmissionExclusion = (id: string, context?: AgentOrgExecutionContext) => {
    context?.listAgentContextEntries().forEach((entry) => {
      if (submissions.has(keyFor(id, entry.agentRunId))) entry.context.submissionPending = true
    })
  }

  const publish = (id: string, candidate: AgentOrgExecutionContext, commit: () => void) => {
    const previous = contexts.value[id]
    // Validate retained identity before committing any projection or activity.
    for (const entry of candidate.listAgentContextEntries()) {
      const old = previous?.index.addressOf(entry.agentRunId)
      if (old && old !== entry.memberAddress) throw new Error('AgentOrg candidate retained address mismatch.')
      const submission = submissions.get(keyFor(id, entry.agentRunId))
      if (submission && !entry.context.conversation.messages.some((message) => message.type === 'user'
        && (message.messageId === submission.message.messageId || message.dedupeKey === submission.message.dedupeKey))) {
        upsertUserMessageByIdentity({ context: entry.context, userMessage: submission.message })
      }
    }
    commit()
    if (previous) candidate.adoptLocalContexts(previous)
    retainSubmissionExclusion(id, candidate)
    const requested = pendingFocus.value[id]
    if (requested !== undefined) candidate.select(requested)
    contexts.value = { ...contexts.value, [id]: candidate }
    errors.value = { ...errors.value, [id]: null }
    // autobyteus-278: the runs this Org delegated to other nodes; Retry (the store's rule) acts through this Org.
    candidate.remoteExecutions.forEach((execution) => remoteRuns.register(execution, remoteRetryAdapter(id)))
    useRunHistoryStore().applyAgentOrgActivity(id, candidate.isActive)
    void useRunHistoryStore().refreshAgentOrgHistoryItem(id)
  }

  const retireStream = (id: string) => {
    const service = services.get(id)
    services.delete(id)
    service?.disconnect()
  }
  const markHistorical = (id: string) => {
    generations.delete(id)
    contexts.value[id]?.setActive(false)
    retainSubmissionExclusion(id, contexts.value[id])
    useRunHistoryStore().applyAgentOrgActivity(id, false)
    void useRunHistoryStore().refreshAgentOrgHistoryItem(id)
    retireStream(id)
  }

  const attach = (orgRunIdInput: string): AgentOrgStreamingService => {
    const id = orgRunIdInput.trim()
    if (!id) throw new Error('AgentOrg connection requires an exact root.')
    generations.delete(id)
    const existing = services.get(id)
    if (existing) { existing.connect(); return existing }
    const service = new AgentOrgStreamingService({
      orgRunId: id,
      publish: (candidate, commit) => publish(id, candidate, commit),
      reportError: (message) => report(id, message),
      onInactive: () => markHistorical(id),
      onAcceptedExternalUserMessage: () => { void useRunHistoryStore().refreshAgentOrgHistoryItem(id) },
    })
    services.set(id, service)
    service.connect()
    return service
  }

  const releaseContext = (id: string): void => {
    if (operations.value[id] || [...submissions.keys()].some((key) => key.startsWith(`${id}\0`))) {
      deferredReleases.add(id)
      return
    }
    generations.delete(id)
    inspections.delete(id)
    retireStream(id)
    const next = { ...contexts.value }; delete next[id]; contexts.value = next
    const nextErrors = { ...errors.value }; delete nextErrors[id]; errors.value = nextErrors
    const nextFocus = { ...pendingFocus.value }; delete nextFocus[id]; pendingFocus.value = nextFocus
    deferredReleases.delete(id)
  }
  const finishOperation = (id: string) => {
    const next = { ...operations.value }; delete next[id]; operations.value = next
    if (deferredReleases.has(id)) releaseContext(id)
  }
  const select = (id: string, selection: OrgWorkspaceSelection | string | null): void => {
    pendingFocus.value = { ...pendingFocus.value, [id]: selection }
    contexts.value[id]?.select(selection)
    ensureRemoteHydrated(id, selection)
  }
  const selectedAgentRunId = (selection: OrgWorkspaceSelection | string | null | undefined): string | null =>
    selection && typeof selection === 'object' && selection.kind === 'agent_execution' ? selection.agentRunId : null
  const ensureRemoteHydrated = (id: string, selection: OrgWorkspaceSelection | string | null): void => {
    readRemoteMember(id, selectedAgentRunId(selection))
  }
  /** autobyteus-278: a remote child's conversation is read from its node (when it is selected, or on Retry). */
  const readRemoteMember = (id: string, agentRunId: string | null): boolean => {
    const org = contexts.value[id]
    if (!org || !agentRunId || !org.index.remoteAgents.has(agentRunId)) return false
    void hydrateRemoteOrgMember({ orgRunId: id, context: org, agentRunId, isCurrent: () => contexts.value[id] === org })
      .catch((cause) => console.warn(`[agentOrg] Could not load '${agentRunId}' of '${id}'.`, cause))
    return true
  }
  /** autobyteus-278 (SR-008): this Org's mechanisms for the store's Retry rule. */
  const remoteRetryAdapter = (id: string): RemoteRunRetryAdapter => Object.freeze({
    refreshOnStream: () => services.get(id)?.refreshRemote() ?? false,
    selectedAgent: () => selectedAgentRunId(contexts.value[id]?.selection),
    isLoaded: (agentRunId: string) => contexts.value[id]?.isRemoteAgentLoaded(agentRunId) ?? false,
    rereadAgent: (agentRunId: string) => !(contexts.value[id]?.isRemoteAgentLoaded(agentRunId) ?? false) && readRemoteMember(id, agentRunId),
  })

  const readInspection = async (id: string, intent?: WorkspaceSelectionIntent): Promise<void> => {
    const generation = Symbol(id)
    generations.set(id, generation)
    const ownsGeneration = () => generations.get(id) === generation
    const current = () => ownsGeneration() && (!intent || intent.isCurrent())
    try {
      const view = await readAgentOrgRunInspection(id)
      if (!current()) return
      const staged = await stageAgentOrgExecutionContext({ source: 'inspection', orgRunId: id, view, isCurrent: current })
      if (!current()) return
      const candidate = shallowReactive(staged.context)
      publish(id, candidate, staged.commit)
      if (candidate.isActive) {
        // The coherent server observation permits attachment, not a stale row/mode.
        candidate.requireReopen('AgentOrg stream is synchronizing.')
        attach(id)
      } else retireStream(id)
    } catch (cause) {
      if (current()) { report(id, cause); throw cause }
    } finally {
      if (ownsGeneration()) generations.delete(id)
    }
  }

  const openForInspection = (id: string, intent?: WorkspaceSelectionIntent): Promise<void> => {
    if (intent && !intent.isCurrent()) return Promise.resolve()
    deferredReleases.delete(id)
    if (operations.value[id]) return Promise.resolve()
    const context = contexts.value[id]
    if (context?.phase === 'historical' || (context?.phase === 'live' && services.get(id)?.isReady())) return Promise.resolve()
    const inFlight = inspections.get(id)
    if (inFlight && !intent) return inFlight
    retireStream(id)
    const operation = readInspection(id, intent).finally(() => {
      if (inspections.get(id) === operation) inspections.delete(id)
    })
    if (!intent) inspections.set(id, operation)
    return operation
  }

  const reconcileRetainedHistory = (orgRunIds: readonly string[]): void => {
    for (const id of new Set(orgRunIds)) {
      if (contexts.value[id]?.phase !== 'reopen_required' || operations.value[id] || inspections.has(id)) continue
      const service = services.get(id)
      if (service) service.requestRecovery()
      else void openForInspection(id).catch(() => undefined) // readInspection owns errors.
    }
  }

  const accessFor = (id: string, agentRunId: string): 'live' | 'continuable' | 'read_only' => {
    const org = contexts.value[id]
    const agent = org?.index.agents.get(agentRunId)
    // autobyteus-278: a remote child takes input while the Org's stream is live (its node applies it).
    if (org?.index.remoteAgents.has(agentRunId) && !operations.value[id] && !submissions.has(keyFor(id, agentRunId))) {
      return org.phase === 'live' && org.isActive && services.get(id)?.isReady() ? 'live' : 'read_only'
    }
    if (!org || !agent || operations.value[id] || submissions.has(keyFor(id, agentRunId))) return 'read_only'
    if (org.phase === 'historical' && !org.isActive && !agent.delegation) return 'continuable'
    if (org.phase === 'live' && org.isActive && agent.live && services.get(id)?.isReady()) return 'live'
    return 'read_only'
  }

  const submit = async (id: string, agentRunId: string, address: string, context: AgentContext,
    content: string, contextPaths: readonly ContextFilePath[]): Promise<void> => {
    const org = contexts.value[id]
    const access = accessFor(id, agentRunId)
    if (!org || org.getAgentContext(agentRunId) !== context || org.index.addressOf(agentRunId) !== address
      || access === 'read_only') throw new Error('AgentOrg send target is not ready or is stale.')
    if (operations.value[id] || context.submissionPending || submissions.has(keyFor(id, agentRunId))) throw new Error('AgentOrg member submission is already pending.')
    if (access === 'continuable') operations.value = { ...operations.value, [id]: 'continuation' }
    let attachments = contextPaths.map((attachment) => ({ ...attachment }))
    const messageId = crypto.randomUUID()
    const dedupeKey = `member_input:${id}:${agentRunId}:${messageId}`
    const mentions = mentionsPresentInText(content, context.requestedMentions)
    const submission = beginLocalUserSubmission(context, { text: content, attachments, navigationTarget: null, mentions, identity: { messageId, dedupeKey } })
    const key = keyFor(id, agentRunId)
    submissions.set(key, submission)
    let draftEdited = false
    const stopWatching = watch(() => [context.requirement, context.contextFilePaths], () => { draftEdited = true }, { deep: true, flush: 'sync' })
    try {
      if (access === 'continuable') {
        const restored = await useAgentOrgRunStore().restore(id)
        if (restored !== id) throw new Error('AgentOrg restore root mismatch.')
        // Restore acceptance is not a ready stream; retain unknown truth on failure.
        org.requireReopen('AgentOrg restored; stream is synchronizing.')
        useRunHistoryStore().applyAgentOrgActivity(id, true)
        void useRunHistoryStore().refreshAgentOrgHistoryItem(id)
        const service = attach(id)
        await service.whenReady()
      }
      const ready = contexts.value[id]
      if (ready?.getAgentContext(agentRunId) !== context || ready.index.addressOf(agentRunId) !== address) {
        throw new Error('AgentOrg prepared submission identity changed.')
      }
      const service = services.get(id)
      if (!service) throw new Error('AgentOrg interaction stream is not ready.')
      if (attachments.some((file) => isDraftUploadedContextAttachment(file) || coerceDraftUploadedContextAttachment(file))) {
        attachments = await useContextFileUploadStore().finalizeDraftAttachments({
          draftOwner: buildOrgMemberDraftContextFileOwner(id, agentRunId),
          finalOwner: buildOrgMemberFinalContextFileOwner(id, agentRunId), attachments,
        })
        finalizeLocalSubmissionAttachments(submission, attachments)
      }
      await service.sendPrepared({ agentRunId, content, attachments, messageId, dedupeKey,
        mentions: toCollaboratorMentionDtos(content, mentions) })
      acceptLocalSubmission(submission)
    } catch (cause) {
      // A rejected add posted nothing: the notice shows and the draft stays as typed.
      if (failLocalSubmission(submission, cause) === 'kept_draft') return
      if (!draftEdited) { context.requirement = content; context.contextFilePaths = attachments; context.requestedMentions = [...mentions] }
      throw cause
    } finally {
      stopWatching()
      submissions.delete(key)
      if (access === 'continuable') finishOperation(id)
      else if (deferredReleases.has(id)) releaseContext(id)
    }
  }

  const activeTargetFor = (id: string): ActiveAgentWorkspaceTarget | null => {
    const target = contexts.value[id]?.selectedTarget()
    if (!target || !('address' in target)) return null
    const agentRunId = target.context.state.runId
    const send = (content: string, files: readonly ContextFilePath[]) => submit(id, agentRunId, target.address, target.context, content, files)
    const access = accessFor(id, agentRunId)
    const liveService = () => {
      const service = services.get(id)
      if (!service || accessFor(id, agentRunId) !== 'live' || contexts.value[id]?.getAgentContext(agentRunId) !== target.context) {
        throw new Error('AgentOrg live command target is stale.')
      }
      return service
    }
    const capability: WorkspaceAccess = access === 'continuable' ? { access, continuation: { send } }
      : access === 'live' ? { access, interaction: {
        send,
        interrupt: () => liveService().interrupt(agentRunId),
        decideTool: (invocationId, approved, reason) => liveService().decideTool(agentRunId, invocationId, approved, reason),
      } } : { access: 'read_only' }
    return Object.freeze({ ...target, ...capability })
  }

  const stopAndInspect = async (id: string): Promise<void> => {
    if (operations.value[id]) throw new Error('AgentOrg operation is already pending.')
    errors.value = { ...errors.value, [id]: null }
    operations.value = { ...operations.value, [id]: 'stop' }
    const context = contexts.value[id]
    const view = context?.view
    const binding = useWindowNodeContextStore().bindingRevision
    const activities = useAgentActivityStore()
    const members = context?.listAgentContextEntries().map((entry) => ({
      ...entry, state: entry.context.state, instance: entry.context.state.inputProjection?.runInstanceId,
      ids: activities.getNativeCompactionActivityIds(entry.agentRunId),
    })) ?? []
    generations.delete(id)
    retireStream(id)
    // The old transport cannot publish during Stop, including a rejected Stop.
    // Keep last-known activity, but require fresh observation before input.
    if (contexts.value[id]?.isActive) contexts.value[id]?.requireReopen('AgentOrg stop is pending.')
    try {
      await useAgentOrgRunStore().terminate(id)
      // This owner intentionally retired its transport before the mutation.
      if (contexts.value[id] !== context || context?.view !== view || services.has(id)
        || operations.value[id] !== 'stop' || useWindowNodeContextStore().bindingRevision !== binding
        || members.some((entry) => context?.getAgentContext(entry.agentRunId) !== entry.context
          || context.index.requireAgent(entry.agentRunId).address !== entry.memberAddress
          || entry.context.state !== entry.state || entry.state.runId !== entry.agentRunId
          || (entry.state.inputProjection?.runInstanceId && entry.state.inputProjection.runInstanceId !== entry.instance))) return
      for (const { agentRunId, context: member, ids } of members) {
        if (member.config.runtimeKind !== 'autobyteus') continue
        member.state.compactionStatus = activities.applyConfirmedNativeTermination(agentRunId,
          [...ids, ...activities.getNativeCompactionActivityIds(agentRunId)], member.state.compactionStatus)
      }
      markHistorical(id)
      await readInspection(id)
    } catch (cause) { report(id, cause); throw cause }
    finally { finishOperation(id) }
  }

  const requireConfigOwner = (orgRunId: string) => {
    const org = contexts.value[orgRunId]
    if (!org || org.orgRunId !== orgRunId) throw new Error('Org configuration target is stale.')
    if (operations.value[orgRunId] || inspections.has(orgRunId)) throw new Error('Org operation is already pending.')
    return org
  }
  const prepareConfigWorkspaces = async (org: AgentOrgExecutionContext, tree: AgentOrgExecutionTree,
    isCurrent: () => boolean): Promise<ReadonlyMap<string, WorkspaceMetadata | null>> => {
    assertAgentOrgRunConfigChange(org.executionTree, tree)
    const roots = new Set<string>()
    for (const member of tree.rootOrg.members) {
      const agents = 'agentRunId' in member ? [member] : member.members
      for (const agent of agents) {
        const old = org.index.requireAgent(agent.agentRunId).source.launchConfiguration.workspaceRootPath
        const config = org.getAgentContext(agent.agentRunId)?.config
        const root = agent.launchConfiguration.workspaceRootPath
        if (root && (root !== old || !config?.workspaceId || !config.workspaceMetadata)) roots.add(root)
      }
    }
    const metadata = new Map<string, WorkspaceMetadata | null>()
    for (const root of roots) {
      const resolved = await useRunHistoryStore().resolveWorkspaceMetadataByRootPath(root).catch(() => null)
      if (!isCurrent()) return metadata
      metadata.set(root, resolved)
    }
    return metadata
  }
  /**
   * autobyteus-265: a target change (context released, node switched, Org operation pending) refuses the read.
   * A refresh of the same Org's own view (its stream's reload after a live Save) reads again, up to the bound.
   */
  const readRunConfig = async (orgRunId: string) => {
    const stale = () => new Error('Org configuration read is stale; refresh required.')
    for (let attempt = 1; ; attempt += 1) {
      const org = requireConfigOwner(orgRunId), view = org.view
      const binding = useWindowNodeContextStore().bindingRevision
      const targetChanged = () => !contexts.value[orgRunId] || !!operations.value[orgRunId] || inspections.has(orgRunId)
        || binding !== useWindowNodeContextStore().bindingRevision
      const viewRefreshed = () => contexts.value[orgRunId] !== org || org.view !== view
      const stopped = () => org.phase === 'historical' && !org.isActive
      // true: consistent with this attempt's view; false: read again; throws on a target change or past the bound.
      const consistent = () => {
        if (targetChanged()) throw stale()
        if (!viewRefreshed()) return true
        if (attempt < MAX_CONFIG_READ_ATTEMPTS) return false
        throw stale()
      }
      const canonical = await readAgentOrgRunConfig(orgRunId)
      if (!consistent()) continue
      if (!canonical.isActive && stopped()) {
        const metadata = await prepareConfigWorkspaces(org, canonical.executionTree,
          () => !targetChanged() && !viewRefreshed() && stopped())
        if (!consistent()) continue
        if (!stopped()) throw stale()
        org.applyRunConfig(canonical.executionTree, canonical.isActive, metadata)
      }
      return canonical
    }
  }
  const saveRunConfig = async (orgRunId: string, patches: Readonly<{
    modelPatches: readonly ExistingAgentOrgModelConfigPatch[]; teamWorkspacePatches: readonly TeamWorkspacePatch[]
  }>) => {
    const org = requireConfigOwner(orgRunId), id = orgRunId, view = org.view
    if (org.isActive || org.phase !== 'historical'
      || [...submissions.keys()].some(key => key.startsWith(`${id}\0`))) throw new Error('Org must be stopped before configuration Save.')
    const binding = useWindowNodeContextStore().bindingRevision
    operations.value = { ...operations.value, [id]: 'configuration' }
    try {
      const current = () => contexts.value[id] === org && org.view === view && operations.value[id] === 'configuration'
        && org.phase === 'historical' && !org.isActive && binding === useWindowNodeContextStore().bindingRevision
      const result = await updateStoppedAgentOrgRunConfig({ orgRunId, ...patches })
      if (!current()) throw new Error('Org configuration Save target changed; refresh canonical configuration.')
      if (result.canonicalExecutionTree && !result.isActive) {
        const tree = parseAgentOrgExecutionTree(result.canonicalExecutionTree)
        const metadata = await prepareConfigWorkspaces(org, tree, current)
        if (!current()) throw new Error('Org configuration Save target changed; refresh canonical configuration.')
        org.applyRunConfig(tree, result.isActive, metadata)
      }
      return result
    } finally { finishOperation(id) }
  }

  const contextFor = (id: string): AgentOrgExecutionContext | null => contexts.value[id] ?? null
  const errorFor = (id: string): string | null => errors.value[id] ?? null
  return { readRunConfig, saveRunConfig, contexts, errors, operations, reconcileRetainedHistory, openForInspection, releaseContext, select, contextFor, errorFor, activeTargetFor, stopAndInspect }
})
