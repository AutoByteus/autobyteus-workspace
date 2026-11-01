import { defineStore } from 'pinia'
import { shallowReactive } from 'vue'
import type { CollaborationParticipantMessageDto, CollaborationRootKind } from '@autobyteus/collaboration-stream-contracts'
import { fetchParticipantMessages } from './participantMessagesQuery'

export type ParticipantMessage = CollaborationParticipantMessageDto
export type ParticipantMessagesKey = Readonly<{ rootKind: CollaborationRootKind; rootRunId: string; agentRunId: string }>
export type ParticipantMessagesStatus = Readonly<{ state: 'idle' | 'loading' | 'loaded' | 'error'; error: string | null }>
type ParticipantMessagesList = ParticipantMessagesStatus & Readonly<{ key: ParticipantMessagesKey; messages: readonly ParticipantMessage[] }>

const IDLE: ParticipantMessagesStatus = Object.freeze({ state: 'idle', error: null })
const NO_MESSAGES: readonly ParticipantMessage[] = Object.freeze([])
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
 * by message ID, so none is lost or doubled. Every rebuild of the root's context calls `reloadRoot`: it abandons
 * the root's loads in flight and loads its lists again, because events missed in a gap never reach the client.
 * A failed load keeps its reason; showing the tab again retries.
 */
export const useCollaborationParticipantMessagesStore = defineStore('collaborationParticipantMessages', () => {
  const lists = shallowReactive(new Map<string, ParticipantMessagesList>())
  const generations = new Map<string, number>()
  const buffers = new Map<string, ParticipantMessage[]>()
  const generationOf = (rootKey: string) => generations.get(rootKey) ?? 0

  const start = (key: ParticipantMessagesKey, previous: readonly ParticipantMessage[]) => {
    const listKey = listKeyOf(key)
    const rootKey = rootKeyOf(key.rootKind, key.rootRunId)
    const generation = generationOf(rootKey)
    // Buffering starts before the request is sent: an event that arrives while it is in flight is kept.
    const buffer: ParticipantMessage[] = []
    buffers.set(listKey, buffer)
    lists.set(listKey, Object.freeze({ key, state: 'loading', error: null, messages: previous }))
    const isCurrent = () => generationOf(rootKey) === generation && buffers.get(listKey) === buffer
    void fetchParticipantMessages(key).then((stored) => {
      if (!isCurrent()) return
      buffers.delete(listKey)
      lists.set(listKey, Object.freeze({ key, state: 'loaded', error: null, messages: mergeById(stored, buffer) }))
    }, (cause: unknown) => {
      if (!isCurrent()) return
      buffers.delete(listKey)
      lists.set(listKey, Object.freeze({ key, state: 'error', error: cause instanceof Error ? cause.message : String(cause), messages: NO_MESSAGES }))
    })
  }

  /** Loads one participant's list unless it is loaded or loading; after a failure it tries again. */
  const load = (key: ParticipantMessagesKey): void => {
    const current = lists.get(listKeyOf(key))
    if (current?.state === 'loading' || current?.state === 'loaded') return
    start(key, NO_MESSAGES)
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

  /** The root's context was rebuilt: loads in flight are abandoned and every loaded or loading list loads again. */
  const reloadRoot = (rootKind: CollaborationRootKind, rootRunId: string): void => {
    const rootKey = rootKeyOf(rootKind, rootRunId)
    generations.set(rootKey, generationOf(rootKey) + 1)
    for (const list of [...lists.values()]) {
      if (list.key.rootKind !== rootKind || list.key.rootRunId !== rootRunId) continue
      if (list.state === 'loaded' || list.state === 'loading') start(list.key, list.messages)
    }
  }

  /** The root's context is gone: its lists and loads in flight are dropped. */
  const releaseRoot = (rootKind: CollaborationRootKind, rootRunId: string): void => {
    const rootKey = rootKeyOf(rootKind, rootRunId)
    generations.set(rootKey, generationOf(rootKey) + 1)
    for (const [listKey, list] of [...lists]) {
      if (list.key.rootKind !== rootKind || list.key.rootRunId !== rootRunId) continue
      lists.delete(listKey)
      buffers.delete(listKey)
    }
  }

  const messagesOf = (key: ParticipantMessagesKey): readonly ParticipantMessage[] => lists.get(listKeyOf(key))?.messages ?? NO_MESSAGES
  const statusOf = (key: ParticipantMessagesKey): ParticipantMessagesStatus => {
    const list = lists.get(listKeyOf(key))
    return list ? Object.freeze({ state: list.state, error: list.error }) : IDLE
  }

  return { load, append, reloadRoot, releaseRoot, messagesOf, statusOf }
})
