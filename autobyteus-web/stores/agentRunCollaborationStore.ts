import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { defineStore } from 'pinia'
import { shallowReactive, shallowRef, watch } from 'vue'
import type { ActiveAgentWorkspaceTarget } from '~/types/workspace/activeAgentWorkspaceTarget'
import type { CollaborationMessagesContextView } from '~/types/workspace/collaborationMessagesContextView'
import { AgentRunCollaborationContext } from '~/services/agentCollaboration/agentRunCollaborationContext'
import { AgentRunCollaborationStreamingService } from '~/services/agentCollaboration/agentRunCollaborationStreamingService'
import { readAgentRunCollaboration } from '~/services/agentCollaboration/agentRunCollaborationHydration'
import { rebuildOfView, useCollaborationParticipantMessagesStore } from '~/services/collaborationMessages/collaborationParticipantMessages'
import { subjectOfTarget, type DelegatedRunSubject } from '~/services/delegatedRuns/delegatedRunSubjects'
import type { RunTreeOpenTargetDto, RunTreeRowDto } from '@autobyteus/collaboration-stream-contracts'
import { isTeamRow } from '~/utils/runTree/runTreeDisplayRows'
import { useDelegatedRunsStore } from '~/stores/delegatedRunsStore'
import { useRunTreeStore } from '~/stores/runTreeStore'

const delegatedRuns = () => useDelegatedRunsStore()

/**
 * The client side of standalone runs' collaboration roots (autobyteus-461 SR-084): each run's view and Team tab, and
 * the row the user selected in its tree. The rows are its tree's (`runTreeStore`); a selected row opens its own run
 * (rule 2), by the target the server gave it, and this store only keeps which one.
 *
 * Reading never restores a run: a listed run's stored view comes from `agentRunCollaboration`. The open run's view has
 * its stream whether the run's own agent runs or not (SR-045), and the stream never restores the run.
 */
export const useAgentRunCollaborationStore = defineStore('agentRunCollaboration', () => {
  const contexts = shallowRef<Record<string, AgentRunCollaborationContext>>({})
  /** The tree row the user selected under each run (SR-084): its key, where it opens, and its address. */
  const selectedRows = shallowReactive<Record<string, Readonly<{ key: string; target: RunTreeOpenTargetDto; address: string | null }> | null>>({})
  /** Tree rows the user expanded or collapsed (by key); a team row starts collapsed, any other row expanded. */
  const toggledRows = shallowReactive<Record<string, readonly string[]>>({})
  const errors = shallowReactive<Record<string, string | null>>({})
  const services = new Map<string, AgentRunCollaborationStreamingService>()
  /** A read of a hub's view in flight; it ends with its failure's reason, or null. */
  const inspections = new Map<string, Promise<string | null>>()
  const terminations = new Map<string, object>()
  const binding = useWindowNodeContextStore()
  const participantMessages = useCollaborationParticipantMessagesStore()
  const assertNotTerminating = (id: string) => {
    if (terminations.has(id)) throw new Error('This Agent collaboration is being stopped.')
  }

  const setContext = (runId: string, context: AgentRunCollaborationContext | null) => {
    const next = { ...contexts.value }
    if (context) next[runId] = context
    else delete next[runId]
    contexts.value = next
  }

  const publish = (runId: string, context: AgentRunCollaborationContext) => {
    setContext(runId, context)
    errors[runId] = null
    // Every publication is a rebuilt view (inspect, attach, reopen): the Team tab's lists load again when a message
    // could have been missed meanwhile (SR-004, SR-005).
    participantMessages.reloadRoot('agent', runId, rebuildOfView(context.view), (agentRunId) => context.holdsAgent(agentRunId))
  }

  const attach = (runId: string): AgentRunCollaborationStreamingService => {
    assertNotTerminating(runId)
    inspections.delete(runId)
    const existing = services.get(runId)
    if (existing) return existing
    const revision = binding.bindingRevision
    const isCurrent = () => services.get(runId) === service
      && binding.bindingRevision === revision && !terminations.has(runId)
    const service = new AgentRunCollaborationStreamingService({
      runId, isCurrent,
      publish: (context) => {
        if (!isCurrent()) throw new Error('Agent collaboration stream ownership released.')
        publish(runId, context)
      },
      reportError: (message) => { if (isCurrent()) errors[runId] = message },
    })
    services.set(runId, service)
    service.connect()
    return service
  }

  const detach = (runId: string) => {
    const service = services.get(runId)
    services.delete(runId)
    service?.disconnect()
  }

  /** Reads and publishes the stored (or live) view without restoring anything; ends with the read's failure, or null. */
  const read = (runId: string): Promise<string | null> => {
    if (terminations.has(runId) || services.has(runId)) return Promise.resolve(null)
    const pending = inspections.get(runId)
    if (pending) return pending
    const revision = binding.bindingRevision
    const isCurrent = () => inspections.get(runId) === attempt
      && binding.bindingRevision === revision && !services.has(runId) && !terminations.has(runId)
    const attempt = (async (): Promise<string | null> => {
      try {
        const view = await readAgentRunCollaboration(runId)
        if (!isCurrent()) return null
        if (!view) { setContext(runId, null); return null }
        if (isCurrent()) publish(runId, new AgentRunCollaborationContext({ runId, view }))
        return null
      } catch (cause) {
        const failure = cause instanceof Error ? cause.message : String(cause)
        if (isCurrent()) errors[runId] = failure
        return failure
      }
    })().finally(() => { if (inspections.get(runId) === attempt) inspections.delete(runId) })
    inspections.set(runId, attempt)
    return attempt
  }
  /** Loads the stored (or live) view without restoring anything; a failure is kept as the hub's error. */
  const inspect = async (runId: string): Promise<void> => { await read(runId) }

  /**
   * A Stop of the run's own agent (one request-local exclusion owned here, never a server receipt). The view keeps its
   * stream and the runs it delegated keep their states: they are runs of their own (autobyteus-461 SR-045). A confirmed Stop
   * marks the run's agent stopped; the server ends the run's root, and the stream reconnects to a fresh view.
   */
  const beginRunTermination = (runId: string) => {
    assertNotTerminating(runId)
    const token = {}
    const revision = binding.bindingRevision
    terminations.set(runId, token)
    let confirmed = false
    return Object.freeze({
      confirm: (): boolean => {
        if (confirmed || terminations.get(runId) !== token || binding.bindingRevision !== revision) return false
        contexts.value[runId]?.setActive(false)
        confirmed = true
        return true
      },
      finish: (): void => {
        if (terminations.get(runId) !== token) return
        terminations.delete(runId)
        // The Stop ended the run's root, and with it the view's stream: the open view reconnects to the stopped run's
        // fresh view, which keeps its tree live (SR-045, CR-461-111).
        services.get(runId)?.connect()
      },
    })
  }

  /**
   * Called for the selected standalone run. The open run's view keeps its stream whether its own agent runs or not
   * (autobyteus-461 SR-045): the runs it delegated are runs of their own, so its tree stays live while it is stopped. Its
   * agent's state only updates the view.
   */
  const syncRun = (runId: string, runActive: boolean) => {
    if (terminations.has(runId)) return
    if (contexts.value[runId]?.phase === 'reopen_required' && !services.has(runId)) return
    attach(runId)
    contexts.value[runId]?.setActive(runActive)
  }

  const contextFor = (runId: string): AgentRunCollaborationContext | null => contexts.value[runId] ?? null

  /** The run's own agent is selected: no row under it. */
  const selectStandaloneRun = (runId: string) => { selectedRows[runId] = null }

  /** The selected row, while it is in the run's tree; a row that left it returns the view to the run's own agent. */
  const selectedRow = (runId: string) => {
    const picked = selectedRows[runId]
    return picked && useRunTreeStore().rowsOf({ kind: 'agent', runId: runId }).some((row) => row.key === picked.key) ? picked : null
  }

  /**
   * A tree row's open (SR-084, through `openRunTarget`): where the server says it opens. The run's own row selects its
   * own agent; a delegated run opens as its own run (rule 2) by its target, a peer's run by its own identity on its node
   * (G-D1). Answers whether it was selected (false for a row error, or while the run's view is not loaded).
   */
  const selectTreeRow = (runId: string, row: RunTreeRowDto): boolean => {
    const target = row.openTarget
    if (!target || target.runKind === 'agent_org' || !contextFor(runId)) return false
    if (!target.nodeId && target.runKind === 'agent' && target.runId === runId) {
      selectStandaloneRun(runId)
      return true
    }
    selectedRows[runId] = Object.freeze({ key: row.key, target, address: row.address })
    delegatedRuns().ensureOpen(subjectOfSelected(target, row.address))
    return true
  }
  /** The selected row's own run: on this node, or a peer's run by its own identity on its node (G-D1). */
  const subjectOfSelected = (target: RunTreeOpenTargetDto, address: string | null): DelegatedRunSubject =>
    subjectOfTarget({ runKind: target.runKind as 'agent' | 'agent_team', runId: target.runId, agentRunId: target.agentRunId, nodeId: target.nodeId },
      address ?? '')
  const selectedRowKey = (runId: string): string | null => selectedRow(runId)?.key ?? null
  const isTreeRowExpanded = (runId: string, row: RunTreeRowDto): boolean =>
    isTeamRow(row) === (toggledRows[runId] ?? []).includes(row.key)
  const toggleTreeRow = (runId: string, key: string): void => {
    const current = toggledRows[runId] ?? []
    toggledRows[runId] = Object.freeze(current.includes(key) ? current.filter((candidate) => candidate !== key) : [...current, key])
  }
  /** The agent of the selected row (null: the run's own agent). */
  const selectedChild = (runId: string): string | null => selectedRow(runId)?.target.agentRunId ?? null

  /**
   * A listed standalone run's stored view, read once without restoring the run, when it has collaboration and is not
   * loaded yet; a live run is kept current by its stream.
   */
  const ensureStoredView = (runId: string, hasCollaboration: boolean): void => {
    if (hasCollaboration && !contextFor(runId)) void inspect(runId)
  }

  /** The run's Team tab: messages with the runs it delegated, once it has any. */
  const runMessagesView = (runId: string): CollaborationMessagesContextView | null => {
    const context = contextFor(runId)
    return context?.hasDelegatedRuns ? context.messagesView(runId) : null
  }

  /**
   * A run this run delegated is selected under it, and its own run is still opening (rule 2): the view has no target
   * until it is open, never this run's own, as in the Team and Org views (CR-461-057). Typing meanwhile would otherwise
   * go to the delegator's draft, and its send to the delegator.
   */
  const isSelectedChildOpening = (runId: string): boolean => {
    const picked = selectedRow(runId)
    return Boolean(picked && contextFor(runId) && !delegatedRuns().bindingOf(subjectOfSelected(picked.target, picked.address)))
  }

  /** The selected row's own run, as the composer and center view target: bound to its own context and stream (rule 2). */
  const childTargetFor = (runId: string): ActiveAgentWorkspaceTarget | null => {
    const collaboration = contextFor(runId)
    const picked = selectedRow(runId)
    if (!collaboration || !picked) return null
    const own = delegatedRuns().bindingOf(subjectOfSelected(picked.target, picked.address))
    if (!own) return null
    const agentRunId = picked.target.agentRunId
    return Object.freeze({
      kind: picked.target.runKind === 'agent_team' && !picked.target.nodeId ? 'agent_run_task_team_member' as const : 'agent_run_task_agent' as const,
      viewRun: Object.freeze({ runId }), address: (picked.address ?? '') as never, agentRunId,
      collaborationMessages: collaboration.messagesView(agentRunId),
      access: 'live' as const, ...own,
    })
  }

  const release = (runId: string) => {
    inspections.delete(runId)
    terminations.delete(runId)
    detach(runId)
    setContext(runId, null)
    participantMessages.releaseRoot('agent', runId)
    delete selectedRows[runId]
    delete toggledRows[runId]
    delete errors[runId]
  }

  /** Releases every run's view and stream: the window's node changed, or the phone's session ended (autobyteus-435). */
  const releaseAll = () => {
    const ids = new Set([...Object.keys(contexts.value), ...services.keys(), ...inspections.keys(), ...terminations.keys()])
    ids.forEach(release)
  }
  watch(() => binding.bindingRevision, releaseAll, { flush: 'sync' })

  return {
    contexts, errors, contextFor, syncRun, inspect, attach, release, releaseAll, beginRunTermination,
    selectStandaloneRun, selectedChild, ensureStoredView, selectTreeRow, selectedRowKey, isTreeRowExpanded, toggleTreeRow, runMessagesView, childTargetFor, isSelectedChildOpening,
  }
})
