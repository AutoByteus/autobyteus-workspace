import { defineStore } from 'pinia'
import { shallowReactive, shallowRef } from 'vue'
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

  const publish = (hostRunId: string, context: AgentRunCollaborationContext, commitActivities: () => void) => {
    const previous = contexts.value[hostRunId]
    if (previous) context.adoptLocalContexts(previous)
    commitActivities()
    setContext(hostRunId, context)
    errors[hostRunId] = null
    openNewTaskTeams(hostRunId, context)
    const selected = selection[hostRunId]
    if (selected && !context.getChild(selected)) selection[hostRunId] = null
  }

  const attach = (hostRunId: string): AgentRunCollaborationStreamingService => {
    const existing = services.get(hostRunId)
    if (existing) return existing
    const service = new AgentRunCollaborationStreamingService({
      hostRunId,
      publish: (context, commit) => publish(hostRunId, context, commit),
      onInactive: () => { services.delete(hostRunId) },
      reportError: (message) => { errors[hostRunId] = message },
      onCollaboratorAdded: (context) => openNewTaskTeams(hostRunId, context),
    })
    services.set(hostRunId, service)
    service.connect()
    return service
  }

  const detach = (hostRunId: string) => {
    services.get(hostRunId)?.disconnect()
    services.delete(hostRunId)
  }

  /** Loads the stored (or live) view without restoring anything. */
  const inspect = (hostRunId: string): Promise<void> => {
    const pending = inspections.get(hostRunId)
    if (pending) return pending
    const attempt = (async () => {
      try {
        const view = await readAgentRunCollaboration(hostRunId)
        if (services.get(hostRunId)?.isReady()) return
        if (!view) { setContext(hostRunId, null); return }
        const staged = await stageAgentRunCollaborationContext({ hostRunId, view })
        publish(hostRunId, staged.context, staged.commitActivities)
      } catch (cause) {
        errors[hostRunId] = cause instanceof Error ? cause.message : String(cause)
      }
    })().finally(() => inspections.delete(hostRunId))
    inspections.set(hostRunId, attempt)
    return attempt
  }

  /**
   * Keeps one host's view in step with the host: live stream while the host runs; the stored
   * view otherwise. Called for the selected standalone run.
   */
  const syncHost = (hostRunId: string, hostRunning: boolean) => {
    if (hostRunning) attach(hostRunId)
    else {
      detach(hostRunId)
      void inspect(hostRunId)
    }
  }

  const contextFor = (hostRunId: string): AgentRunCollaborationContext | null => contexts.value[hostRunId] ?? null

  const selectChild = (hostRunId: string, agentRunId: string | null) => {
    selection[hostRunId] = agentRunId && contextFor(hostRunId)?.getChild(agentRunId) ? agentRunId : null
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
    if (context.submissionPending) throw new Error('A message to this collaborator is already pending.')
    const mentions = mentionsPresentInText(content, context.requestedMentions)
    let attachments = paths.map((attachment) => ({ ...attachment }))
    const messageId = crypto.randomUUID()
    const dedupeKey = `member_input:${hostRunId}:${agentRunId}:${messageId}`
    const submission = beginLocalUserSubmission(context, { text: content, attachments, navigationTarget: null, mentions })
    Object.assign(submission.message, { messageId, dedupeKey })
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
    const service = () => services.get(hostRunId)
    return Object.freeze({
      kind: child.kind === 'task_team_member' ? 'agent_run_task_team_member' as const : 'agent_run_task_agent' as const,
      host: Object.freeze({ hostRunId }),
      address: child.address,
      context,
      collaborationMessages: collaboration.messagesView(child.agentRunId),
      browse: Object.freeze({ kind: 'run' as const, runId: child.agentRunId }),
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
    detach(hostRunId)
    setContext(hostRunId, null)
    delete selection[hostRunId]
  }

  return {
    contexts, errors, contextFor, syncHost, inspect, attach, release,
    selectChild, selectedChild, isTaskTeamExpanded, toggleTaskTeam, taskRows, hostMessagesView, childTargetFor, submit,
  }
})
