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
 * Reading never restores a host: a listed run's stored view comes from `agentRunCollaboration`. The open run's view has
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

  const setContext = (hostRunId: string, context: AgentRunCollaborationContext | null) => {
    const next = { ...contexts.value }
    if (context) next[hostRunId] = context
    else delete next[hostRunId]
    contexts.value = next
  }

  const publish = (hostRunId: string, context: AgentRunCollaborationContext) => {
    setContext(hostRunId, context)
    errors[hostRunId] = null
    // Every publication is a rebuilt view (inspect, attach, reopen): the Team tab's lists load again when a message
    // could have been missed meanwhile (SR-004, SR-005).
    participantMessages.reloadRoot('agent', hostRunId, rebuildOfView(context.view), (agentRunId) => context.holdsAgent(agentRunId))
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
        if (isCurrent()) publish(hostRunId, new AgentRunCollaborationContext({ hostRunId, view }))
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
   * A Stop of the run's own agent (one request-local exclusion owned here, never a server receipt). The view keeps its
   * stream and the runs it delegated keep their states: they are runs of their own (autobyteus-461 SR-045). A confirmed Stop
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
        if (terminations.get(hostRunId) !== token) return
        terminations.delete(hostRunId)
        // The Stop ended the run's root, and with it the view's stream: the open view reconnects to the stopped run's
        // fresh view, which keeps its tree live (SR-045, CR-461-111).
        services.get(hostRunId)?.connect()
      },
    })
  }

  /**
   * Called for the selected standalone run. The open run's view keeps its stream whether its own agent runs or not
   * (autobyteus-461 SR-045): the runs it delegated are runs of their own, so its tree stays live while it is stopped. Its
   * agent's state only updates the view.
   */
  const syncHost = (hostRunId: string, hostRunning: boolean) => {
    if (terminations.has(hostRunId)) return
    if (contexts.value[hostRunId]?.phase === 'reopen_required' && !services.has(hostRunId)) return
    attach(hostRunId)
    contexts.value[hostRunId]?.setActive(hostRunning)
  }

  const contextFor = (hostRunId: string): AgentRunCollaborationContext | null => contexts.value[hostRunId] ?? null

  /** The run's own agent is selected: no row under it. */
  const selectHost = (hostRunId: string) => { selectedRows[hostRunId] = null }

  /** The selected row, while it is in the run's tree; a row that left it returns the view to the run's own agent. */
  const selectedRow = (hostRunId: string) => {
    const picked = selectedRows[hostRunId]
    return picked && useRunTreeStore().rowsOf({ kind: 'agent', runId: hostRunId }).some((row) => row.key === picked.key) ? picked : null
  }

  /**
   * A tree row's open (SR-084, through `openRunTarget`): where the server says it opens. The run's own row selects its
   * own agent; a delegated run opens as its own run (rule 2) by its target, a peer's run by its own identity on its node
   * (G-D1). Answers whether it was selected (false for a row error, or while the run's view is not loaded).
   */
  const selectTreeRow = (hostRunId: string, row: RunTreeRowDto): boolean => {
    const target = row.openTarget
    if (!target || target.runKind === 'agent_org' || !contextFor(hostRunId)) return false
    if (!target.nodeId && target.runKind === 'agent' && target.runId === hostRunId) {
      selectHost(hostRunId)
      return true
    }
    selectedRows[hostRunId] = Object.freeze({ key: row.key, target, address: row.address })
    delegatedRuns().ensureOpen(subjectOfSelected(target, row.address))
    return true
  }
  /** The selected row's own run: on this node, or a peer's run by its own identity on its node (G-D1). */
  const subjectOfSelected = (target: RunTreeOpenTargetDto, address: string | null): DelegatedRunSubject =>
    subjectOfTarget({ runKind: target.runKind as 'agent' | 'agent_team', runId: target.runId, agentRunId: target.agentRunId, nodeId: target.nodeId },
      address ?? '')
  const selectedRowKey = (hostRunId: string): string | null => selectedRow(hostRunId)?.key ?? null
  const isTreeRowExpanded = (hostRunId: string, row: RunTreeRowDto): boolean =>
    isTeamRow(row) === (toggledRows[hostRunId] ?? []).includes(row.key)
  const toggleTreeRow = (hostRunId: string, key: string): void => {
    const current = toggledRows[hostRunId] ?? []
    toggledRows[hostRunId] = Object.freeze(current.includes(key) ? current.filter((candidate) => candidate !== key) : [...current, key])
  }
  /** The agent of the selected row (null: the run's own agent). */
  const selectedChild = (hostRunId: string): string | null => selectedRow(hostRunId)?.target.agentRunId ?? null

  /**
   * A listed standalone run's stored view, read once without restoring the run, when it has collaboration and is not
   * loaded yet; a live run is kept current by its stream.
   */
  const ensureStoredView = (hostRunId: string, hasCollaboration: boolean): void => {
    if (hasCollaboration && !contextFor(hostRunId)) void inspect(hostRunId)
  }

  /** The host's Team tab: messages with the runs it delegated, once it has any. */
  const hostMessagesView = (hostRunId: string): CollaborationMessagesContextView | null => {
    const context = contextFor(hostRunId)
    return context?.hasDelegatedRuns ? context.messagesView(hostRunId) : null
  }

  /**
   * A run this run delegated is selected under it, and its own run is still opening (rule 2): the view has no target
   * until it is open, never this run's own, as in the Team and Org views (CR-461-057). Typing meanwhile would otherwise
   * go to the delegator's draft, and its send to the delegator.
   */
  const isSelectedChildOpening = (hostRunId: string): boolean => {
    const picked = selectedRow(hostRunId)
    return Boolean(picked && contextFor(hostRunId) && !delegatedRuns().bindingOf(subjectOfSelected(picked.target, picked.address)))
  }

  /** The selected row's own run, as the composer and center view target: bound to its own context and stream (rule 2). */
  const childTargetFor = (hostRunId: string): ActiveAgentWorkspaceTarget | null => {
    const collaboration = contextFor(hostRunId)
    const picked = selectedRow(hostRunId)
    if (!collaboration || !picked) return null
    const own = delegatedRuns().bindingOf(subjectOfSelected(picked.target, picked.address))
    if (!own) return null
    const agentRunId = picked.target.agentRunId
    return Object.freeze({
      kind: picked.target.runKind === 'agent_team' && !picked.target.nodeId ? 'agent_run_task_team_member' as const : 'agent_run_task_agent' as const,
      host: Object.freeze({ hostRunId }), address: (picked.address ?? '') as never, agentRunId,
      collaborationMessages: collaboration.messagesView(agentRunId),
      access: 'live' as const, ...own,
    })
  }

  const release = (hostRunId: string) => {
    inspections.delete(hostRunId)
    terminations.delete(hostRunId)
    detach(hostRunId)
    setContext(hostRunId, null)
    participantMessages.releaseRoot('agent', hostRunId)
    delete selectedRows[hostRunId]
    delete toggledRows[hostRunId]
    delete errors[hostRunId]
  }

  /** Releases every host's view and stream: the window's node changed, or the phone's session ended (autobyteus-435). */
  const releaseAll = () => {
    const ids = new Set([...Object.keys(contexts.value), ...services.keys(), ...inspections.keys(), ...terminations.keys()])
    ids.forEach(release)
  }
  watch(() => binding.bindingRevision, releaseAll, { flush: 'sync' })

  return {
    contexts, errors, contextFor, syncHost, inspect, attach, release, releaseAll, beginHostTermination,
    selectHost, selectedChild, ensureStoredView, selectTreeRow, selectedRowKey, isTreeRowExpanded, toggleTreeRow, hostMessagesView, childTargetFor, isSelectedChildOpening,
  }
})
