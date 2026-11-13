import { describe, expect, it } from 'vitest'
import type { AgentRootChildAgent } from '~/services/agentCollaboration/agentRunCollaborationIndex'
import { agentRunDelegatedRunSubject } from '../delegatedRunSubjects'

const child = (agent: Partial<AgentRootChildAgent> & Pick<AgentRootChildAgent, 'agentRunId' | 'kind'>): AgentRootChildAgent => ({
  address: '/worker' as AgentRootChildAgent['address'],
  source: {} as AgentRootChildAgent['source'],
  teamRunId: null,
  delegatorAgentRunId: null,
  ...agent,
})
const indexOf = (...agents: AgentRootChildAgent[]) => ({ agents: new Map(agents.map((agent) => [agent.agentRunId, agent])) })

describe('agentRunDelegatedRunSubject (rule 2: a delegated run on this node, by its own identity)', () => {
  it('reads a delegated agent as its own agent run', () => {
    expect(agentRunDelegatedRunSubject(indexOf(child({ agentRunId: 'a-1', kind: 'task_agent' })), 'a-1'))
      .toEqual({ kind: 'agent', agentRunId: 'a-1' })
  })

  it('reads a delegated Team member through its Team run, at its address there', () => {
    const member = child({ agentRunId: 'm-1', kind: 'task_team_member', teamRunId: 'team-1', address: '/reviewer' as AgentRootChildAgent['address'] })
    expect(agentRunDelegatedRunSubject(indexOf(member), 'm-1'))
      .toEqual({ kind: 'team_member', teamRunId: 'team-1', memberAddress: '/reviewer', agentRunId: 'm-1' })
  })

  it('refuses a Team member without its Team run: never read as an agent run (CR-461-028, CR-461-037)', () => {
    expect(() => agentRunDelegatedRunSubject(indexOf(child({ agentRunId: 'm-2', kind: 'task_team_member' })), 'm-2'))
      .toThrow("Task Team member 'm-2' has no Team run.")
  })

  it('answers null for an agent the view does not list as a delegated run', () => {
    expect(agentRunDelegatedRunSubject(indexOf(), 'host-run')).toBeNull()
  })
})
