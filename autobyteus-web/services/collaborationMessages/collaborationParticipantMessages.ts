import { defineStore } from 'pinia'
import { shallowReactive } from 'vue'
import type { CollaborationParticipantMessageDto, CollaborationPastParticipantDto, CollaborationRootKind } from '@autobyteus/collaboration-stream-contracts'
import { fetchParticipantMessages } from './participantMessagesQuery'

export type ParticipantMessage = CollaborationParticipantMessageDto
export type PastParticipant = CollaborationPastParticipantDto
export type ParticipantMessagesKey = Readonly<{ rootKind: CollaborationRootKind; rootRunId: string; agentRunId: string }>
export type ParticipantMessagesStatus = Readonly<{ state: 'idle' | 'loading' | 'loaded' | 'error'; error: string | null }>
type ParticipantMessagesList = ParticipantMessagesStatus & Readonly<{
  key: ParticipantMessagesKey; messages: readonly ParticipantMessage[]
  /** The agents of delegated runs that left the tree, named in these messages (autobyteus-469). */
  pastParticipants: readonly PastParticipant[]
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
const NO_MESSAGES: readonly ParticipantMessage[] = Object.freeze([])
const NO_PAST_PARTICIPANTS: readonly PastParticipant[] = Object.freeze([])
const rootKeyOf = (rootKind: CollaborationRootKind, rootRunId: string) => `${rootKind}:${rootRunId}`
const listKeyOf = (key: ParticipantMessagesKey) => `${rootKeyOf(key.rootKind, key.rootRunId)}:${key.agentRunId}`
const isParticipant = (message: ParticipantMessage, agentRunId: string) =>
  message.senderAgentRunId === agentRunId || message.receiverAgentRunId === agentRunId

/** Stored messages, then live ones not in them yet, in arrival order: one entry per message ID. */
const mergeById = (stored: readonly ParticipantMessage[], live: readonly ParticipantMessage[]): readonly ParticipantMessage[] => {
  const seen = new Set(stored.map((message) => message.messageId))
  return Object.freeze([...stored, ...live.filter((message) => !seen.has(message.messageId) && seen.add(message.messageId))])
}

/**
 * The one client owner of the messages the Team tab shows (autobyteus-358, DS-002): one list per root kind, root run
 * and participant. A root's view carries no message log; a list is loaded when its Team tab (or a mobile message
 * screen) is shown. Live `communication` events of the root are buffered from before the request is sent and merged
 * by message ID, so none is lost or doubled. Every rebuild of the root's context calls `reloadRoot`, which reloads
 * only when a message could have been missed (SR-004 … SR-007): the lists hold every message through a sequence C,
 * which advances on every stream event applied and on a seen single `checkpoint_required` event. A rebuild in the
 * same live sequence whose latest message is at or before C missed no message: the lists and their loads in flight
 * are kept, and C becomes its base. A stored view, another live sequence (a stop and resume, or a restart) or a
 * message past C reloads, abandoning the root's loads in flight. A failed load keeps its reason; showing the tab
 * again retries.
 */
export const useCollaborationParticipantMessagesStore = defineStore('collaborationParticipantMessages', () => {
  const lists = shallowReactive(new Map<string, ParticipantMessagesList>())
  const generations = new Map<string, number>()
  const buffers = new Map<string, ParticipantMessage[]>()
  const positions = new Map<string, RootPosition>()
  const generationOf = (rootKey: string) => generations.get(rootKey) ?? 0

  const start = (key: ParticipantMessagesKey, previous: readonly ParticipantMessage[], pastParticipants: readonly PastParticipant[]) => {
    const listKey = listKeyOf(key)
    const rootKey = rootKeyOf(key.rootKind, key.rootRunId)
    const generation = generationOf(rootKey)
    // Buffering starts before the request is sent: an event that arrives while it is in flight is kept.
    const buffer: ParticipantMessage[] = []
    buffers.set(listKey, buffer)
    lists.set(listKey, Object.freeze({ key, state: 'loading', error: null, messages: previous, pastParticipants }))
    const isCurrent = () => generationOf(rootKey) === generation && buffers.get(listKey) === buffer
    void fetchParticipantMessages(key).then((stored) => {
      if (!isCurrent()) return
      buffers.delete(listKey)
      lists.set(listKey, Object.freeze({ key, state: 'loaded', error: null, messages: mergeById(stored.messages, buffer),
        pastParticipants: Object.freeze(stored.pastParticipants) }))
    }, (cause: unknown) => {
      if (!isCurrent()) return
      buffers.delete(listKey)
      lists.set(listKey, Object.freeze({ key, state: 'error', error: cause instanceof Error ? cause.message : String(cause),
        messages: NO_MESSAGES, pastParticipants: NO_PAST_PARTICIPANTS }))
    })
  }

  /** Loads one participant's list unless it is loaded or loading; after a failure it tries again. */
  const load = (key: ParticipantMessagesKey): void => {
    const current = lists.get(listKeyOf(key))
    if (current?.state === 'loading' || current?.state === 'loaded') return
    start(key, NO_MESSAGES, NO_PAST_PARTICIPANTS)
  }

  /** A live message of one root: added to each loaded list of its two participants, or kept for their loads in flight. */
  const append = (rootKind: CollaborationRootKind, rootRunId: string, message: ParticipantMessage): void => {
    for (const [listKey, list] of lists) {
      if (list.key.rootKind !== rootKind || list.key.rootRunId !== rootRunId || !isParticipant(message, list.key.agentRunId)) continue
      if (list.state === 'loading') buffers.get(listKey)?.push(message)
      else if (list.state === 'loaded' && !list.messages.some((entry) => entry.messageId === message.messageId)) {
        lists.set(listKey, Object.freeze({ ...list, messages: Object.freeze([...list.messages, message]) }))
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
   * The root's context was rebuilt. Its lists stay, with their loads in flight, when no message could have been
   * missed: the same live sequence, and no message past C; they then hold every message through the base. Otherwise
   * loads in flight are abandoned and every loaded or loading list loads again.
   */
  const reloadRoot = (rootKind: CollaborationRootKind, rootRunId: string, rebuild: RootContextRebuild): void => {
    const rootKey = rootKeyOf(rootKind, rootRunId)
    const kept = positions.get(rootKey)
    if (rebuild.liveSequenceId !== null && kept?.liveSequenceId === rebuild.liveSequenceId
      && rebuild.lastMessageChangeSequence !== null && rebuild.lastMessageChangeSequence <= kept.through) {
      kept.through = rebuild.baseChangeSequence
      return
    }
    if (rebuild.liveSequenceId === null) positions.delete(rootKey)
    else positions.set(rootKey, { liveSequenceId: rebuild.liveSequenceId, through: rebuild.baseChangeSequence })
    generations.set(rootKey, generationOf(rootKey) + 1)
    for (const list of [...lists.values()]) {
      if (list.key.rootKind !== rootKind || list.key.rootRunId !== rootRunId) continue
      if (list.state === 'loaded' || list.state === 'loading') start(list.key, list.messages, list.pastParticipants)
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
  const pastParticipantsOf = (key: ParticipantMessagesKey): readonly PastParticipant[] =>
    lists.get(listKeyOf(key))?.pastParticipants ?? NO_PAST_PARTICIPANTS
  const statusOf = (key: ParticipantMessagesKey): ParticipantMessagesStatus => {
    const list = lists.get(listKeyOf(key))
    return list ? Object.freeze({ state: list.state, error: list.error }) : IDLE
  }

  return { load, append, advance, reloadRoot, releaseRoot, messagesOf, pastParticipantsOf, statusOf }
})
