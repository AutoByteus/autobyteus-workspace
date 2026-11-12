import { describe, expect, it } from 'vitest'
import {
  collaborationTreeWalk,
  collectClosedSubtrees,
  fromTeamTaskExecutionReference,
  mergeClosedTaskExecutions,
  removeReopenedTaskExecutions,
  type CollaborationTreeNode,
} from '../taskExecutionClosure'

const tree: CollaborationTreeNode[] = [
  { agentRunId: 'configured' },
  { teamRunId: 'task-team', delegatorAgentRunId: 'configured', members: [{ agentRunId: 'lead' }],
    taskExecutions: [{ teamRunId: 'nested-task', delegatorAgentRunId: 'lead', members: [{ agentRunId: 'nested-lead' }], taskExecutions: [] }] },
  { agentRunId: 'open-task', delegatorAgentRunId: 'configured' },
]

describe('taskExecutionClosure', () => {
  it('maps every node at or under a closed task execution to its outermost closed execution', () => {
    const hidden = collectClosedSubtrees(tree, [{ teamRunId: 'nested-task' }, { teamRunId: 'task-team' }], collaborationTreeWalk)
    expect([...hidden.keys()]).toEqual(['team:task-team', 'agent:lead', 'team:nested-task', 'agent:nested-lead'])
    expect(hidden.get('agent:nested-lead')).toBe(tree[1])
    expect(collectClosedSubtrees(tree, [], collaborationTreeWalk).size).toBe(0)
  })

  it('merges closed references once (a repeated DONE re-publishes them) and maps the Team stream shape', () => {
    expect(mergeClosedTaskExecutions([{ agentRunId: 'a' }], [{ agentRunId: 'a' }, { teamRunId: 'a' }]))
      .toEqual([{ agentRunId: 'a' }, { teamRunId: 'a' }])
    expect(fromTeamTaskExecutionReference({ agent_run_id: 'a' })).toEqual({ agentRunId: 'a' })
    expect(fromTeamTaskExecutionReference({ team_run_id: 't' })).toEqual({ teamRunId: 't' })
  })

  it('removes reactivated references only, by exact kind and run ID; unknown ones change nothing', () => {
    const closed = [{ agentRunId: 'a' }, { teamRunId: 'a' }, { teamRunId: 'nested-task' }]
    expect(removeReopenedTaskExecutions(closed, [{ teamRunId: 'a' }])).toEqual([{ agentRunId: 'a' }, { teamRunId: 'nested-task' }])
    expect(removeReopenedTaskExecutions(closed, [{ agentRunId: 'missing' }])).toEqual(closed)
    // The subtree of a reactivated Team is listed again except a nested execution that is still closed.
    const hidden = collectClosedSubtrees(tree, removeReopenedTaskExecutions([{ teamRunId: 'task-team' }, { teamRunId: 'nested-task' }],
      [{ teamRunId: 'task-team' }]), collaborationTreeWalk)
    expect([...hidden.keys()]).toEqual(['team:nested-task', 'agent:nested-lead'])
  })
})
