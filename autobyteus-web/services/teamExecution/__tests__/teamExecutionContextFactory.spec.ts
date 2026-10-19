import { describe, expect, it } from 'vitest'
import type { AgentLaunchConfigurationDto, TeamRunExecutionTreeDto } from '@autobyteus/team-stream-contracts'
import { buildEditableTeamRunSeed } from '~/composables/useDefinitionLaunchDefaults'
import { teamAgentSourceAt } from '~/services/collaborators/agentSourceSelectors'
import {
  createTeamAgentContext,
  createTeamConfigurationView,
} from '~/services/teamExecution/teamExecutionContextFactory'
import type { AgentTeamAddress } from '~/types/agent/AgentTeamAddress'
import type { WorkspaceMetadata } from '~/types/workspace/WorkspaceMetadata'

const launch = (overrides: Partial<AgentLaunchConfigurationDto> = {}): AgentLaunchConfigurationDto => ({
  runtime_kind: 'codex_app_server',
  llm_model_identifier: 'gpt-5.6-luna',
  llm_config: { reasoning_effort: 'medium', nested: { values: ['medium'] } },
  auto_execute_tools: false,
  workspace_root_path: '/workspace/root',
  ...overrides,
})

const tree = (): TeamRunExecutionTreeDto => ({
  created_at: '2026-08-24T12:00:00.000Z',
  archived_at: null,
  application_binding: null,
  handoffs: [],
  root_team: {
    address: '/',
    team_definition_id: 'root-def',
    team_definition_name: 'Classroom',
    team_run_id: 'root-run',
    coordinator_address: '/teacher',
    default_launch_configuration: launch(),
    members: [
      {
        kind: 'configured_agent',
        address: '/teacher',
        agent_definition_id: 'teacher-def',
        role: null,
        description: null,
        agent_run_id: 'teacher-run',
        platform_agent_run_id: null,
        launch_configuration: launch(),
      },
      {
        kind: 'configured_agent',
        address: '/student_one',
        agent_definition_id: 'student-one-def',
        role: 'Student',
        description: null,
        agent_run_id: 'student-one-run',
        platform_agent_run_id: null,
        launch_configuration: launch({
          runtime_kind: 'claude_agent_sdk',
          llm_model_identifier: 'claude-opus',
          llm_config: { temperature: 0.2 },
          auto_execute_tools: true,
          workspace_root_path: '/workspace/student-one',
        }),
      },
    ],
    task_executions: [],
  },
})

const metadata = (
  workspaceId: string,
  workspaceRootPath: string,
): WorkspaceMetadata => ({
  workspaceId,
  workspaceRootPath,
  displayName: workspaceId,
  kind: 'filesystem',
})

const workspaceMetadataByAddress = (): ReadonlyMap<AgentTeamAddress, WorkspaceMetadata> => new Map([
  ['/', metadata('root-ws', '/workspace/root')],
  ['/student_one', metadata('student-ws', '/workspace/student-one')],
])

describe('teamExecutionContextFactory stored V2 projection', () => {
  it('builds a deeply immutable complete stored snapshot without coordinator inference', () => {
    const source = tree()
    const original = structuredClone(source)
    const view = createTeamConfigurationView({
      tree: source,
      workspaceMetadataByAddress: workspaceMetadataByAddress(),
    })

    expect(view.source).toBe('STORED_SNAPSHOT')
    if (view.source !== 'STORED_SNAPSHOT') throw new Error('Expected stored Team configuration view.')
    expect(view.coordinatorAddress).toBe('/teacher')
    expect(view.memberNodes.map((member) => [member.kind, member.address])).toEqual([
      ['agent', '/teacher'],
      ['agent', '/student_one'],
    ])
    expect(view.root.effectiveConfig).toEqual(expect.objectContaining({
      runtimeKind: 'codex_app_server',
      workspaceRootPath: '/workspace/root',
    }))
    expect(Object.keys(view.teamsByAddress)).toEqual(['/'])
    expect(view.agentsByAddress['/student_one']).toEqual(expect.objectContaining({
      containingTeamAddress: '/',
      effectiveConfig: expect.objectContaining({
        runtimeKind: 'claude_agent_sdk',
        llmModelIdentifier: 'claude-opus',
        workspaceRootPath: '/workspace/student-one',
        llmConfig: { temperature: 0.2 },
      }),
    }))
    expect(Object.isFrozen(view)).toBe(true)
    expect(Object.isFrozen(view.memberNodes)).toBe(true)
    expect(Object.isFrozen(view.memberNodes[1])).toBe(true)
    expect(Object.isFrozen(view.teamsByAddress)).toBe(true)
    expect(Object.isFrozen(view.agentsByAddress['/student_one'].effectiveConfig.llmConfig)).toBe(true)
    expect(source).toEqual(original)
  })

  it('converts stored history one way into only fields supported by new-run authoring', () => {
    const view = createTeamConfigurationView({
      tree: tree(),
      workspaceMetadataByAddress: workspaceMetadataByAddress(),
    })
    const seed = buildEditableTeamRunSeed(view)

    expect(seed).toEqual(expect.objectContaining({
      rootConfig: expect.objectContaining({
        runtimeKind: 'codex_app_server',
        workspace: expect.objectContaining({ workspaceId: 'root-ws' }),
      }),
      teamOverrides: {},
      agentOverrides: {
        '/student_one': expect.objectContaining({
          runtimeKind: 'claude_agent_sdk',
          llmModelIdentifier: 'claude-opus',
          llmConfig: { temperature: 0.2 },
          autoExecuteTools: true,
        }),
      },
      isLocked: false,
    }))
    expect(seed.agentOverrides['/student_one']).not.toHaveProperty('workspace')

    ;(seed.agentOverrides['/student_one'].llmConfig as { temperature: number }).temperature = 0.9
    expect(view.agentsByAddress['/student_one'].effectiveConfig.llmConfig).toEqual({ temperature: 0.2 })
  })

  it('creates one locked Agent context from the exact configured Agent snapshot', () => {
    const source = tree()
    expect(teamAgentSourceAt(source, '/student_one')?.agent_definition_id).toBeTruthy()

    const context = createTeamAgentContext({
      tree: source,
      agentRunId: 'student-one-run',
      address: '/student_one',
      workspaceMetadata: metadata('student-ws', '/workspace/student-one'),
    })

    expect(context?.config).toEqual(expect.objectContaining({
      agentDefinitionId: 'student-one-def',
      runtimeKind: 'claude_agent_sdk',
      llmModelIdentifier: 'claude-opus',
      workspaceId: 'student-ws',
      llmConfig: { temperature: 0.2 },
      isLocked: true,
    }))
    expect(createTeamAgentContext({
      tree: source,
      agentRunId: 'missing-run',
      address: '/missing',
      workspaceMetadata: null,
    })).toBeNull()
  })
})
