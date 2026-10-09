import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { useAgentActivityStore } from '~/stores/agentActivityStore'
import { defineStore } from 'pinia'
import { shallowReactive, shallowRef, watch } from 'vue'
import type { AgentContext } from '~/types/agent/AgentContext'
import type { ContextFilePath } from '~/types/conversation'
import type { ActiveAgentWorkspaceTarget } from '~/types/workspace/activeAgentWorkspaceTarget'
import type { CollaborationMessagesContextView } from '~/types/workspace/collaborationMessagesContextView'
import { AgentRunCollaborationContext, type AgentRunTaskTreeRow } from '~/services/agentCollaboration/agentRunCollaborationContext'
import { AgentRunCollaborationStreamingService } from '~/services/agentCollaboration/agentRunCollaborationStreamingService'
import { readAgentRunCollaboration, stageAgentRunCollaborationContext } from '~/services/agentCollaboration/agentRunCollaborationHydration'
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

/**
 * The client side of standalone runs' collaboration roots: the task children brought in with
 * `@`, their rows under the run row, direct chat with a child and the run's Team tab.
 *
 * Reading never restores a host: a stored view comes from `agentRunCollaboration`. The live
 * stream is attached only while the host runs, or when the user sends to a child (connecting
 * makes the root command-ready, restoring the host).
 */
export const useAgentRunCollaborationStore = defineStore('agentRunCollaboration', () => {
  const contexts = shallowRef<Record<string, AgentRunCollaborationContext>>({})
  const selection = shallowReactive<Record<string, string | null>>({})
  const expandedTeams = shallowReactive<Record<string, readonly string[]>>({})
  const errors = shallowReactive<Record<string, string | null>>({})
  const services = new Map<string, AgentRunCollaborationStreamingService>()
  const inspections = new Map<string, Promise<void>>()
  const autoExpanded = new Set<string>()
  const terminations = new Map<string, object>()
  const binding = useWindowNodeContextStore()
  const activities = useAgentActivityStore()
  const assertNotTerminating = (id: string) => {
    if (terminations.has(id)) throw new Error('This Agent collaboration is being stopped.')
  }

  const setContext = (hostRunId: string, context: AgentRunCollaborationContext | null) => {
    const next = { ...contexts.value }
    if (context) next[hostRunId] = context
    else delete next[hostRunId]
    contexts.value = next
  }

  /** A task Team opens once when it first appears, so its members are visible. */
  const openNewTaskTeams = (hostRunId: string, context: AgentRunCollaborationContext) => {
    const opened = [...(expandedTeams[hostRunId] ?? [])]
    for (const teamRunId of context.index.teams.keys()) {
      if (autoExpanded.has(teamRunId)) continue
      autoExpanded.add(teamRunId)
      if (!opened.includes(teamRunId)) opened.push(teamRunId)
    }
    expandedTeams[hostRunId] = Object.freeze(opened)
  }

  const publish = (hostRunId: string, context: AgentRunCollaborationContext, commit: () => void) => {
    const previous = contexts.value[hostRunId]
    const adopt = previous ? context.prepareLocalContextAdoption(previous) : () => undefined
    commit()
    adopt()
    setContext(hostRunId, context)
    errors[hostRunId] = null
    openNewTaskTeams(hostRunId, context)
    returnToHostWhenUnlisted(hostRunId, context)
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
      publish: (context, commit) => {
        if (!isCurrent()) throw new Error('Agent collaboration stream ownership released.')
        publish(hostRunId, context, commit)
      },
      onInactive: () => { if (isCurrent()) services.delete(hostRunId) },
      reportError: (message) => { if (isCurrent()) errors[hostRunId] = message },
      onCollaboratorAdded: (context) => { if (isCurrent()) openNewTaskTeams(hostRunId, context) },
      onTaskExecutionsClosed: (context) => { if (isCurrent()) returnToHostWhenUnlisted(hostRunId, context) },
    })
    services.set(hostRunId, service)
    service.connect()
    return service
  }

  const detach = (hostRunId: string) => {
    const service = services.get(hostRunId)
    services.delete(hostRunId)
    service?.disconnect()
  }

  /** Loads the stored (or live) view without restoring anything. */
  const inspect = (hostRunId: string): Promise<void> => {
    if (terminations.has(hostRunId) || services.has(hostRunId)) return Promise.resolve()
    const pending = inspections.get(hostRunId)
    if (pending) return pending
    const revision = binding.bindingRevision
    const activityRevisions = new Map(contexts.value[hostRunId]?.listAgentContextEntries()
      .map(entry => [entry.agentRunId, activities.getActivityContentRevision(entry.agentRunId)]))
    const isCurrent = () => inspections.get(hostRunId) === attempt
      && binding.bindingRevision === revision && !services.has(hostRunId) && !terminations.has(hostRunId)
    const attempt = (async () => {
      try {
        const view = await readAgentRunCollaboration(hostRunId)
        if (!isCurrent()) return
        if (!view) { setContext(hostRunId, null); return }
        const staged = await stageAgentRunCollaborationContext({ hostRunId, view, isCurrent, activityRevisions })
        if (isCurrent()) publish(hostRunId, staged.context, staged.commit)
      } catch (cause) {
        if (isCurrent()) errors[hostRunId] = cause instanceof Error ? cause.message : String(cause)
      }
    })().finally(() => { if (inspections.get(hostRunId) === attempt) inspections.delete(hostRunId) })
    inspections.set(hostRunId, attempt)
    return attempt
  }

  /** One request-local exclusion owned here, never a server receipt or input ledger. */
  const beginHostTermination = (hostRunId: string) => {
    assertNotTerminating(hostRunId)
    const token = {}
    const revision = binding.bindingRevision
    const root = contexts.value[hostRunId]
    const view = root?.view
    const children = root?.listAgentContextEntries().map(entry => ({ ...entry,
      state: entry.context.state, runtimeKind: entry.context.config.runtimeKind,
      instance: entry.context.state.inputProjection?.runInstanceId,
      activityIds: activities.getNativeCompactionActivityIds(entry.agentRunId),
    })) ?? []
    terminations.set(hostRunId, token)
    inspections.delete(hostRunId)
    // Deliberate retirement BEFORE the command: absence later is not a transport receipt.
    detach(hostRunId)
    root?.requireReopen('Agent collaboration requires fresh inspection after Stop.')
    let confirmed = false
    const ownsScope = () => terminations.get(hostRunId) === token
      && binding.bindingRevision === revision && contexts.value[hostRunId] === root
      && root?.view === view && !services.has(hostRunId)
    return Object.freeze({
      confirm: (): boolean => {
        if (confirmed || !ownsScope() || (root?.listAgentContextEntries().length ?? 0) !== children.length) return false
        // Validate the WHOLE batch before even one activity or context changes.
        if (children.some(child => root?.getAgentContext(child.agentRunId) !== child.context
          || root?.getChild(child.agentRunId)?.address !== child.memberAddress
          || child.context.state !== child.state || child.state.runId !== child.agentRunId
          || child.context.config.runtimeKind !== child.runtimeKind
          || (!!child.state.inputProjection?.runInstanceId && child.state.inputProjection.runInstanceId !== child.instance))) return false
        for (const child of children) {
          if (child.runtimeKind === 'autobyteus') {
            child.state.compactionStatus = activities.applyConfirmedNativeTermination(child.agentRunId,
              [...child.activityIds, ...activities.getNativeCompactionActivityIds(child.agentRunId)], child.state.compactionStatus)
          }
        }
        root?.setActive(false)
        confirmed = true
        return true
      },
      finish: (): void => {
        if (terminations.get(hostRunId) !== token) return
        // setActive replaced our captured view on success; all other ownership still holds.
        const inspectConfirmed = confirmed && binding.bindingRevision === revision
          && contexts.value[hostRunId] === root && !services.has(hostRunId)
        terminations.delete(hostRunId)
        if (inspectConfirmed) void inspect(hostRunId)
      },
    })
  }

  /**
   * Keeps one host's view in step with the host: live stream while the host runs; the stored
   * view otherwise. Called for the selected standalone run.
   */
  const syncHost = (hostRunId: string, hostRunning: boolean) => {
    if (terminations.has(hostRunId)) return
    if (contexts.value[hostRunId]?.phase === 'reopen_required' && !services.has(hostRunId)) return
    if (hostRunning) attach(hostRunId)
    else {
      detach(hostRunId)
      void inspect(hostRunId)
    }
  }

  const contextFor = (hostRunId: string): AgentRunCollaborationContext | null => contexts.value[hostRunId] ?? null

  const selectChild = (hostRunId: string, agentRunId: string | null) => {
    selection[hostRunId] = agentRunId && contextFor(hostRunId)?.isListed(agentRunId) ? agentRunId : null
  }
  const selectedChild = (hostRunId: string): string | null => selection[hostRunId] ?? null

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

  const submit = async (hostRunId: string, agentRunId: string, context: AgentContext,
    content: string, paths: readonly ContextFilePath[]): Promise<void> => {
    assertNotTerminating(hostRunId)
    if (contexts.value[hostRunId]?.getAgentContext(agentRunId) !== context) throw new Error('Agent collaboration child was replaced.')
    if (context.submissionPending) throw new Error('A message to this collaborator is already pending.')
    const mentions = mentionsPresentInText(content, context.requestedMentions)
    let attachments = paths.map((attachment) => ({ ...attachment }))
    const messageId = crypto.randomUUID()
    const dedupeKey = `member_input:${hostRunId}:${agentRunId}:${messageId}`
    const submission = beginLocalUserSubmission(context, { text: content, attachments, navigationTarget: null, mentions, identity: { messageId, dedupeKey } })
    try {
      // Attaching makes the root command-ready; a stopped host is restored first.
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

  /** The selected child of a standalone run, as the composer and center view target. */
  const childTargetFor = (hostRunId: string): ActiveAgentWorkspaceTarget | null => {
    const collaboration = contextFor(hostRunId)
    const agentRunId = selectedChild(hostRunId)
    const child = agentRunId ? collaboration?.getChild(agentRunId) : null
    const context = agentRunId ? collaboration?.getAgentContext(agentRunId) : null
    if (!collaboration || !child || !context) return null
    const service = () => { assertNotTerminating(hostRunId); return services.get(hostRunId) }
    return Object.freeze({
      kind: child.kind === 'task_team_member' ? 'agent_run_task_team_member' as const : 'agent_run_task_agent' as const,
      host: Object.freeze({ hostRunId }),
      address: child.address,
      agentRunId: child.agentRunId,
      context,
      workspaceRootPath: child.source.launchConfiguration.workspaceRootPath,
      collaborationMessages: collaboration.messagesView(child.agentRunId),
      // A child is not a top-level run package: its pages come from the host's collaboration package.
      browse: Object.freeze({ kind: 'standaloneMember' as const, hostRunId, memberAddress: child.address, agentRunId: child.agentRunId }),
      // A child is always addressable: a message wakes it (and its host) through the stream.
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
    delete selection[hostRunId]
    delete expandedTeams[hostRunId]
    delete errors[hostRunId]
  }

  watch(() => binding.bindingRevision, () => {
    const ids = new Set([...Object.keys(contexts.value), ...services.keys(), ...inspections.keys(), ...terminations.keys()])
    ids.forEach(release)
    autoExpanded.clear()
  }, { flush: 'sync' })

  return {
    contexts, errors, contextFor, syncHost, inspect, attach, release, beginHostTermination,
    selectChild, selectedChild, isTaskTeamExpanded, toggleTaskTeam, taskRows, hostMessagesView, childTargetFor, submit,
  }
})
