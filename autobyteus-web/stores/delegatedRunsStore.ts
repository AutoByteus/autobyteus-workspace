import { defineStore } from 'pinia'
import { reactive, watch } from 'vue'
import { openAgentRun } from '~/services/runOpen/agentRunOpenCoordinator'
import { openTeamRun } from '~/services/runOpen/teamRunOpenCoordinator'
import { ensureRunHistoryWorkspaceByRootPath } from '~/stores/runHistoryLoadActions'
import { ensureAuthoritativeTeamMemberProjection } from '~/services/runHydration/teamMemberProjectionHydrationService'
import type { DelegatedRunSubject } from '~/services/delegatedRuns/delegatedRunSubjects'
import type { AgentContext } from '~/types/agent/AgentContext'
import type { AgentRunReadSubject } from '~/types/agent/agentRunReadSubject'
import type { ContextFilePath } from '~/types/conversation'
import type { ToolApprovalTarget } from '~/types/segments'
import type { AgentInteractionPort } from '~/types/workspace/activeAgentWorkspaceTarget'
import { useAgentContextsStore } from './agentContextsStore'
import { useAgentRunStore } from './agentRunStore'
import { useAgentTeamContextsStore } from './agentTeamContextsStore'
import { useAgentTeamRunStore } from './agentTeamRunStore'
import { useWorkspaceStore } from './workspace'
import { createPeerRunStreams } from '~/services/peerRuns/peerRunStreams'
import { INTERRUPT_NOT_SENT } from '~/services/agentStreaming/interruptCommandAdmission'
import { MessageNotDeliveredError } from '~/services/runSubmission/messageNotDelivered'
import { showMessageNotDelivered } from '~/services/runSubmission/localUserSubmission'
import { useWindowNodeContextStore } from './windowNodeContextStore'
import { createRandomId } from '~/utils/randomId'

/** A delegated run's own parts, as a delegator's view shows it when its row is selected. */
export type DelegatedRunBinding = Readonly<{
  context: AgentContext
  workspaceRootPath: string | null
  browse: AgentRunReadSubject
  interaction: AgentInteractionPort
}>

const runKey = (subject: DelegatedRunSubject): string =>
  subject.kind === 'agent' ? `agent:${subject.agentRunId}`
    : subject.kind === 'peer' ? `peer:${subject.nodeId}:${subject.agentRunId}` : `agent_team:${subject.teamRunId}`
type PeerSubject = Extract<DelegatedRunSubject, { kind: 'peer' }>

/**
 * Rule 2 of the frontend contract (autobyteus-461 SR-061, SR-064): a delegated run is reached like any run of its kind,
 * through its own standard path, by its own run ID. Selecting its row in a delegator's view opens the run as its own
 * open does (without selecting it) and keeps its own stream: `AgentStreamingService` for an agent run,
 * `TeamStreamingService` for a team run. Its conversation and composer are that run's; its messages, `@` mentions,
 * interrupts, tool decisions and Stop go to that run. Nothing about it goes through the delegator.
 */
export const useDelegatedRunsStore = defineStore('delegatedRuns', () => {
  const opening = new Map<string, Promise<void>>()
  /** The runs this store opened for a delegator's view: their contexts and streams are its, not the run list's (CR-461-044). */
  const owned = reactive(new Set<string>())
  /** The last open failure per run; selecting the row again retries. */
  const errors = reactive<Record<string, string>>({})

  /** A peer's run (G-D1): its own stream through this node's `/ws/peer-run`, one per agent while the window is open. */
  const peers = createPeerRunStreams()
  // A peer's run is reached through the window's node: another node closes its streams.
  watch(() => useWindowNodeContextStore().bindingRevision, () => peers.closeAll(), { flush: 'sync' })

  const teamOf = (teamRunId: string) => useAgentTeamContextsStore().getTeamContextById(teamRunId) ?? null
  const isLoaded = (subject: Exclude<DelegatedRunSubject, PeerSubject>): boolean => subject.kind === 'agent'
    ? Boolean(useAgentContextsStore().getRun(subject.agentRunId))
    : Boolean(teamOf(subject.teamRunId))

  const contextOf = (subject: DelegatedRunSubject): AgentContext | null => subject.kind === 'peer'
    ? peers.streamOf(subject)?.context ?? null
    : subject.kind === 'agent'
      ? useAgentContextsStore().getRun(subject.agentRunId) ?? null
      : teamOf(subject.teamRunId)?.view.getAgentContext(subject.agentRunId) ?? null

  /**
   * Keeps the run's own stream while its row is open, whether it runs or not (SR-045); it never starts the run. An agent
   * run's stream sends no snapshot, so it opens with a catch-up: its stored state is read again and the socket opens at
   * once, so a message that restored the run while the open read it is shown (CR-461-098).
   */
  const connect = (subject: Exclude<DelegatedRunSubject, PeerSubject>): void => {
    if (subject.kind === 'agent') useAgentRunStore().connectToAgentStream(subject.agentRunId)
    else useAgentTeamRunStore().connectToTeamStream(subject.teamRunId)
  }

  /** A Team member's stored conversation, read as the Team's own view reads an unfocused member. */
  const loadMember = async (subject: Extract<DelegatedRunSubject, { kind: 'team_member' }>): Promise<void> => {
    const team = teamOf(subject.teamRunId)
    if (team) await ensureAuthoritativeTeamMemberProjection({ team, agentRunId: subject.agentRunId })
  }

  /** Opens the run's own context and stream, once (a load in flight is shared). */
  const ensureOpen = (subject: DelegatedRunSubject): void => {
    const key = runKey(subject)
    owned.add(key)
    // A peer's run opens by its own stream, whose snapshot is its whole read (SR-088).
    if (subject.kind === 'peer') { peers.open(subject); return }
    if (opening.has(key)) return
    let attempt: Promise<void>
    if (isLoaded(subject)) {
      connect(subject)
      if (subject.kind === 'agent') return
      attempt = loadMember(subject)
    } else {
      const resolveWorkspaceMetadataByRootPath = (rootPath: string) => useWorkspaceStore().resolveWorkspaceMetadataByRootPath(rootPath)
      const open = subject.kind === 'agent'
        ? openAgentRun({ runId: subject.agentRunId, fallbackAgentName: null, resolveWorkspaceMetadataByRootPath, selectRun: false })
          .then(() => connect(subject))
        // An active Team's members run in its workspaces: they are activated as the Team's own open does (CR-461-076:
        // without it the open of a running delegated Team failed and its row's conversation stayed empty).
        : openTeamRun({ teamRunId: subject.teamRunId, agentRunId: subject.agentRunId, resolveWorkspaceMetadataByRootPath,
          ensureWorkspaceByRootPath: ensureRunHistoryWorkspaceByRootPath, selectRun: false })
          .then(() => undefined)
      attempt = open
    }
    const tracked = attempt
      .then(() => { delete errors[key] })
      .catch((cause: unknown) => {
        errors[key] = cause instanceof Error ? cause.message : String(cause)
        console.warn(`[delegatedRuns] Could not open delegated run '${key}'.`, cause)
      })
      .finally(() => { if (opening.get(key) === tracked) opening.delete(key) })
    opening.set(key, tracked)
  }

  const errorFor = (subject: DelegatedRunSubject): string | null => errors[runKey(subject)] ?? null
  /** Settles when the run's open in flight does (at once when none is): then `bindingOf` or `errorFor` answers. */
  const whenOpen = (subject: DelegatedRunSubject): Promise<void> => opening.get(runKey(subject)) ?? Promise.resolve()

  const interactionOf = (subject: DelegatedRunSubject): AgentInteractionPort => {
    if (subject.kind === 'peer') return peerInteractionOf(subject)
    if (subject.kind === 'agent') {
      const runs = useAgentRunStore()
      return Object.freeze({
        // The composer writes the draft on the run's own context; its own send reads it there.
        send: async () => { await runs.sendUserInputAndSubscribe(subject.agentRunId) },
        interrupt: () => runs.interruptGeneration(subject.agentRunId),
        decideTool: async (invocationId: string, approved: boolean, reason: string | null) => {
          await runs.postToolExecutionApproval(subject.agentRunId, invocationId, approved, reason)
        },
      })
    }
    const teams = useAgentTeamRunStore()
    const member = Object.freeze({ teamRunId: subject.teamRunId, agentRunId: subject.agentRunId })
    return Object.freeze({
      send: async (content: string, paths: readonly ContextFilePath[]) => {
        await teams.sendMessageToFocusedMember(content, [...paths], { member })
      },
      interrupt: () => teams.interruptFocusedMemberGeneration(member),
      decideTool: async (invocationId: string, approved: boolean, reason: string | null, target?: ToolApprovalTarget | null) => {
        await teams.postToolExecutionApproval(invocationId, approved, reason, target ?? null, subject.teamRunId)
      },
    })
  }

  /** A peer's run: a message and an interrupt go to its node through its stream; no tool approval, as at base. */
  const peerInteractionOf = (subject: PeerSubject): AgentInteractionPort => Object.freeze({
    // The draft stays in the box until the node takes the message; nothing is shown before (autobyteus-540 D-1, D-4).
    send: async (content: string) => {
      const stream = peers.streamOf(subject)
      if (!stream) throw new Error('This peer run is not open.')
      const messageId = `peer_msg_${createRandomId()}`
      stream.context.messageNotDelivered = null
      try {
        await stream.service.whenBound(10_000)
        await stream.service.sendMessageAwaitingAdmission(content, [], [], { messageId, dedupeKey: messageId })
      } catch (error) {
        if (!(error instanceof MessageNotDeliveredError)) throw error
        console.warn(`Message to a peer run not delivered (${error.certainty}): ${error.message}`)
        showMessageNotDelivered(stream.context, error.certainty)
        return
      }
      stream.context.requirement = ''
    },
    interrupt: async () => {
      const stream = peers.streamOf(subject)
      if (!stream) return INTERRUPT_NOT_SENT
      return stream.service.interruptGeneration(`peer_interrupt_${createRandomId()}`)
    },
    decideTool: async () => undefined,
  })

  /** The run's own parts once it is open; null while it loads (or failed: see `errorFor`). */
  const bindingOf = (subject: DelegatedRunSubject): DelegatedRunBinding | null => {
    const context = contextOf(subject)
    if (!context) return null
    if (subject.kind === 'peer') {
      // Its node keeps its workspace, files and trace (autobyteus-278): its stream's snapshot is what this view shows.
      return Object.freeze({ context, workspaceRootPath: null,
        browse: Object.freeze({ kind: 'peerRun' as const, nodeId: subject.nodeId, runId: subject.runId, agentRunId: subject.agentRunId }),
        interaction: interactionOf(subject) })
    }
    return Object.freeze({
      context,
      workspaceRootPath: subject.kind === 'agent'
        ? context.config.workspaceMetadata?.workspaceRootPath ?? null
        : teamOf(subject.teamRunId)?.view.getAgentWorkspaceRootPath(subject.agentRunId) ?? null,
      browse: subject.kind === 'agent'
        ? Object.freeze({ kind: 'run' as const, runId: subject.agentRunId })
        // The member's address in its team run's own space, from the open team's view.
        : Object.freeze({ kind: 'teamMember' as const, teamRunId: subject.teamRunId,
          memberAddress: teamOf(subject.teamRunId)?.view.getMemberAddress(subject.agentRunId) ?? '', agentRunId: subject.agentRunId }),
      interaction: interactionOf(subject),
    })
  }

  /** Stops the delegated run through its own Stop: the agent run, or the whole delegated Team run. */
  const stop = (subject: DelegatedRunSubject): Promise<boolean> => subject.kind === 'peer'
    // A peer's run is stopped on its node (its owner's Stop there), not from this view.
    ? Promise.resolve(false)
    : subject.kind === 'agent'
      ? useAgentRunStore().terminateRun(subject.agentRunId)
      : useAgentTeamRunStore().terminateTeamRun(subject.teamRunId)

  /** Whether this store opened the agent run (a delegated agent run), or the team run (a delegated team run). */
  const ownsAgentRun = (agentRunId: string): boolean => owned.has(`agent:${agentRunId}`)
  const ownsTeamRun = (teamRunId: string): boolean => owned.has(`agent_team:${teamRunId}`)

  /** Closes every peer stream: the window's node changed. */
  const releasePeers = (): void => peers.closeAll()

  return { ensureOpen, whenOpen, bindingOf, errorFor, stop, ownsAgentRun, ownsTeamRun, releasePeers }
})
