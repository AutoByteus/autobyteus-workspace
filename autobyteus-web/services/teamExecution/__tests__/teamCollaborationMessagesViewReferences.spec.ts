import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { buildTestTeamContext, testAgentNode } from '~/test-support/currentTeamTestFixtures'
import { teamCollaborationMessagesView } from '../teamCollaborationMessagesView'

// autobyteus-615 (REQ-004, AC-001, AC-005): a Team's Messages tab links each reference through the key its list was
// loaded with, so the server reads the same view: the Team's own members by the Team run, a run the Team delegated by
// that run (a delegated task team's member by its team run, a delegated task agent by its own run).
describe('teamCollaborationMessagesView reference links', () => {
  beforeEach(() => { setActivePinia(createPinia()) })
  const team = () => buildTestTeamContext({ teamRunId: 'team-root', rootChildren: [testAgentNode('/lead', { agentRunId: 'lead-run' })] })

  it("links a Team's own member's reference through the Team run", () => {
    expect(teamCollaborationMessagesView(team()).referenceContentPath('m1', 'r1'))
      .toBe('collaboration-messages/agent_team/team-root/messages/m1/references/r1/content')
  })

  it("links a delegated task team member's reference through its own team run (the observed case)", () => {
    const view = teamCollaborationMessagesView(team(), { subject: { kind: 'team_member', teamRunId: 'task-team', agentRunId: 'task-lead' },
      address: '/task-team/lead', agentRunId: 'task-lead' })
    expect(view.referenceContentPath('m1', 'r1')).toBe('collaboration-messages/agent_team/task-team/messages/m1/references/r1/content')
  })

  it("links a delegated task agent's reference through its own run", () => {
    const view = teamCollaborationMessagesView(team(), { subject: { kind: 'agent', agentRunId: 'task-agent' }, address: '/task-agent', agentRunId: 'task-agent' })
    expect(view.referenceContentPath('m1', 'r1')).toBe('collaboration-messages/agent/task-agent/messages/m1/references/r1/content')
  })
})
