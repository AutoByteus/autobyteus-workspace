import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { defineStore } from 'pinia'
import { shallowReactive, shallowRef, watch } from 'vue'
import { useRunStatusStore } from '~/stores/runStatusStore'
import { AgentStatus } from '~/types/agent/AgentStatus'
import type { AgentContext } from '~/types/agent/AgentContext'
import type { ContextFilePath } from '~/types/conversation'
import type { ActiveAgentWorkspaceTarget } from '~/types/workspace/activeAgentWorkspaceTarget'
import type { CollaborationMessagesContextView } from '~/types/workspace/collaborationMessagesContextView'
import type { RunHistoryTransientExecutionRow } from '~/stores/runHistoryTypes'
import { AgentRunCollaborationContext, type AgentRunTaskTreeRow } from '~/services/agentCollaboration/agentRunCollaborationContext'
import { AgentRunCollaborationStreamingService } from '~/services/agentCollaboration/agentRunCollaborationStreamingService'
import {
  readAgentRunCollaboration,
  buildAgentRunCollaborationContext,
} from '~/services/agentCollaboration/agentRunCollaborationHydration'
import { hubChildLoadTarget } from '~/services/agentCollaboration/agentRunCollaborationChildHydration'
import { memberLoader } from '~/services/runHydration/memberLoader'
import {
  acceptLocalSubmission,
  beginLocalUserSubmission,
  failLocalSubmission,
  finalizeLocalSubmissionAttachments,
} from '~/services/runSubmission/localUserSubmission'
import { useContextFileUploadStore } from '~/stores/contextFileUploadStore'
import { isDraftUploadedContextAttachment, coerceDraftUploadedContextAttachment } from '~/utils/contextFiles/contextAttachmentModel'
import {
  buildAgentCollaborationMemberDraftContextFileOwner,
  buildAgentCollaborationMemberFinalContextFileOwner,
} from '~/utils/contextFiles/contextFileOwner'
import { mentionsPresentInText, toCollaboratorMentionDtos } from '~/utils/collaborators/collaboratorMentionText'
import { useRemoteRunsStore, type RemoteRunRetryAdapter } from '~/stores/remoteRunsStore'
import { rebuildOfView, useCollaborationParticipantMessagesStore } from '~/services/collaborationMessages/collaborationParticipantMessages'
import { createRandomId } from '~/utils/randomId'
import { agentRunDelegatedRunSubject } from '~/services/delegatedRuns/delegatedRunSubjects'
import { useDelegatedRunsStore } from '~/stores/delegatedRunsStore'

const delegatedRuns = () => useDelegatedRunsStore()

/**
 * The client side of standalone runs' collaboration roots: the task children brought in with
 * `@`, their rows under the run row, direct chat with a child and the run's Team tab.
 *
 * Reading never restores a host: a listed run's stored view comes from `agentRunCollaboration`.
 * The open run's view has its stream whether the run's own agent runs or not (autobyteus-461
 * SR-045): its children are runs of their own, and the stream never restores the run.
 *
 * A published context carries the tree and statuses only. A child's stored conversation,
 * activities and artifacts are loaded by the member loader when it is selected, and again for the
 * selected child after every publication (each one begins a new member-loader generation).
 */
export const useAgentRunCollaborationStore = defineStore('agentRunCollaboration', () => {
  const contexts = shallowRef<Record<string, AgentRunCollaborationContext>>({})
  const selection = shallowReactive<Record<string, string | null>>({})
  const expandedTeams = shallowReactive<Record<string, readonly string[]>>({})
  const errors = shallowReactive<Record<string, string | null>>({})
  const services = new Map<string, AgentRunCollaborationStreamingService>()
  /** A read of a hub's view in flight; it ends with its failure's reason, or null. */
  const inspections = new Map<string, Promise<string | null>>()
  const terminations = new Map<string, object>()
  const loaderRoot = (hostRunId: string) => `agent:${hostRunId}`
  const binding = useWindowNodeContextStore()
  const remoteRuns = useRemoteRunsStore()
  const participantMessages = useCollaborationParticipantMessagesStore()
  const assertNotTerminating = (id: string) => {
    if (terminations.has(id)) throw new Error('This Agent collaboration is being stopped.')
  }

  const setContext = (hostRunId: string, context: AgentRunCollaborationContext | null) => {
    const next = { ...contexts.value }
    if (context) next[hostRunId] = context
    else delete next[hostRunId]
    contexts.value = next
  }

  const publish = (hostRunId: string, context: AgentRunCollaborationContext) => {
    const previous = contexts.value[hostRunId]
    const adopt = previous
      ? context.prepareLocalContextAdoption(previous, (agentRunId) => memberLoader().isHydrated(loaderRoot(hostRunId), agentRunId))
      : () => undefined
    adopt()
    setContext(hostRunId, context)
    // A rebuilt view begins a new generation: no child is loaded in it (events may have been missed in between).
    memberLoader().beginRoot(loaderRoot(hostRunId))
    errors[hostRunId] = null
    // Every publication is a rebuilt view (inspect, attach, reopen): the Team tab's lists load again when a message
    // could have been missed meanwhile (SR-004, SR-005).
    participantMessages.reloadRoot('agent', hostRunId, rebuildOfView(context.view), (agentRunId) => context.holdsAgent(agentRunId))
    // autobyteus-278: the runs this root delegated to other nodes; Retry (the store's rule) acts through this root.
    context.remoteExecutions.forEach((execution) => remoteRuns.register(execution, remoteRetryAdapter(hostRunId)))
    returnToHostWhenUnlisted(hostRunId, context)
    ensureChildHydrated(hostRunId, selection[hostRunId] ?? null)
  }

  /**
   * Starts loading one child's stored details into the published context through the member loader,
   * unless it is loaded there already (a load in flight is shared). A load whose context is no longer
   * published ends without writing; a failed load leaves the child not loaded, so selecting it again
   * retries. Answers whether a load is under way.
   */
  const ensureChildHydrated = (hostRunId: string, agentRunId: string | null): boolean => {
    const context = contexts.value[hostRunId]
    if (!agentRunId || !(context?.getChild(agentRunId) || context?.getRemoteChild(agentRunId))) return false
    // A delegated run on this node is opened as its own run (autobyteus-461 rule 2); only a peer's goes through the host.
    const own = agentRunDelegatedRunSubject(context.index, agentRunId)
    if (own) { delegatedRuns().ensureOpen(own); return true }
    if (memberLoader().isHydrated(loaderRoot(hostRunId), agentRunId)) return false
    void memberLoader().ensure(loaderRoot(hostRunId), agentRunId, () => {
      const published = contexts.value[hostRunId]
      return published === context && !terminations.has(hostRunId) ? hubChildLoadTarget({
        hostRunId, collaboration: context, agentRunId,
        liveToolAuthority: () => context.isActive && services.get(hostRunId)?.isReady() === true,
      }) : null
    }).catch((cause) => {
      console.warn(`[agentRunCollaboration] Could not load '${agentRunId}' of '${hostRunId}'.`, cause)
    })
    return true
  }

  /** A selected child that left the listing (absent, or its Task is DONE) returns the view to the run's own agent. */
  const returnToHostWhenUnlisted = (hostRunId: string, context: AgentRunCollaborationContext) => {
    const selected = selection[hostRunId]
    if (selected && !context.isListed(selected)) selection[hostRunId] = null
  }

  const attach = (hostRunId: string): AgentRunCollaborationStreamingService => {
    assertNotTerminating(hostRunId)
    inspections.delete(hostRunId)
    const existing = services.get(hostRunId)
    if (existing) return existing
    const revision = binding.bindingRevision
    const isCurrent = () => services.get(hostRunId) === service
      && binding.bindingRevision === revision && !terminations.has(hostRunId)
    const service = new AgentRunCollaborationStreamingService({
      hostRunId, isCurrent,
      publish: (context) => {
        if (!isCurrent()) throw new Error('Agent collaboration stream ownership released.')
        publish(hostRunId, context)
      },
      reportError: (message) => { if (isCurrent()) errors[hostRunId] = message },
      onTaskExecutionsClosed: (context) => { if (isCurrent()) returnToHostWhenUnlisted(hostRunId, context) },
    })
    services.set(hostRunId, service)
    service.connect()
    return service
  }

  /** autobyteus-278 (SR-008): this root's mechanisms for the store's Retry rule; a remote child loads as any child. */
  const remoteRetryAdapter = (hostRunId: string): RemoteRunRetryAdapter => Object.freeze({
    refreshOnStream: () => services.get(hostRunId)?.refreshRemote() ?? false,
    selectedAgent: () => selection[hostRunId] ?? null,
    isLoaded: (agentRunId: string) => memberLoader().isHydrated(loaderRoot(hostRunId), agentRunId),
    rereadAgent: (agentRunId: string) => ensureChildHydrated(hostRunId, agentRunId),
  })

  const detach = (hostRunId: string) => {
    const service = services.get(hostRunId)
    services.delete(hostRunId)
    service?.disconnect()
  }

  /** Reads and publishes the stored (or live) view without restoring anything; ends with the read's failure, or null. */
  const read = (hostRunId: string): Promise<string | null> => {
    if (terminations.has(hostRunId) || services.has(hostRunId)) return Promise.resolve(null)
    const pending = inspections.get(hostRunId)
    if (pending) return pending
    const revision = binding.bindingRevision
    const isCurrent = () => inspections.get(hostRunId) === attempt
      && binding.bindingRevision === revision && !services.has(hostRunId) && !terminations.has(hostRunId)
    const attempt = (async (): Promise<string | null> => {
      try {
        const view = await readAgentRunCollaboration(hostRunId)
        if (!isCurrent()) return null
        if (!view) { setContext(hostRunId, null); return null }
        const context = await buildAgentRunCollaborationContext({ hostRunId, view })
        if (isCurrent()) publish(hostRunId, context)
        return null
      } catch (cause) {
        const failure = cause instanceof Error ? cause.message : String(cause)
        if (isCurrent()) errors[hostRunId] = failure
        return failure
      }
    })().finally(() => { if (inspections.get(hostRunId) === attempt) inspections.delete(hostRunId) })
    inspections.set(hostRunId, attempt)
    return attempt
  }
  /** Loads the stored (or live) view without restoring anything; a failure is kept as the hub's error. */
  const inspect = async (hostRunId: string): Promise<void> => { await read(hostRunId) }

  /**
   * Each published view's delegated runs' statuses, read by run ID from each run (autobyteus-461 SR-083, FU-026), and its
   * rows' notice: a view that is not open (no stream) reads its view again when its rows changed (`RUN_TREE_CHANGED`);
   * a newer read supersedes an older one in flight, so only the newest answer is applied.
   */
  const runStatus = useRunStatusStore()
  watch(() => Object.entries(contexts.value).flatMap(([hostRunId, context]) => [{ kind: 'agent' as const, runId: hostRunId }, ...context.localRunRefs()]),
    (refs, _previous, onCleanup) => { onCleanup(runStatus.hold(refs)) }, { immediate: true, deep: true })
  watch(() => Object.values(contexts.value).flatMap((context) => [...context.index.agents.keys()].map((agentRunId) => [context, agentRunId, runStatus.statusOf(agentRunId)] as const)),
    (entries) => { for (const [context, agentRunId, status] of entries) if (status) context.applyRunStatus(agentRunId, status as AgentStatus) }, { immediate: true })
  watch(() => Object.keys(contexts.value).map((hostRunId) => [hostRunId, runStatus.treeRevisionOf({ kind: 'agent', runId: hostRunId })] as const),
    (next, previous) => {
      const before = new Map(previous ?? [])
      for (const [hostRunId, revision] of next) {
        if (revision === (before.get(hostRunId) ?? revision) || services.has(hostRunId)) continue
        inspections.delete(hostRunId)
        void read(hostRunId)
      }
    })

  /**
   * The hub's stored view for Settings (autobyteus-358, DS-004): the inspection in flight, else the published view,
   * else a new inspection, so one hub selection reads the view once.
   */
  const viewFor = async (hostRunId: string, options: Readonly<{ fresh?: boolean }> = {}): Promise<AgentRunCollaborationContext['view'] | null> => {
    // A deliberate re-read (after a committed Save, a stop or Refresh) never takes the published view, nor a read
    // started before it (autobyteus-366): a stopped host has no stream to deliver the saved choices, so its stored view
    // is read again, and a copy's switched runtime shows at once (autobyteus-348); a live host's stream keeps it current.
    if (options.fresh) inspections.delete(hostRunId)
    const pending = inspections.get(hostRunId)
    const failure = pending ? await pending : options.fresh || !contexts.value[hostRunId] ? await read(hostRunId) : null
    // A failed read fails the Settings load (its reason, and Refresh), never a silently older view.
    if (failure) throw new Error(failure)
    return contexts.value[hostRunId]?.view ?? null
  }

  /**
   * A Stop of the run's own agent (one request-local exclusion owned here, never a server receipt). The view keeps its
   * stream and its children keep their states: they are runs of their own (autobyteus-461 SR-045). A confirmed Stop
   * marks the run's agent stopped; the server ends the run's root, and the stream reconnects to a fresh view.
   */
  const beginHostTermination = (hostRunId: string) => {
    assertNotTerminating(hostRunId)
    const token = {}
    const revision = binding.bindingRevision
    terminations.set(hostRunId, token)
    let confirmed = false
    return Object.freeze({
      confirm: (): boolean => {
        if (confirmed || terminations.get(hostRunId) !== token || binding.bindingRevision !== revision) return false
        contexts.value[hostRunId]?.setActive(false)
        confirmed = true
        return true
      },
      finish: (): void => {
        if (terminations.get(hostRunId) === token) terminations.delete(hostRunId)
      },
    })
  }

  /**
   * Called for the selected standalone run. The open run's view keeps its stream whether its own agent runs or not (autobyteus-461 SR-045): its children are runs
   * of their own, so their rows and output stay live while it is stopped. Its agent's state only updates the view.
   */
  const syncHost = (hostRunId: string, hostRunning: boolean) => {
    if (terminations.has(hostRunId)) return
    if (contexts.value[hostRunId]?.phase === 'reopen_required' && !services.has(hostRunId)) return
    attach(hostRunId)
    contexts.value[hostRunId]?.setActive(hostRunning)
  }

  const contextFor = (hostRunId: string): AgentRunCollaborationContext | null => contexts.value[hostRunId] ?? null

  /** Selects a child (null: the run's own agent) and starts loading its details if needed. */
  const selectChild = (hostRunId: string, agentRunId: string | null) => {
    selection[hostRunId] = agentRunId && contextFor(hostRunId)?.isListed(agentRunId) ? agentRunId : null
    ensureChildHydrated(hostRunId, selection[hostRunId] ?? null)
  }
  const selectedChild = (hostRunId: string): string | null => selection[hostRunId] ?? null

  /**
   * A listed standalone run's stored view, read once without restoring the run, when it has collaboration and is not
   * loaded yet; a live run is kept current by its stream.
   */
  const ensureStoredView = (hostRunId: string, hasCollaboration: boolean): void => {
    if (hasCollaboration && !contextFor(hostRunId)) void inspect(hostRunId)
  }

  /**
   * A task row's open: a task Agent row selects its agent, a task Team row its coordinator. Answers whether a child
   * was selected (false while the run's view is not loaded).
   */
  /** A delegated row opens where the server says (SR-083): its run, on the agent it names (a team's coordinator). */
  const selectTaskRow = (hostRunId: string, row: RunHistoryTransientExecutionRow): boolean => {
    const target = row.openTarget?.agentRunId ?? null
    if (!contextFor(hostRunId) || !target) return false
    selectChild(hostRunId, target)
    return true
  }

  // Publication never changes disclosure: new Teams are closed until explicitly revealed.
  const isTaskTeamExpanded = (hostRunId: string, teamRunId: string) => (expandedTeams[hostRunId] ?? []).includes(teamRunId)
  const toggleTaskTeam = (hostRunId: string, teamRunId: string) => {
    const current = expandedTeams[hostRunId] ?? []
    expandedTeams[hostRunId] = Object.freeze(current.includes(teamRunId)
      ? current.filter((id) => id !== teamRunId)
      : [...current, teamRunId])
  }

  const taskRows = (hostRunId: string): AgentRunTaskTreeRow[] =>
    contextFor(hostRunId)?.listTaskRows((teamRunId) => isTaskTeamExpanded(hostRunId, teamRunId)) ?? []

  /** The host's Team tab: messages with its children, once it has any. */
  const hostMessagesView = (hostRunId: string): CollaborationMessagesContextView | null => {
    const context = contextFor(hostRunId)
    return context?.hasChildren ? context.messagesView(hostRunId) : null
  }

  /** A message to a peer's child over the view's stream (autobyteus-278); a local child is reached by its own run (rule 2). */
  const submit = async (hostRunId: string, agentRunId: string, context: AgentContext,
    content: string, paths: readonly ContextFilePath[]): Promise<void> => {
    assertNotTerminating(hostRunId)
    const collaboration = contexts.value[hostRunId]
    if (collaboration && agentRunDelegatedRunSubject(collaboration.index, agentRunId)) {
      throw new Error('A delegated run on this node is reached through its own run.')
    }
    if (collaboration?.getAgentContext(agentRunId) !== context) throw new Error('Agent collaboration child was replaced.')
    if (context.submissionPending) throw new Error('A message to this collaborator is already pending.')
    const mentions = mentionsPresentInText(content, context.requestedMentions)
    let attachments = paths.map((attachment) => ({ ...attachment }))
    const messageId = createRandomId()
    const dedupeKey = `member_input:${hostRunId}:${agentRunId}:${messageId}`
    const submission = beginLocalUserSubmission(context, { text: content, attachments, navigationTarget: null, mentions, identity: { messageId, dedupeKey } })
    try {
      // A peer's child (autobyteus-278): over the view's stream, ready once its snapshot is applied (SR-045).
      const service = attach(hostRunId)
      await service.whenReady()
      if (attachments.some((file) => isDraftUploadedContextAttachment(file) || coerceDraftUploadedContextAttachment(file))) {
        attachments = await useContextFileUploadStore().finalizeDraftAttachments({
          draftOwner: buildAgentCollaborationMemberDraftContextFileOwner(hostRunId, agentRunId),
          finalOwner: buildAgentCollaborationMemberFinalContextFileOwner(hostRunId, agentRunId),
          attachments,
        })
        finalizeLocalSubmissionAttachments(submission, attachments)
      }
      await service.sendMessage({ agentRunId, content, attachments, messageId, dedupeKey,
        mentions: toCollaboratorMentionDtos(content, mentions) })
      acceptLocalSubmission(submission)
    } catch (cause) {
      // A rejected add posted nothing: the notice shows and the draft stays as typed.
      if (failLocalSubmission(submission, cause) === 'kept_draft') return
      context.requirement = content
      context.contextFilePaths = attachments
      context.requestedMentions = [...mentions]
      throw cause
    }
  }

  /**
   * The selected child of a standalone run, as the composer and center view target. A child on this node is bound to
   * its own run's context, stream and reads (autobyteus-461 rule 2); null while that run opens. A child on a peer node
   * keeps the route through the host (autobyteus-278).
   */
  /**
   * A run this run delegated on this node is selected under it, and its own run is still opening (rule 2): the view has
   * no target until it is open, never this run's own, as in the Team and Org views (CR-461-057). Typing meanwhile would
   * otherwise go to the delegator's draft, and its send to the delegator.
   */
  const isSelectedChildOpening = (hostRunId: string): boolean => {
    const collaboration = contextFor(hostRunId)
    const agentRunId = selectedChild(hostRunId)
    const local = agentRunId && collaboration ? collaboration.getChild(agentRunId) : null
    const own = local && collaboration ? agentRunDelegatedRunSubject(collaboration.index, local.agentRunId) : null
    return Boolean(own && !delegatedRuns().bindingOf(own))
  }

  const childTargetFor = (hostRunId: string): ActiveAgentWorkspaceTarget | null => {
    const collaboration = contextFor(hostRunId)
    const agentRunId = selectedChild(hostRunId)
    const local = agentRunId ? collaboration?.getChild(agentRunId) : null
    // autobyteus-278: a remote child is opened like a local copy; its node keeps its workspace.
    const remote = agentRunId && !local ? collaboration?.getRemoteChild(agentRunId) : null
    const child = local ?? remote
    if (!collaboration || !child) return null
    const kind = child.kind === 'task_team_member' || child.kind === 'remote_team_member' ? 'agent_run_task_team_member' as const : 'agent_run_task_agent' as const
    const own = local ? agentRunDelegatedRunSubject(collaboration.index, child.agentRunId) : null
    if (own) {
      const binding = delegatedRuns().bindingOf(own)
      if (!binding) return null
      return Object.freeze({
        kind, host: Object.freeze({ hostRunId }), address: child.address, agentRunId: child.agentRunId,
        collaborationMessages: collaboration.messagesView(child.agentRunId),
        access: 'live' as const, ...binding,
      })
    }
    const context = collaboration.getAgentContext(child.agentRunId)
    if (!context) return null
    const service = () => { assertNotTerminating(hostRunId); return services.get(hostRunId) }
    return Object.freeze({
      kind,
      host: Object.freeze({ hostRunId }),
      address: child.address,
      agentRunId: child.agentRunId,
      context,
      workspaceRootPath: null,
      collaborationMessages: collaboration.messagesView(child.agentRunId),
      // A peer's child is read through the host (autobyteus-278).
      browse: Object.freeze({ kind: 'standaloneMember' as const, hostRunId, memberAddress: child.address, agentRunId: child.agentRunId }),
      // A peer's child is always addressable: a message wakes it through the host's stream.
      access: 'live' as const,
      interaction: Object.freeze({
        send: (content: string, files: readonly ContextFilePath[]) => submit(hostRunId, child.agentRunId, context, content, files),
        interrupt: async () => { await service()?.interrupt(child.agentRunId) },
        decideTool: async (invocationId: string, approved: boolean, reason: string | null) => {
          await service()?.decideTool(child.agentRunId, invocationId, approved, reason)
        },
      }),
    })
  }

  const release = (hostRunId: string) => {
    inspections.delete(hostRunId)
    terminations.delete(hostRunId)
    detach(hostRunId)
    setContext(hostRunId, null)
    participantMessages.releaseRoot('agent', hostRunId)
    memberLoader().releaseRoot(loaderRoot(hostRunId))
    delete selection[hostRunId]
    delete expandedTeams[hostRunId]
    delete errors[hostRunId]
  }

  /** Releases every host's view and stream: the window's node changed, or the phone's session ended (autobyteus-435). */
  const releaseAll = () => {
    const ids = new Set([...Object.keys(contexts.value), ...services.keys(), ...inspections.keys(), ...terminations.keys()])
    ids.forEach(release)
  }
  watch(() => binding.bindingRevision, releaseAll, { flush: 'sync' })

  return {
    contexts, errors, contextFor, syncHost, inspect, viewFor, attach, release, releaseAll, beginHostTermination,
    selectChild, selectedChild, ensureStoredView, selectTaskRow, isTaskTeamExpanded, toggleTaskTeam, taskRows, hostMessagesView, childTargetFor, isSelectedChildOpening, submit,
  }
})
