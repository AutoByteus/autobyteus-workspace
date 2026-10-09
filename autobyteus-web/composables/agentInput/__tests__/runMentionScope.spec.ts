import { describe, expect, it } from 'vitest'
import { resolveRunMentionScope } from '../runMentionScope'

const core = { access: 'live', context: { config: { agentDefinitionName: 'Project Task Manager' }, state: { runId: 'pm-run' } } }

describe('resolveRunMentionScope', () => {
  it('an Agent run host composer asks for its own candidates (the host is the focused agent)', () => {
    expect(resolveRunMentionScope({ ...core, kind: 'standalone_agent' } as never))
      .toEqual({ rootKind: 'agent', rootRunId: 'pm-run', focusedAgentRunId: 'pm-run', focusedName: 'Project Task Manager' })
  })

  it('a task child of an Agent run asks for its own candidates, under the host root (REQ-001)', () => {
    expect(resolveRunMentionScope({ ...core, kind: 'agent_run_task_team_member', host: { hostRunId: 'pm-run' },
      address: '/software_engineering_team/code_reviewer', agentRunId: 'reviewer-run' } as never))
      .toEqual({ rootKind: 'agent', rootRunId: 'pm-run', focusedAgentRunId: 'reviewer-run', focusedName: 'code reviewer' })
    expect(resolveRunMentionScope({ ...core, kind: 'agent_run_task_agent', host: { hostRunId: 'pm-run' },
      address: '/code_reviewer', agentRunId: 'reviewer-copy' } as never))
      .toMatchObject({ rootKind: 'agent', rootRunId: 'pm-run', focusedAgentRunId: 'reviewer-copy' })
  })

  it('Team and Org roots stay per root', () => {
    expect(resolveRunMentionScope({ ...core, kind: 'standalone_team_member',
      team: { rootRunId: 'team-run', focusedMemberAddress: '/researcher' } } as never))
      .toEqual({ rootKind: 'agent_team', rootRunId: 'team-run', focusedName: 'researcher' })
  })
})
