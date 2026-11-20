import { defineStore } from 'pinia'
import { shallowReactive } from 'vue'
import type {
  CollaborationCounterpartDto,
  CollaborationParticipantMessageDto,
  CollaborationParticipantMessagesCursor,
  CollaborationRootKind,
  MessagePartyDto,
} from '@autobyteus/collaboration-stream-contracts'
import { fetchParticipantMessages } from './participantMessagesQuery'

export type ParticipantMessage = CollaborationParticipantMessageDto
/** The other agent of a list's messages that the root's tree does not name, as the server names it (autobyteus-565). */
export type ParticipantCounterpart = CollaborationCounterpartDto
/** A live message's two parties, as its commit knew them (only an Agent root's message event carries them). */
export type ParticipantMessageParties = Readonly<{ sender: MessagePartyDto; receiver: MessagePartyDto }>
export type ParticipantMessagesKey = Readonly<{ rootKind: CollaborationRootKind; rootRunId: string; agentRunId: string }>
export type ParticipantMessagesStatus = Readonly<{ state: 'idle' | 'loading' | 'loaded' | 'error'; error: string | null }>
export type ParticipantMorePagesStatus = Readonly<{ state: 'idle' | 'loading' | 'error'; error: string | null }>
type ParticipantMessagesList = ParticipantMessagesStatus & Readonly<{
  key: ParticipantMessagesKey
  /** The loaded pages and the live messages since, one entry per message ID. */
  messages: readonly ParticipantMessage[]
  /** The other agents of the loaded pages that the root's tree does not name, from the server (past, run, remote). */
  counterparts: readonly ParticipantCounterpart[]
  /** Other agents of live messages that the loaded pages do not name, from the messages' parties (a standalone run's own list). */
  liveCounterparts: readonly ParticipantCounterpart[]
  /** Where the next older page starts: the last message of the last loaded page (null: none loaded, or nothing older). */
  cursor: CollaborationParticipantMessagesCursor | null
  hasMore: boolean
  more: ParticipantMorePagesStatus
}>
/**
 * Where a rebuilt root context starts: the live sequence its view counts in, its base, and the sequence of the root's
 * latest message through that base (live sequence and latest message are null for a stored view; SR-005, SR-007).
 */
export type RootContextRebuild = Readonly<{ liveSequenceId: string | null; baseChangeSequence: number; lastMessageChangeSequence: number | null }>
/** The rebuild a root's view or snapshot describes (the hub, Org and Team views name the same three fields). */
export const rebuildOfView = (view: Readonly<{ live_sequence_id: string | null; base_change_sequence: number;
  last_message_change_sequence: number | null }>): RootContextRebuild => Object.freeze({ liveSequenceId: view.live_sequence_id,
  baseChangeSequence: view.base_change_sequence, lastMessageChangeSequence: view.last_message_change_sequence })
/** The live sequence a root's lists follow, and the change sequence C they hold every message through. */
type RootPosition = { readonly liveSequenceId: string; through: number }

const IDLE: ParticipantMessagesStatus = Object.freeze({ state: 'idle', error: null })
const MORE_IDLE: ParticipantMorePagesStatus = Object.freeze({ state: 'idle', error: null })
const NO_MESSAGES: readonly ParticipantMessage[] = Object.freeze([])
const NO_COUNTERPARTS: readonly ParticipantCounterpart[] = Object.freeze([])
const rootKeyOf = (rootKind: CollaborationRootKind, rootRunId: string) => `${rootKind}:${rootRunId}`
const listKeyOf = (key: ParticipantMessagesKey) => `${rootKeyOf(key.rootKind, key.rootRunId)}:${key.agentRunId}`
const isParticipant = (message: ParticipantMessage, agentRunId: string) =>
  message.senderAgentRunId === agentRunId || message.receiverAgentRunId === agentRunId

const errorText = (cause: unknown) => cause instanceof Error ? cause.message : String(cause)
const otherAgentOf = (message: ParticipantMessage, agentRunId: string) =>
  message.senderAgentRunId === agentRunId ? message.receiverAgentRunId : message.senderAgentRunId

/**
 * A standalone run's own agent's list (autobyteus-565): it lists every message its agent sent or received, so the other
 * agent of a live message may be one the list does not know yet (another run, another node).
 */
export const isOwnAgentList = (key: ParticipantMessagesKey): boolean => key.rootKind === 'agent' && key.rootRunId === key.agentRunId

/**
 * The other agent of a live message to an own agent's list, named from the message's parties until the server names it on
 * the next load: an agent on another node with its node, else an agent of another local run. Null for any other list,
 * or without parties (Team and Org lists name only their tree's agents and past participants, as before; REQ-006).
 */
const liveCounterpartOf = (key: ParticipantMessagesKey, message: ParticipantMessage,
  parties: ParticipantMessageParties | undefined): ParticipantCounterpart | null => {
  if (!parties || !isOwnAgentList(key) || !isParticipant(message, key.agentRunId)) return null
  const other = message.senderAgentRunId === key.agentRunId ? parties.receiver : parties.sender
  return other.nodeName !== null
    ? Object.freeze({ kind: 'remote', agentRunId: other.agentRunId, address: other.address, nodeName: other.nodeName })
    : Object.freeze({ kind: 'run', agentRunId: other.agentRunId, address: other.address })
}

/** These counterparts, then each of `added` whose agent they do not name. */
const withCounterparts = (counterparts: readonly ParticipantCounterpart[], added: readonly (ParticipantCounterpart | null)[]):
  readonly ParticipantCounterpart[] => {
  const named = new Set(counterparts.map((counterpart) => counterpart.agentRunId))
  const fresh = added.filter((counterpart): counterpart is ParticipantCounterpart => counterpart !== null && !named.has(counterpart.agentRunId)
    && Boolean(named.add(counterpart.agentRunId)))
  return fresh.length ? Object.freeze([...counterparts, ...fresh]) : counterparts
}

/** A loaded list names an agent the view does not hold and the server's counterparts do not name. */
const namesUnknownAgent = (list: ParticipantMessagesList, holdsAgent: (agentRunId: string) => boolean): boolean =>
  list.messages.some((message) => {
    const other = otherAgentOf(message, list.key.agentRunId)
    return !holdsAgent(other) && !list.counterparts.some((counterpart) => counterpart.agentRunId === other)
  })

/** Loaded messages, then the others not in them yet, in arrival order: one entry per message ID. */
const mergeById = (stored: readonly ParticipantMessage[], live: readonly ParticipantMessage[]): readonly ParticipantMessage[] => {
  const seen = new Set(stored.map((message) => message.messageId))
  return Object.freeze([...stored, ...live.filter((message) => !seen.has(message.messageId) && seen.add(message.messageId))])
}

/**
 * The one client owner of the messages the Team tab shows (autobyteus-358, DS-002): one list per root kind, root run
 * and participant. A root's view carries no message log; a list is loaded when its Team tab (or a mobile message
 * screen) is shown, a page at a time (autobyteus-565, DEC-004): the newest 50 first, and each older page of 50 on
 * request (`loadMore`), after the last loaded message. Live `communication` events of the root are buffered from before
 * the request is sent and merged by message ID, so none is lost or doubled. Every rebuild of the root's context calls `reloadRoot`, which reloads
 * only when a message could have been missed (SR-004 … SR-007): the lists hold every message through a sequence C,
 * which advances on every stream event applied and on a seen single `checkpoint_required` event. A rebuild in the
 * same live sequence whose latest message is at or before C missed no message: the lists and their loads in flight
 * are kept, and C becomes its base. A stored view, another live sequence (a stop and resume, or a restart) or a
 * message past C reloads (its newest page; older pages load again on request), abandoning the root's loads in flight,
 * older pages' included. A failed load keeps its reason; showing the tab again (or "Load more") retries.
 */
export const useCollaborationParticipantMessagesStore = defineStore('collaborationParticipantMessages', () => {
  const lists = shallowReactive(new Map<string, ParticipantMessagesList>())
  const generations = new Map<string, number>()
  const positions = new Map<string, RootPosition>()
  const generationOf = (rootKey: string) => generations.get(rootKey) ?? 0

  const buffers = new Map<string, Readonly<{ message: ParticipantMessage; counterpart: ParticipantCounterpart | null }>[]>()
  const start = (key: ParticipantMessagesKey, previous: readonly ParticipantMessage[], counterparts: readonly ParticipantCounterpart[],
    liveCounterparts: readonly ParticipantCounterpart[]) => {
    const listKey = listKeyOf(key)
    const rootKey = rootKeyOf(key.rootKind, key.rootRunId)
    const generation = generationOf(rootKey)
    // Buffering starts before the request is sent: an event that arrives while it is in flight is kept.
    const buffer: Readonly<{ message: ParticipantMessage; counterpart: ParticipantCounterpart | null }>[] = []
    buffers.set(listKey, buffer)
    lists.set(listKey, Object.freeze({ key, state: 'loading', error: null, messages: previous, counterparts, liveCounterparts,
      cursor: null, hasMore: false, more: MORE_IDLE }))
    const isCurrent = () => generationOf(rootKey) === generation && buffers.get(listKey) === buffer
    void fetchParticipantMessages(key, null).then((page) => {
      if (!isCurrent()) return
      buffers.delete(listKey)
      const last = page.messages.at(-1)
      lists.set(listKey, Object.freeze({ key, state: 'loaded', error: null,
        messages: mergeById(page.messages, buffer.map((entry) => entry.message)),
        counterparts: Object.freeze([...page.counterparts]),
        liveCounterparts: withCounterparts(NO_COUNTERPARTS, buffer.map((entry) => entry.counterpart)),
        cursor: last ? Object.freeze({ createdAt: last.createdAt, messageId: last.messageId }) : null,
        hasMore: page.hasMore, more: MORE_IDLE }))
    }, (cause: unknown) => {
      if (!isCurrent()) return
      buffers.delete(listKey)
      lists.set(listKey, Object.freeze({ key, state: 'error', error: errorText(cause), messages: NO_MESSAGES,
        counterparts: NO_COUNTERPARTS, liveCounterparts: NO_COUNTERPARTS, cursor: null, hasMore: false, more: MORE_IDLE }))
    })
  }

  /** Loads one participant's list unless it is loaded or loading; after a failure it tries again. */
  const load = (key: ParticipantMessagesKey): void => {
    const current = lists.get(listKeyOf(key))
    if (current?.state === 'loading' || current?.state === 'loaded') return
    start(key, NO_MESSAGES, NO_COUNTERPARTS, NO_COUNTERPARTS)
  }

  /**
   * Loads the next older page of a loaded list that has more ("Load more"), one at a time, and adds it by message ID.
   * A reload of the root meanwhile drops its answer. A failure keeps the loaded messages and its reason; asking again retries.
   */
  const loadMore = (key: ParticipantMessagesKey): void => {
    const listKey = listKeyOf(key)
    const list = lists.get(listKey)
    if (list?.state !== 'loaded' || !list.hasMore || !list.cursor || list.more.state === 'loading') return
    const rootKey = rootKeyOf(key.rootKind, key.rootRunId)
    const generation = generationOf(rootKey)
    const cursor = list.cursor
    lists.set(listKey, Object.freeze({ ...list, more: Object.freeze({ state: 'loading', error: null }) }))
    const current = () => {
      const now = lists.get(listKey)
      return generationOf(rootKey) === generation && now?.state === 'loaded' && now.cursor === cursor ? now : null
    }
    void fetchParticipantMessages(key, cursor).then((page) => {
      const now = current()
      if (!now) return
      const last = page.messages.at(-1)
      lists.set(listKey, Object.freeze({ ...now, messages: mergeById(now.messages, page.messages),
        counterparts: withCounterparts(now.counterparts, page.counterparts),
        cursor: last ? Object.freeze({ createdAt: last.createdAt, messageId: last.messageId }) : null,
        hasMore: page.hasMore, more: MORE_IDLE }))
    }, (cause: unknown) => {
      const now = current()
      if (now) lists.set(listKey, Object.freeze({ ...now, more: Object.freeze({ state: 'error', error: errorText(cause) }) }))
    })
  }

  /**
   * A live message of one root: added to each loaded list of its two participants, or kept for their loads in flight. An
   * own agent's list names its other agent from the message's parties when nothing names it yet (autobyteus-565).
   */
  const append = (rootKind: CollaborationRootKind, rootRunId: string, message: ParticipantMessage, parties?: ParticipantMessageParties): void => {
    for (const [listKey, list] of lists) {
      if (list.key.rootKind !== rootKind || list.key.rootRunId !== rootRunId || !isParticipant(message, list.key.agentRunId)) continue
      const counterpart = liveCounterpartOf(list.key, message, parties)
      if (list.state === 'loading') buffers.get(listKey)?.push(Object.freeze({ message, counterpart }))
      else if (list.state === 'loaded' && !list.messages.some((entry) => entry.messageId === message.messageId)) {
        const named = counterpart && list.counterparts.some((entry) => entry.agentRunId === counterpart.agentRunId) ? null : counterpart
        lists.set(listKey, Object.freeze({ ...list, messages: Object.freeze([...list.messages, message]),
          liveCounterparts: withCounterparts(list.liveCounterparts, [named]) }))
      }
    }
  }

  /**
   * The root's stream applied its events through `changeSequence` in `liveSequenceId` (or saw a single
   * `checkpoint_required` event there, which carries no message): the lists hold every message through it.
   */
  const advance = (rootKind: CollaborationRootKind, rootRunId: string, liveSequenceId: string | null, changeSequence: number): void => {
    const position = positions.get(rootKeyOf(rootKind, rootRunId))
    if (position?.liveSequenceId === liveSequenceId && changeSequence > position.through) position.through = changeSequence
  }

  /**
   * A loaded list of the root that names an agent its view no longer holds (`holdsAgent`), and the server's counterparts do
   * not name, loads again, so that agent is named from the server's answer (autobyteus-469 D-5): it left the tree when its
   * Task closed. Its rows stay shown while it loads. Called when the root's view is rebuilt, and when its tree loses rows
   * (`run_tree_changed`, autobyteus-461 SR-084: a closure no longer rebuilds the view).
   */
  const reloadNamingUnknown = (rootKind: CollaborationRootKind, rootRunId: string, holdsAgent: (agentRunId: string) => boolean): void => {
    for (const list of [...lists.values()]) {
      if (list.key.rootKind === rootKind && list.key.rootRunId === rootRunId && list.state === 'loaded'
        && namesUnknownAgent(list, holdsAgent)) start(list.key, list.messages, list.counterparts, list.liveCounterparts)
    }
  }

  /**
   * The root's context was rebuilt. Its lists stay, with their loads in flight, when no message could have been
   * missed: the same live sequence, and no message past C; they then hold every message through the base. A kept list
   * that names an agent the rebuilt view no longer holds (`holdsAgent`) and the server's counterparts do not name loads
   * again, so that agent is named from the server's answer (autobyteus-469 D-5, CR-002): it left the tree when its
   * Task closed. Otherwise loads in flight are abandoned and every loaded or loading list loads again.
   */
  const reloadRoot = (rootKind: CollaborationRootKind, rootRunId: string, rebuild: RootContextRebuild,
    holdsAgent: (agentRunId: string) => boolean): void => {
    const rootKey = rootKeyOf(rootKind, rootRunId)
    const kept = positions.get(rootKey)
    if (rebuild.liveSequenceId !== null && kept?.liveSequenceId === rebuild.liveSequenceId
      && rebuild.lastMessageChangeSequence !== null && rebuild.lastMessageChangeSequence <= kept.through) {
      kept.through = rebuild.baseChangeSequence
      reloadNamingUnknown(rootKind, rootRunId, holdsAgent)
      return
    }
    if (rebuild.liveSequenceId === null) positions.delete(rootKey)
    else positions.set(rootKey, { liveSequenceId: rebuild.liveSequenceId, through: rebuild.baseChangeSequence })
    generations.set(rootKey, generationOf(rootKey) + 1)
    for (const list of [...lists.values()]) {
      if (list.key.rootKind !== rootKind || list.key.rootRunId !== rootRunId) continue
      if (list.state === 'loaded' || list.state === 'loading') start(list.key, list.messages, list.counterparts, list.liveCounterparts)
    }
  }

  /** The root's context is gone: its lists and loads in flight are dropped. */
  const releaseRoot = (rootKind: CollaborationRootKind, rootRunId: string): void => {
    const rootKey = rootKeyOf(rootKind, rootRunId)
    generations.set(rootKey, generationOf(rootKey) + 1)
    positions.delete(rootKey)
    for (const [listKey, list] of [...lists]) {
      if (list.key.rootKind !== rootKind || list.key.rootRunId !== rootRunId) continue
      lists.delete(listKey)
      buffers.delete(listKey)
    }
  }

  const messagesOf = (key: ParticipantMessagesKey): readonly ParticipantMessage[] => lists.get(listKeyOf(key))?.messages ?? NO_MESSAGES
  /** The list's other agents its root's tree does not name: the server's, then those named from live messages since. */
  const counterpartsOf = (key: ParticipantMessagesKey): readonly ParticipantCounterpart[] => {
    const list = lists.get(listKeyOf(key))
    return list ? withCounterparts(list.counterparts, list.liveCounterparts) : NO_COUNTERPARTS
  }
  const hasMoreOf = (key: ParticipantMessagesKey): boolean => lists.get(listKeyOf(key))?.hasMore ?? false
  const moreStatusOf = (key: ParticipantMessagesKey): ParticipantMorePagesStatus => lists.get(listKeyOf(key))?.more ?? MORE_IDLE
  const statusOf = (key: ParticipantMessagesKey): ParticipantMessagesStatus => {
    const list = lists.get(listKeyOf(key))
    return list ? Object.freeze({ state: list.state, error: list.error }) : IDLE
  }

  /**
   * The root's view was sent again unchanged (its base and rows; autobyteus-461 CR-461-082): its lists hold every message
   * through that base, and follow its live sequence from there. Nothing loads.
   */
  const adoptRoot = (rootKind: CollaborationRootKind, rootRunId: string, rebuild: RootContextRebuild): void => {
    if (rebuild.liveSequenceId !== null) positions.set(rootKeyOf(rootKind, rootRunId), { liveSequenceId: rebuild.liveSequenceId, through: rebuild.baseChangeSequence })
  }

  return { load, loadMore, append, advance, reloadRoot, reloadNamingUnknown, adoptRoot, releaseRoot, messagesOf, counterpartsOf, hasMoreOf,
    moreStatusOf, statusOf }
})
