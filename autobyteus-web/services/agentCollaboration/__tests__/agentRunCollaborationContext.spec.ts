import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { AgentRunCollaborationContext } from '../agentRunCollaborationContext'

const invalidate = vi.hoisted(() => vi.fn())
vi.mock('~/services/collaborators/collaboratorCandidatesService', () => ({ collaboratorCandidatesService: { invalidate } }))

import { agentRootMessages, agentRootTreeRows, agentRootView, created } from './agentRootFixture'
import { storeParticipantMessages } from '~/test-support/participantMessagesStub'
import { useCollaborationParticipantMessagesStore } from '~/services/collaborationMessages/collaborationParticipantMessages'
import { useRunTreeStore } from '~/stores/runTreeStore'
import { agentRow } from '~/test-support/runTreeFixtures'

vi.mock('~/services/collaborationMessages/participantMessagesQuery', async () => (await import('~/test-support/participantMessagesStub')).participantMessagesQueryStub)
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => ({ query: vi.fn(async () => ({ data: { runTree: null } })) }) }))
const settle = () => new Promise((resolve) => setTimeout(resolve, 0))
const HOST = { kind: 'agent' as const, runId: 'host-run' }

/** A host run's view, with its tree as its stream gave it (SR-084). */
const build = (view = agentRootView()) => {
  useRunTreeStore().streamSnapshot(HOST, agentRootTreeRows())
  return new AgentRunCollaborationContext({ runId: 'host-run', view })
}
const message = (messageId: string, senderAgentRunId: string, receiverAgentRunId: string, content = 'hi') => ({
  messageId, senderAgentRunId, receiverAgentRunId, content, messageType: 'direct_message', referenceFiles: [], createdAt: created,
})

/**
 * autobyteus-461 SR-084: an agent run's view is its host's, its Team tab and its tree's changes. Who is under the run is
 * its tree's rows, and only them: the view holds no child, no child status and no child output (rule 2).
 */
describe('AgentRunCollaborationContext', () => {
  beforeEach(() => { setActivePinia(createPinia()); invalidate.mockClear() })

  it('is its host\'s view: it holds the host and the agents of the runs in its tree, by the tree', () => {
    const context = build()
    expect(context.holdsAgent('host-run')).toBe(true)
    expect(context.holdsAgent('cua-run')).toBe(true)
    expect(context.holdsAgent('pb-run')).toBe(true)
    expect(context.holdsAgent('stranger')).toBe(false)
    expect(context.hasDelegatedRuns).toBe(true)
    useRunTreeStore().streamSnapshot(HOST, [agentRow('host-run', null, 0)])
    expect(context.hasDelegatedRuns).toBe(false)
  })

  it('gives the host and each delegated run a Team-tab perspective with counterparts named from the tree, loaded when shown', async () => {
    storeParticipantMessages('agent', 'host-run', agentRootMessages)
    // A delegated run's Team tab reads its own run's log (autobyteus-461 rule 2; CR-461-020).
    storeParticipantMessages('agent', 'cua-run', agentRootMessages)
    const context = build()
    const host = context.messagesView('host-run')
    expect(host).toMatchObject({ rootKind: 'agent', rootRunId: 'host-run', focusedMemberAddress: '/research_assistant' })
    expect(host.listMessages()).toEqual([])
    expect(host.messagesStatus().state).toBe('idle')
    host.loadMessages()
    context.messagesView('cua-run').loadMessages()
    await settle()
    expect(host.messagesStatus().state).toBe('loaded')
    expect(host.listMessages()).toMatchObject([{ direction: 'received', counterpart: { label: 'computer use agent', kind: 'delegated',
      runId: 'host-run', executionRunId: 'cua-run' } }])
    // REQ-008: the run's own agent reads as its name (VIS-013); the collaborator keeps the lowercase row label above.
    expect(context.messagesView('cua-run').listMessages()).toMatchObject([{ direction: 'sent', counterpart: { label: 'Research Assistant', kind: 'configured' } }])
    // A delegated team's member names its team run.
    expect(context.messagesView('host-run').memberIdentityByAgentRunId()['pp-run']).toMatchObject({ kind: 'delegated', runId: 'team-run', executionRunId: 'team-run' })
    expect(host.referenceContentPath('m1', 'r1')).toBe('agent-collaborations/host-run/communication/messages/m1/references/r1/content')
    expect(() => context.messagesView('stranger')).toThrow('not in this run')
  })

  it('applies sequenced events: messages to the Team tab lists, the tree\'s changes to its rows, and refuses a gap', async () => {
    storeParticipantMessages('agent', 'host-run', agentRootMessages)
    const context = build()
    context.messagesView('host-run').loadMessages()
    await settle()
    expect(context.applyEvent(5, { kind: 'communication', message: message('m2', 'host-run', 'pp-run', 'thanks') })).toBe('applied')
    expect(context.messagesView('host-run').listMessages().map((row) => row.messageId)).toEqual(['m1', 'm2'])
    expect(context.view).not.toHaveProperty('communication_messages')
    expect(context.applyEvent(6, { kind: 'run_tree_changed', added: [agentRow('cr-copy-run', 'agent:host-run', 1)], removed: ['agent:cua-run'], updated: [] })).toBe('applied')
    expect(useRunTreeStore().rowsOf(HOST).map((row) => row.key)).toContain('agent:cr-copy-run')
    expect(context.holdsAgent('cua-run')).toBe(false)
    expect(() => context.applyEvent(8, { kind: 'communication', message: message('m3', 'host-run', 'pp-run', 'gap') })).toThrow('change sequence gap')
    expect(context.phase).toBe('reopen_required')
  })

  it('autobyteus-461 SR-084 (AC-011): a tree change that removes rows re-loads the Team tab lists naming an agent no longer held', () => {
    const context = build()
    const reload = vi.spyOn(useCollaborationParticipantMessagesStore(), 'reloadNamingUnknown')
    context.applyEvent(5, { kind: 'run_tree_changed', added: [agentRow('cr-copy-run', 'agent:host-run', 1)], removed: [], updated: [] })
    expect(reload).not.toHaveBeenCalled()
    context.applyEvent(6, { kind: 'run_tree_changed', added: [], removed: ['agent:cua-run'], updated: [] })
    expect(reload).toHaveBeenCalledOnce()
    const [rootKind, rootRunId, holds] = reload.mock.calls[0]!
    expect([rootKind, rootRunId, holds('cua-run'), holds('host-run')]).toEqual(['agent', 'host-run', false, true])
  })

  it('refuses a message an agent sent to itself; a stop of its own agent keeps the stream (SR-045)', () => {
    const context = build()
    expect(() => context.applyEvent(5, { kind: 'communication', message: message('m-self', 'host-run', 'host-run') })).toThrow('identity mismatch')
    expect(useCollaborationParticipantMessagesStore().messagesOf({ rootKind: 'agent', rootRunId: 'host-run', agentRunId: 'host-run' })).toEqual([])
    context.setActive(false)
    expect(context.isActive).toBe(false)
    expect(context.phase).toBe('live')
  })

  it('a stored view (no live sequence) takes no events', () => {
    const context = build({ ...agentRootView(), live_sequence_id: null, last_message_change_sequence: null, is_active: false })
    expect(context.phase).toBe('historical')
    expect(() => context.applyEvent(5, { kind: 'communication', message: message('m2', 'host-run', 'cua-run') })).toThrow('not accepting')
  })
})
