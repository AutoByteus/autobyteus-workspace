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
import { orgMemberLoadTarget, stageAgentOrgExecutionContext } from '~/services/agentOrgExecution/agentOrgContextHydration'
import { memberLoader } from '~/services/runHydration/memberLoader'
import { rebuildOfView, useCollaborationParticipantMessagesStore } from '~/services/collaborationMessages/collaborationParticipantMessages'
import { AgentOrgStreamingService } from '~/services/agentOrgExecution/agentOrgStreamingService'
import { orgInterruptOutcome } from '~/services/runInterrupt/orgInterruptOutcome'
import { acceptLocalSubmission, beginLocalUserSubmission, failLocalSubmission, finalizeLocalSubmissionAttachments, type LocalUserSubmissionHandle } from '~/services/runSubmission/localUserSubmission'
import { upsertUserMessageByIdentity } from '~/services/agentStreaming/handlers/userMessageProjection'
import { readAgentOrgRunInspection } from '~/services/agentOrgExecution/agentOrgRunInspection'
import { useRunHistoryStore } from '~/stores/runHistoryStore'
import { useContextFileUploadStore } from '~/stores/contextFileUploadStore'
import { buildOrgMemberDraftContextFileOwner, buildOrgMemberFinalContextFileOwner } from '~/utils/contextFiles/contextFileOwner'
import { useAgentOrgRunStore } from '~/stores/agentOrgRunStore'
import { parseAgentOrgExecutionTree } from '~/types/collaboration/agentOrgExecution'
import { mentionsPresentInText, toCollaboratorMentionDtos } from '~/utils/collaborators/collaboratorMentionText'
import { createRandomId } from '~/utils/randomId'
import { subjectOfTarget } from '~/services/delegatedRuns/delegatedRunSubjects'
import { useDelegatedRunsStore } from '~/stores/delegatedRunsStore'
import { useRunTreeStore } from '~/stores/runTreeStore'
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore'
import { teamWorkspaceContextViewOf } from '~/services/teamExecution/teamWorkspaceContextView'
import type { RunTreeOpenTargetDto, RunTreeRowDto } from '@autobyteus/collaboration-stream-contracts'
import { treeRowOfAgent } from '~/utils/runTree/runTreeAgents'
import { isTeamRow } from '~/utils/runTree/runTreeDisplayRows'

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
  /** The delegated row the user selected under each Org (SR-084): its key, where it opens, and its address. */
  /** The delegated row each Org shows, and the Org's own agent that delegated it (the view returns to it when the row leaves). */
  const selectedRows = ref<Record<string, Readonly<{ key: string; target: RunTreeOpenTargetDto; address: string | null; returnTo: string | null }> | null>>({})
  const report = (id: string, cause: unknown) => {
    errors.value = { ...errors.value, [id]: cause instanceof Error ? cause.message : String(cause) }
  }

  const retainSubmissionExclusion = (id: string, context?: AgentOrgExecutionContext) => {
    context?.listAgentContextEntries().forEach((entry) => {
      if (submissions.has(keyFor(id, entry.agentRunId))) entry.context.submissionPending = true
    })
  }

  const loaderRoot = (id: string) => `agent_org:${id}`
  const publish = (id: string, candidate: AgentOrgExecutionContext, commit: () => string | null) => {
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
    // Every publication is a rebuilt view: a new member-loader generation in which only the staged member is
    // loaded, and the Team tab's lists load again when a message could have been missed (autobyteus-358).
    memberLoader().beginRoot(loaderRoot(id))
    const staged = commit()
    if (staged) memberLoader().markHydrated(loaderRoot(id), staged)
    if (previous) candidate.adoptLocalContexts(previous)
    retainSubmissionExclusion(id, candidate)
    const requested = pendingFocus.value[id]
    if (requested !== undefined) candidate.select(requested)
    contexts.value = { ...contexts.value, [id]: candidate }
    errors.value = { ...errors.value, [id]: null }
    useCollaborationParticipantMessagesStore().reloadRoot('agent_org', id, rebuildOfView(candidate.view), (agentRunId) => candidate.holdsAgent(agentRunId))
    ensureMemberLoaded(id, selectedAgentRunIdOf(candidate))
    useRunHistoryStore().applyAgentOrgActivity(id, candidate.isActive)
    void useRunHistoryStore().refreshAgentOrgHistoryItem(id)
  }

  const retireStream = (id: string) => {
    const service = services.get(id)
    services.delete(id)
    service?.disconnect()
  }
  /** The Org's own agents stopped; its open view keeps its stream (autobyteus-461 SR-045). */
  const markHistorical = (id: string) => {
    generations.delete(id)
    contexts.value[id]?.setActive(false)
    retainSubmissionExclusion(id, contexts.value[id])
    useRunHistoryStore().applyAgentOrgActivity(id, false)
    void useRunHistoryStore().refreshAgentOrgHistoryItem(id)
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
    memberLoader().releaseRoot(loaderRoot(id))
    useCollaborationParticipantMessagesStore().releaseRoot('agent_org', id)
    const nextErrors = { ...errors.value }; delete nextErrors[id]; errors.value = nextErrors
    const nextFocus = { ...pendingFocus.value }; delete nextFocus[id]; pendingFocus.value = nextFocus
    const nextRows = { ...selectedRows.value }; delete nextRows[id]; selectedRows.value = nextRows
    deferredReleases.delete(id)
  }
  /** Releases every Org view and stream this page holds: the phone's session ended (autobyteus-435 REQ-010). */
  const releaseAll = (): void => { new Set([...Object.keys(contexts.value), ...services.keys()]).forEach(releaseContext) }
  const finishOperation = (id: string) => {
    const next = { ...operations.value }; delete next[id]; operations.value = next
    if (deferredReleases.has(id)) releaseContext(id)
  }
  const select = (id: string, selection: OrgWorkspaceSelection | string | null): void => {
    selectedRows.value = { ...selectedRows.value, [id]: null }
    pendingFocus.value = { ...pendingFocus.value, [id]: selection }
    const org = contexts.value[id]
    org?.select(selection)
    if (org) ensureMemberLoaded(id, selectedAgentRunIdOf(org))
  }
  const selectedAgentRunId = (selection: OrgWorkspaceSelection | string | null | undefined): string | null =>
    selection && typeof selection === 'object' && selection.kind === 'agent_execution' ? selection.agentRunId : null
  /** The agent the Org shows for its selection: a selected agent, or a selected configured Team's coordinator. */
  const selectedAgentRunIdOf = (org: AgentOrgExecutionContext): string | null => {
    return org.index.selectedAgent(org.selection)?.agentRunId ?? null
  }
  /**
   * Loads the shown member's stored conversation, activities and files through the member loader unless it is loaded
   * in the published context (autobyteus-358). The Org reads only its own agents; a run it delegated is its own run.
   */
  const ensureMemberLoaded = (id: string, agentRunId: string | null): boolean => {
    const org = contexts.value[id]
    if (!org || !agentRunId || !org.getAgentContext(agentRunId)) return false
    if (memberLoader().isHydrated(loaderRoot(id), agentRunId)) return false
    void memberLoader().ensure(loaderRoot(id), agentRunId, () => contexts.value[id] === org ? orgMemberLoadTarget({
      orgRunId: id, context: org, agentRunId, liveToolAuthority: () => org.isActive && services.get(id)?.isReady() === true,
    }) : null).catch((cause) => console.warn(`[agentOrg] Could not load '${agentRunId}' of '${id}'.`, cause))
    return true
  }
  /** The selected delegated row, while it is in the Org's tree; a row that left it returns the view to the Org's own agents. */
  const selectedRow = (id: string) => {
    const picked = selectedRows.value[id]
    return picked && useRunTreeStore().rowsOf({ kind: 'agent_org', runId: id }).some((row) => row.key === picked.key) ? picked : null
  }
  const subjectOfSelected = (target: RunTreeOpenTargetDto, address: string | null) =>
    subjectOfTarget({ runKind: target.runKind as 'agent' | 'agent_team', runId: target.runId, agentRunId: target.agentRunId, nodeId: target.nodeId },
      address ?? '')

  /**
   * A tree row's open (SR-084, through `openRunTarget`): an Org's own row selects its agent in the Org; a run it delegated
   * on this node opens as its own run (rule 2), by its target; a peer's run opens on its own node, not through this view
   * (SR-086 G-D1). Answers whether it was selected (false for a row error, or while the Org's view is not loaded).
   */
  const selectTreeRow = (id: string, row: RunTreeRowDto): boolean => {
    const target = row.openTarget
    if (!target || !contexts.value[id]) return false
    if (target.runKind === 'agent_org') {
      select(id, { kind: 'agent_execution', agentRunId: target.agentRunId })
      return true
    }
    select(id, null)
    selectedRows.value = { ...selectedRows.value, [id]: Object.freeze({ key: row.key, target, address: row.address, returnTo: delegatingOrgAgentOf(id, row) }) }
    useDelegatedRunsStore().ensureOpen(subjectOfSelected(target, row.address))
    return true
  }
  const selectedRowKey = (id: string): string | null => selectedRow(id)?.key ?? null
  /** The Org's own agent a delegated row hangs under (its nearest Org row above it); null when none does. */
  const delegatingOrgAgentOf = (id: string, row: RunTreeRowDto): string | null => {
    const byKey = new Map(useRunTreeStore().rowsOf({ kind: 'agent_org', runId: id }).map((candidate) => [candidate.key, candidate]))
    for (let above = byKey.get(row.parentKey ?? ''); above; above = byKey.get(above.parentKey ?? '')) {
      if (above.openTarget?.runKind === 'agent_org' && !isTeamRow(above)) return above.openTarget.agentRunId
    }
    return null
  }
  // A shown delegated row that left the Org's tree (its Task closed): the view returns to the Org agent that delegated it,
  // as base's returnToHostWhenUnlisted did (CR-461-109); the Agent family returns to its run's own agent.
  watch(() => Object.entries(selectedRows.value).map(([id, picked]) => [id, picked?.returnTo ?? null,
    Boolean(picked) && !selectedRow(id)] as const), (entries) => {
    for (const [id, returnTo, left] of entries) if (left && returnTo) select(id, { kind: 'agent_execution', agentRunId: returnTo })
  })
  /**
   * The agent the route names (CR-461-102): one of the Org's own agents is selected in it; a run the Org delegated, here
   * or on a peer node, is selected by its tree row and opens as its own run (rule 2). An agent the Org has not got yet
   * (its view or tree still loading) selects nothing.
   */
  const selectRouteAgent = (id: string, agentRunId: string, address: string): void => {
    const org = contexts.value[id]
    const own = org?.index.agents.get(agentRunId)
    if (own) { select(id, address && own.address !== address ? null : { kind: 'agent_execution', agentRunId }); return }
    const row = treeRowOfAgent(useRunTreeStore().rowsOf({ kind: 'agent_org', runId: id }), agentRunId)
    if (row && selectedRowKey(id) !== row.key) selectTreeRow(id, row)
  }

  /** The selected delegated row's own run, as the Org's center view and composer target (rule 2); null while it opens. */
  const delegatedTargetFor = (id: string): ActiveAgentWorkspaceTarget | null => {
    const org = contexts.value[id]
    const picked = selectedRow(id)
    if (!org || !picked) return null
    const subject = subjectOfSelected(picked.target, picked.address)
    const binding = useDelegatedRunsStore().bindingOf(subject)
    if (!binding) return null
    const common = { root: Object.freeze({ orgRunId: id }), address: (picked.address ?? '') as never,
      collaborationMessages: org.delegatedRunMessagesView(subject, picked.address ?? '', picked.target.agentRunId), access: 'live' as const, ...binding }
    // A peer's run shows as its own agent (its node keeps its team).
    if (subject.kind === 'agent' || subject.kind === 'peer') return Object.freeze({ ...common, kind: 'agent_org_task_agent' as const })
    const team = useAgentTeamContextsStore().getTeamContextById(subject.teamRunId)
    return team ? Object.freeze({ ...common, kind: 'agent_org_task_team_member' as const, team: teamWorkspaceContextViewOf(team) }) : null
  }

  const readInspection = async (id: string, intent?: WorkspaceSelectionIntent): Promise<void> => {
    const generation = Symbol(id)
    generations.set(id, generation)
    const ownsGeneration = () => generations.get(id) === generation
    const current = () => ownsGeneration() && (!intent || intent.isCurrent())
    try {
      const view = await readAgentOrgRunInspection(id)
      if (!current()) return
      const staged = await stageAgentOrgExecutionContext({ source: 'inspection', orgRunId: id, view, isCurrent: current,
        focus: pendingFocus.value[id] ?? contexts.value[id]?.selection ?? null })
      if (!current()) return
      const candidate = shallowReactive(staged.context)
      publish(id, candidate, staged.commit)
      // The open Org's view keeps its stream, active or stopped (autobyteus-461 SR-045); an active one takes input once
      // its stream is synchronized.
      if (candidate.isActive) candidate.requireReopen('AgentOrg stream is synchronizing.')
      attach(id)
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
    // A retained stopped Org is reused; its open view gets its stream (autobyteus-461 SR-045), whose snapshot refreshes it.
    if (context?.phase === 'historical') { if (!services.has(id)) attach(id); return Promise.resolve() }
    if (context?.phase === 'live' && services.get(id)?.isReady()) return Promise.resolve()
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
    if (!org || !agent || operations.value[id] || submissions.has(keyFor(id, agentRunId))) return 'read_only'
    const ready = services.get(id)?.isReady() === true
    if (org.phase === 'historical' && !org.isActive) return 'continuable'
    if (org.phase === 'live' && org.isActive && ready) return 'live'
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
    const messageId = createRandomId()
    const dedupeKey = `member_input:${id}:${agentRunId}:${messageId}`
    const mentions = mentionsPresentInText(content, context.requestedMentions)
    const submission = beginLocalUserSubmission(context, { text: content, attachments, navigationTarget: null, mentions, identity: { messageId, dedupeKey } })
    const key = keyFor(id, agentRunId)
    submissions.set(key, submission)
    let draftEdited = false
    const stopWatching = watch(() => [context.requirement, context.contextFilePaths], () => { draftEdited = true }, { deep: true, flush: 'sync' })
    try {
      // A stopped Org starts on this first input, sent over its view's stream (autobyteus-461 SR-046); the view continues
      // live after the stream's in-band snapshot, which keeps this pending send.
      if (access === 'continuable') await attach(id).whenReady()
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
    // A run this Org delegated on this node: its own run's context, stream and reads (autobyteus-461 rule 2).
    if (selectedRow(id)) return delegatedTargetFor(id)
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
        interrupt: () => orgInterruptOutcome(liveService(), agentRunId),
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
    // The read carries the Org's own configuration only; its view's rows are its delegated runs' (CR-461-088).
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
    selectionPatches: readonly ExistingAgentOrgModelConfigPatch[]; teamWorkspacePatches: readonly TeamWorkspacePatch[]
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
  return { readRunConfig, saveRunConfig, contexts, errors, operations, reconcileRetainedHistory, openForInspection, releaseContext, releaseAll, select, selectTreeRow, selectedRow, selectedRowKey, selectRouteAgent, contextFor, errorFor, activeTargetFor, stopAndInspect }
})
