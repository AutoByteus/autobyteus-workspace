import { getActivePinia } from 'pinia'
import type { AgentContext } from '~/types/agent/AgentContext'
import { useAgentActivityStore } from '~/stores/agentActivityStore'
import type { RunFileChangeArtifact } from '~/stores/runFileChangesStore'
import { overlayPendingUserMessages } from '~/services/agentStreaming/handlers/userMessageProjection'
import { primeRecentEventMonitorBaseline, resetRecentEventMonitorBaseline } from '~/services/eventMonitor/recentEventMonitorMutationCoordinator'
import { buildConversationFromProjection } from './runProjectionConversation'
import { buildActivitiesFromProjection } from './runProjectionActivityHydration'
import { reconcileTeamMemberToolState } from './teamMemberToolStateReconciliation'
import { commitMemberRunStates, fetchMemberRunState } from './memberRunStateHydration'

/** One member's stored conversation and activities, as every root's member-projection query returns them. */
export type MemberProjection = Readonly<{
  conversation?: Parameters<typeof buildConversationFromProjection>[1] | null
  activities?: Parameters<typeof buildActivitiesFromProjection>[0] | null
  hasEarlierActiveTraceEvents?: boolean | null
  lastActivityAt?: string | null
}>

/** What one root says about the member it asks to load, read again before the load writes. */
export type MemberLoadTarget = Readonly<{
  /** The member's context in the root's current context. */
  agent: AgentContext
  conversationDefaults: Parameters<typeof buildConversationFromProjection>[2]
  fetchProjection(): Promise<MemberProjection>
  fetchFileChanges(): Promise<RunFileChangeArtifact[]>
  /** Whether the root's live stream is ready, so live tool decisions win over the stored projection. */
  liveToolAuthority(): boolean
}>

export type MemberLoadOutcome = 'hydrated' | 'already_hydrated' | 'superseded'

const MAX_CONFLICT_ATTEMPTS = 3

type RootState = { generation: number; hydrated: Set<string>; loads: Map<string, Promise<MemberLoadOutcome>> }

/**
 * The one on-demand loader of a member's stored conversation, activities and files, for Team members, Org members
 * and a hub's copies (autobyteus-358, DS-003). It keeps a generation per root: every rebuild of the root's context
 * (open, stream recovery, a fresh snapshot, a reopen) begins a new one, in which no member is loaded, so a member
 * loaded before a failure is loaded again when it is next opened, never shown stale. Within a generation it loads a
 * member once (a second request joins the first) and commits through `commitMemberRunStates`.
 *
 * A live event or a shown local message during the fetch (presentation or activity revision changed), or an activity
 * commit conflict, retries the load at most three times; a load whose generation ended writes nothing.
 */
export class MemberLoader {
  private readonly roots = new Map<string, RootState>()

  private root(rootKey: string): RootState {
    let state = this.roots.get(rootKey)
    if (!state) {
      state = { generation: 0, hydrated: new Set(), loads: new Map() }
      this.roots.set(rootKey, state)
    }
    return state
  }

  /** The root's context was built or rebuilt: no member is loaded in the new generation. */
  beginRoot(rootKey: string): void {
    const previous = this.root(rootKey)
    this.roots.set(rootKey, { generation: previous.generation + 1, hydrated: new Set(), loads: new Map() })
  }

  /** The member's stored state was staged with the root's context (the focused member at open). */
  markHydrated(rootKey: string, agentRunId: string): void {
    this.root(rootKey).hydrated.add(agentRunId)
  }

  isHydrated(rootKey: string, agentRunId: string): boolean {
    return this.roots.get(rootKey)?.hydrated.has(agentRunId) ?? false
  }

  /** A live change the stored state may not hold yet: the member loads again when it is next opened. */
  invalidate(rootKey: string, agentRunIds: readonly string[]): void {
    const state = this.roots.get(rootKey)
    agentRunIds.forEach((agentRunId) => state?.hydrated.delete(agentRunId))
  }

  releaseRoot(rootKey: string): void {
    this.beginRoot(rootKey)
    this.roots.delete(rootKey)
  }

  /**
   * Loads one member unless it is loaded in the root's current generation; a load in flight is shared.
   * `resolve` names the member's current target, or null when the member left the root's current context.
   */
  ensure(rootKey: string, agentRunId: string, resolve: () => MemberLoadTarget | null): Promise<MemberLoadOutcome> {
    const state = this.root(rootKey)
    if (state.hydrated.has(agentRunId)) return Promise.resolve('already_hydrated')
    const existing = state.loads.get(agentRunId)
    if (existing) return existing
    const load = this.load(state, agentRunId, resolve).finally(() => {
      if (state.loads.get(agentRunId) === load) state.loads.delete(agentRunId)
    })
    state.loads.set(agentRunId, load)
    return load
  }

  private async load(state: RootState, agentRunId: string, resolve: () => MemberLoadTarget | null): Promise<MemberLoadOutcome> {
    const activityStore = useAgentActivityStore()
    const isCurrent = () => [...this.roots.values()].includes(state)
    for (let attempt = 0; attempt < MAX_CONFLICT_ATTEMPTS; attempt += 1) {
      const target = isCurrent() ? resolve() : null
      if (!target) return 'superseded'
      const { agent } = target
      const expectedPresentationRevision = agent.state.eventMonitorPresentationRevision
      const expectedActivityRevision = activityStore.getActivityContentRevision(agentRunId)
      const stillCurrent = () => isCurrent() && resolve()?.agent === agent
      let fetched: Awaited<ReturnType<typeof fetchMemberRunState<MemberProjection>>>
      try {
        fetched = await fetchMemberRunState({ fetchProjection: target.fetchProjection, fetchFileChanges: target.fetchFileChanges })
      } catch (cause) {
        // A failure of a load whose context was replaced is not this member's error.
        if (!stillCurrent()) return 'superseded'
        throw cause
      }
      // Synchronous from here to the end of the attempt: nothing can rebuild the root in between.
      if (!stillCurrent()) return 'superseded'
      if (agent.state.eventMonitorPresentationRevision !== expectedPresentationRevision
        || activityStore.getActivityContentRevision(agentRunId) !== expectedActivityRevision) continue
      const { projection } = fetched
      let conversation = buildConversationFromProjection(agentRunId, projection.conversation ?? [], target.conversationDefaults)
      if (projection.lastActivityAt) conversation.updatedAt = projection.lastActivityAt
      let activities = buildActivitiesFromProjection(projection.activities ?? [])
      // Decided when the stored state is committed: live tool decisions then win over it.
      if (target.liveToolAuthority()) {
        ({ conversation, activities } = reconcileTeamMemberToolState({ agentRunId,
          currentConversation: agent.state.conversation, currentActivities: activityStore.getActivities(agentRunId),
          projectedConversation: conversation, projectedActivities: activities }))
      }
      if (commitMemberRunStates([{ runId: agentRunId, expectedActivityRevision, activities, fileChanges: fetched.fileChanges }]) === 'conflict') continue
      // Held or queued input the view or the stream already showed stays shown (it may not be stored yet).
      overlayPendingUserMessages(conversation, agent.state.conversation)
      resetRecentEventMonitorBaseline(agent)
      agent.state.conversation = conversation
      agent.state.hasEarlierActiveTraceEvents = projection.hasEarlierActiveTraceEvents === true
      agent.state.markEventMonitorPresentationChanged()
      primeRecentEventMonitorBaseline(agent)
      state.hydrated.add(agentRunId)
      return 'hydrated'
    }
    throw new Error(`The stored state of '${agentRunId}' changed while it was loading.`)
  }
}

const loaders = new WeakMap<object, MemberLoader>()
/** The app's one member loader, owned with its stores (one per Pinia instance). */
export const memberLoader = (): MemberLoader => {
  const pinia = getActivePinia()
  if (!pinia) throw new Error('The member loader needs an active Pinia instance.')
  let loader = loaders.get(pinia)
  if (!loader) {
    loader = new MemberLoader()
    loaders.set(pinia, loader)
  }
  return loader
}
