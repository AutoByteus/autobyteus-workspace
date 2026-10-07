import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { AgentRunCollaborationContext } from '../agentRunCollaborationContext'

vi.mock('~/services/collaborators/collaboratorCandidatesService', () => ({ collaboratorCandidatesService: { invalidate: vi.fn() } }))

import { created } from './agentRootFixture'
import { buildClosureContext, closureView } from './agentRootClosureFixture'

const listed = (context: AgentRunCollaborationContext) => context.listTaskRows(() => true).map((entry) => entry.row.rowKey)

describe('Agent root closed task executions', () => {
  beforeEach(() => { setActivePinia(createPinia()) })

  it('lists every open task execution; a closed one and its whole subtree are left out of the rows only', () => {
    expect(listed(buildClosureContext())).toEqual([
      'agent:cua-run', 'team:team-run', 'agent:pp-run', 'agent:pb-run',
      'agent:writer-run', 'team:review-team', 'agent:rp-run', 'agent:rb-run', 'agent:helper-run', 'agent:other-task-run',
    ])
    const context = buildClosureContext(closureView([{ agentRunId: 'writer-run' }, { teamRunId: 'review-team' }]))
    expect(listed(context)).toEqual(['agent:cua-run', 'team:team-run', 'agent:pp-run', 'agent:pb-run', 'agent:other-task-run'])
    for (const hidden of ['writer-run', 'rp-run', 'rb-run', 'helper-run']) {
      expect(context.isListed(hidden)).toBe(false)
      // The tree, the index and the contexts keep closed runs (Team tab, REQ-008).
      expect(context.getAgentContext(hidden)).not.toBeNull()
    }
    expect(context.isListed('other-task-run')).toBe(true)
    expect(context.view.execution_tree.taskExecutions).toHaveLength(3)
    expect(context.messagesView('host-run').listMessages().map((message) => message.messageId)).toContain('m-writer')
  })

  it('applies task_executions_closed in place (no reload), idempotently, and keeps the participant index', () => {
    const context = buildClosureContext()
    expect(context.applyEvent(5, { kind: 'task_executions_closed', task_executions: [{ teamRunId: 'review-team' }] })).toBe('applied')
    expect(listed(context)).not.toContain('agent:helper-run')
    expect(context.applyEvent(6, { kind: 'task_executions_closed', task_executions: [{ teamRunId: 'review-team' }, { agentRunId: 'writer-run' }] })).toBe('applied')
    expect(context.view.closed_task_executions).toEqual([{ teamRunId: 'review-team' }, { agentRunId: 'writer-run' }])
    expect(listed(context)).toEqual(['agent:cua-run', 'team:team-run', 'agent:pp-run', 'agent:pb-run', 'agent:other-task-run'])
    expect(context.index.isParticipant('writer-run')).toBe(true)
    expect(context.applyEvent(7, { kind: 'communication', message: {
      messageId: 'm-late', senderAgentRunId: 'host-run', receiverAgentRunId: 'writer-run', content: 'Thanks', messageType: 'direct_message', referenceFiles: [], createdAt: created,
    } })).toBe('applied')
  })

  it('applies task_executions_reopened in place: the reactivated execution is listed again, its still-closed helper is not (REQ-008, AC-004/005)', () => {
    const context = buildClosureContext(closureView([{ agentRunId: 'writer-run' }, { teamRunId: 'review-team' }, { agentRunId: 'helper-run' }]))
    expect(context.applyEvent(5, { kind: 'task_executions_reopened', task_executions: [{ teamRunId: 'review-team' }] })).toBe('applied')
    expect(context.view.closed_task_executions).toEqual([{ agentRunId: 'writer-run' }, { agentRunId: 'helper-run' }])
    expect(listed(context)).toEqual(['agent:cua-run', 'team:team-run', 'agent:pp-run', 'agent:pb-run',
      'team:review-team', 'agent:rp-run', 'agent:rb-run', 'agent:other-task-run'])
    expect(context.isListed('rp-run')).toBe(true)
    expect(context.isListed('helper-run')).toBe(false)
    // A later DONE closes it again (REQ-009).
    expect(context.applyEvent(6, { kind: 'task_executions_closed', task_executions: [{ teamRunId: 'review-team' }] })).toBe('applied')
    expect(context.isListed('rp-run')).toBe(false)
  })

  it('requires a fresh view when a reopened reference is not a task execution of the run', () => {
    const context = buildClosureContext(closureView([{ agentRunId: 'writer-run' }]))
    expect(() => context.applyEvent(5, { kind: 'task_executions_reopened', task_executions: [{ agentRunId: 'ghost-run' }] })).toThrow()
    expect(context.phase).toBe('reopen_required')
  })

  it('requires a fresh view when a closed reference is not a task execution of the run', () => {
    const context = buildClosureContext()
    expect(() => context.applyEvent(5, { kind: 'task_executions_closed', task_executions: [{ agentRunId: 'ghost-run' }] })).toThrow()
    expect(context.phase).toBe('reopen_required')
  })
})
