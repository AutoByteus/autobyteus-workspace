import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { AgentRunCollaborationContext } from '../agentRunCollaborationContext'

vi.mock('~/services/collaborators/collaboratorCandidatesService', () => ({ collaboratorCandidatesService: { invalidate: vi.fn() } }))

import { created, launch } from './agentRootFixture'
import { buildChildRunsContext } from './agentRootChildRunsFixture'

/** autobyteus-461 DS-8, SR-042: an Agent run's child rows are its open children; a change to them reads the view again. */
const listed = (context: AgentRunCollaborationContext) => context.listTaskRows(() => true).map((entry) => entry.row.rowKey)
const event = (added: unknown[], removed: Array<{ agentRunId: string } | { teamRunId: string }>) =>
  ({ kind: 'child_runs_changed', run_id: 'host-run', added, removed }) as never
const newAgent = { address: '/release_writer', agentRunId: 'new-run', platformAgentRunId: null, delegatorAgentRunId: 'host-run', startedAt: created,
  source: { kind: 'agent', agentDefinitionId: 'writer', launchConfiguration: launch } }
const peer = { kind: 'agent', address: '/far', agent_run_id: 'far-run', node_id: 'node-b', node_name: 'B', delegator_agent_run_id: 'host-run', started_at: created }

describe('Agent run child rows', () => {
  beforeEach(() => { setActivePinia(createPinia()) })

  it('lists every child row the view has, with the work under a delegated Team', () => {
    const context = buildChildRunsContext()
    expect(listed(context)).toEqual([
      'agent:cua-run', 'team:team-run', 'agent:pp-run', 'agent:pb-run',
      'agent:writer-run', 'team:review-team', 'agent:rp-run', 'agent:rb-run', 'agent:helper-run', 'agent:other-task-run',
    ])
    expect(['writer-run', 'helper-run', 'other-task-run'].every((id) => context.isListed(id))).toBe(true)
  })

  it('reads the view again for a new, reopened or peer delegation, and for a closure or deletion that removes a row', () => {
    const context = buildChildRunsContext()
    expect(context.applyChildRunsChanged(event([newAgent], []))).toBe('checkpoint_required')
    expect(context.applyChildRunsChanged(event([peer], []))).toBe('checkpoint_required')
    expect(context.applyChildRunsChanged(event([], [{ agentRunId: 'writer-run' }]))).toBe('checkpoint_required')
    expect(context.applyChildRunsChanged(event([], [{ teamRunId: 'review-team' }]))).toBe('checkpoint_required')
  })

  it('does nothing for a change it already has: a held added row, an unknown removed row (an event held during its snapshot)', () => {
    const context = buildChildRunsContext()
    const writer = context.view.execution_tree.taskExecutions.find((task) => 'agentRunId' in task && task.agentRunId === 'writer-run')!
    expect(context.applyChildRunsChanged(event([writer], [{ agentRunId: 'unknown-run' }, { teamRunId: 'unknown-team' }]))).toBe('applied')
    expect(context.applyChildRunsChanged(event([], []))).toBe('applied')
    expect(listed(context)).toHaveLength(10)
  })
})
