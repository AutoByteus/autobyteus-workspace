import type { WorkspaceSelectionIntent } from '~/stores/agentSelectionStore'
import { isDraftUploadedContextAttachment, coerceDraftUploadedContextAttachment } from '~/utils/contextFiles/contextAttachmentModel'
import { RootExecutionViewDtoSchema } from '@autobyteus/collaboration-stream-contracts'
import { defineStore } from 'pinia'
import { ref, shallowReactive, watch } from 'vue'
import type { AgentContext } from '~/types/agent/AgentContext'
import type { ContextFilePath } from '~/types/conversation'
import type { ActiveAgentWorkspaceTarget, WorkspaceAccess } from '~/types/workspace/activeAgentWorkspaceTarget'
import type { OrgWorkspaceSelection } from '~/services/agentOrgExecution/agentOrgExecutionViewIndex'
import type { AgentOrgExecutionContext } from '~/services/agentOrgExecution/agentOrgExecutionContext'
import { stageAgentOrgExecutionContext } from '~/services/agentOrgExecution/agentOrgContextHydration'
import { AgentOrgStreamingService } from '~/services/agentOrgExecution/agentOrgStreamingService'
import { beginLocalUserSubmission, failLocalSubmission, finalizeLocalSubmissionAttachments, type LocalUserSubmissionHandle } from '~/services/runSubmission/localUserSubmission'
import { upsertUserMessageByIdentity } from '~/services/agentStreaming/handlers/userMessageProjection'
import { GetAgentOrgRunInspection } from '~/graphql/queries/runHistoryQueries'
import { getApolloClient } from '~/utils/apolloClient'
import { useRunHistoryStore } from '~/stores/runHistoryStore'
import { useContextFileUploadStore } from '~/stores/contextFileUploadStore'
import { buildOrgMemberDraftContextFileOwner, buildOrgMemberFinalContextFileOwner } from '~/utils/contextFiles/contextFileOwner'
import { useAgentOrgRunStore } from '~/stores/agentOrgRunStore'

export const useAgentOrgContextsStore = defineStore('agentOrgContexts', () => {
  const contexts = ref<Record<string, AgentOrgExecutionContext>>({})
  const errors = ref<Record<string, string | null>>({})
  const pendingFocus = ref<Record<string, OrgWorkspaceSelection | string | null | undefined>>({})
  const operations = ref<Record<string, 'continuation' | 'stop'>>({})
  const services = new Map<string, AgentOrgStreamingService>()
  const inspections = new Map<string, Promise<void>>()
  const generations = new Map<string, symbol>()
  const submissions = new Map<string, LocalUserSubmissionHandle>()
  const deferredDisposals = new Set<string>()
  const keyFor = (root: string, agent: string) => `${root}\0${agent}`
  const report = (id: string, cause: unknown) => {
    errors.value = { ...errors.value, [id]: cause instanceof Error ? cause.message : String(cause) }
  }

  const publish = (id: string, candidate: AgentOrgExecutionContext, commitActivities: () => void) => {
    const previous = contexts.value[id]
    // Validate retained identity before committing any projection or activity.
    for (const entry of candidate.listAgentContextEntries()) {
      const old = previous?.index.agents.get(entry.agentRunId)
      if (old && old.address !== entry.memberAddress) throw new Error('AgentOrg candidate retained address mismatch.')
      const submission = submissions.get(keyFor(id, entry.agentRunId))
      if (submission && !entry.context.conversation.messages.some((message) => message.type === 'user'
        && (message.messageId === submission.message.messageId || message.dedupeKey === submission.message.dedupeKey))) {
        upsertUserMessageByIdentity({ context: entry.context, userMessage: submission.message })
      }
    }
    commitActivities()
    if (previous) candidate.adoptLocalContexts(previous)
    const requested = pendingFocus.value[id]
    if (requested !== undefined) candidate.select(requested)
    contexts.value = { ...contexts.value, [id]: candidate }
    errors.value = { ...errors.value, [id]: null }
    useRunHistoryStore().applyAgentOrgActivity(id, candidate.isActive)
  }

  const retireStream = (id: string) => {
    const service = services.get(id)
    services.delete(id)
    service?.disconnect()
  }
  const markHistorical = (id: string) => {
    generations.delete(id)
    contexts.value[id]?.setActive(false)
    useRunHistoryStore().applyAgentOrgActivity(id, false)
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
      publish: (candidate, commitActivities) => publish(id, candidate, commitActivities),
      reportError: (message) => report(id, message),
      onInactive: () => markHistorical(id),
      onAcceptedExternalUserMessage: () => { void useRunHistoryStore().refreshAgentOrgHistory() },
    })
    services.set(id, service)
    service.connect()
    return service
  }

  const disconnect = (id: string): void => {
    if (operations.value[id] || [...submissions.keys()].some((key) => key.startsWith(`${id}\0`))) {
      deferredDisposals.add(id)
      return
    }
    generations.delete(id)
    inspections.delete(id)
    retireStream(id)
    const next = { ...contexts.value }; delete next[id]; contexts.value = next
    const nextErrors = { ...errors.value }; delete nextErrors[id]; errors.value = nextErrors
    const nextFocus = { ...pendingFocus.value }; delete nextFocus[id]; pendingFocus.value = nextFocus
    deferredDisposals.delete(id)
  }
  const finishOperation = (id: string) => {
    const next = { ...operations.value }; delete next[id]; operations.value = next
    if (deferredDisposals.has(id)) disconnect(id)
  }
  const select = (id: string, selection: OrgWorkspaceSelection | string | null): void => {
    pendingFocus.value = { ...pendingFocus.value, [id]: selection }
    contexts.value[id]?.select(selection)
  }

  const readInspection = async (id: string, intent?: WorkspaceSelectionIntent): Promise<void> => {
    const generation = Symbol(id)
    generations.set(id, generation)
    const ownsGeneration = () => generations.get(id) === generation
    const current = () => ownsGeneration() && (!intent || intent.isCurrent())
    try {
      const result = await getApolloClient().query({ query: GetAgentOrgRunInspection,
        variables: { orgRunId: id }, fetchPolicy: 'network-only', context: { queryDeduplication: false } })
      if (!current()) return
      if (result.errors?.length) throw new Error(result.errors.map((e: { message: string }) => e.message).join(', '))
      const envelope = RootExecutionViewDtoSchema.parse(result.data?.getAgentOrgRunInspection)
      if (envelope.root_subject_kind !== 'agent_org' || envelope.root_run_id !== id) throw new Error('AgentOrg inspection root mismatch.')
      const staged = await stageAgentOrgExecutionContext({ source: 'inspection', orgRunId: id, view: envelope.root_org, isCurrent: current })
      if (!current()) return
      const candidate = shallowReactive(staged.context)
      publish(id, candidate, staged.commitActivities)
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
    deferredDisposals.delete(id)
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

  const accessFor = (id: string, agentRunId: string): 'live' | 'continuable' | 'read_only' => {
    const org = contexts.value[id]
    const agent = org?.index.agents.get(agentRunId)
    if (!org || !agent || operations.value[id]) return 'read_only'
    if (org.phase === 'historical' && !org.isActive && !agent.task) return 'continuable'
    if (org.phase === 'live' && org.isActive && agent.live && services.get(id)?.isReady()) return 'live'
    return 'read_only'
  }

  const submit = async (id: string, agentRunId: string, address: string, context: AgentContext,
    content: string, contextPaths: readonly ContextFilePath[]): Promise<void> => {
    const org = contexts.value[id]
    const access = accessFor(id, agentRunId)
    if (!org || org.getAgentContext(agentRunId) !== context || org.index.requireAgent(agentRunId).address !== address
      || access === 'read_only') throw new Error('AgentOrg send target is not ready or is stale.')
    if (operations.value[id] || context.submissionPending) throw new Error('AgentOrg member submission is already pending.')
    if (access === 'continuable') operations.value = { ...operations.value, [id]: 'continuation' }
    let attachments = contextPaths.map((attachment) => ({ ...attachment }))
    const messageId = crypto.randomUUID()
    const dedupeKey = `member_input:${id}:${agentRunId}:${messageId}`
    const submission = beginLocalUserSubmission(context, { text: content, attachments, navigationTarget: null })
    Object.assign(submission.message, { messageId, dedupeKey })
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
        const service = attach(id)
        await service.whenReady()
      }
      const ready = contexts.value[id]
      if (ready?.getAgentContext(agentRunId) !== context || ready.index.requireAgent(agentRunId).address !== address) {
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
      await service.sendPrepared({ agentRunId, content, attachments, messageId, dedupeKey })
    } catch (cause) {
      failLocalSubmission(submission, cause)
      if (!draftEdited) { context.requirement = content; context.contextFilePaths = attachments }
      throw cause
    } finally {
      stopWatching()
      submissions.delete(key)
      if (access === 'continuable') finishOperation(id)
      else if (deferredDisposals.has(id)) disconnect(id)
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
    generations.delete(id)
    try {
      await useAgentOrgRunStore().terminate(id)
      markHistorical(id)
      await readInspection(id)
    } catch (cause) { report(id, cause); throw cause }
    finally { finishOperation(id) }
  }

  const contextFor = (id: string): AgentOrgExecutionContext | null => contexts.value[id] ?? null
  const errorFor = (id: string): string | null => errors.value[id] ?? null
  return { contexts, errors, operations, openForInspection, disconnect, select, contextFor, errorFor, activeTargetFor, stopAndInspect }
})
