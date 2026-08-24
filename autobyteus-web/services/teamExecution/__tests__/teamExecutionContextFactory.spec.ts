import { describe, expect, it } from 'vitest'
import type { AgentLaunchConfigurationDto, TeamRunExecutionTreeDto } from '@autobyteus/team-stream-contracts'
import { buildEditableTeamRunSeed } from '~/composables/useDefinitionLaunchDefaults'
import {
  configuredAgentAtAddress,
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
  skill_access_mode: 'PRELOADED_ONLY',
  workspace_root_path: '/workspace/root',
  ...overrides,
})

const tree = (): TeamRunExecutionTreeDto => ({
  schema_version: 2,
  created_at: '2026-08-24T12:00:00.000Z',
  archived_at: null,
  application_binding: null,
  handoffs: [],
  root_team: {
    address: '/',
    team_definition_id: 'root-def',
    team_definition_name: 'Nested Classroom',
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
        kind: 'configured_team',
        address: '/StudentStudyGroup',
        team_definition_id: 'study-def',
        role: 'Students',
        description: null,
        team_run_id: 'study-run',
        coordinator_address: '/StudentStudyGroup/student_one',
        default_launch_configuration: launch({
          runtime_kind: 'claude_agent_sdk',
          llm_model_identifier: 'claude-sonnet',
          llm_config: null,
          auto_execute_tools: true,
          skill_access_mode: 'NONE',
          workspace_root_path: '/workspace/study',
        }),
        members: [
          {
            kind: 'configured_agent',
            address: '/StudentStudyGroup/student_one',
            agent_definition_id: 'student-one-def',
            role: null,
            description: null,
            agent_run_id: 'student-one-run',
            platform_agent_run_id: null,
            launch_configuration: launch({
              runtime_kind: 'claude_agent_sdk',
              llm_model_identifier: 'claude-opus',
              llm_config: { temperature: 0.2 },
              auto_execute_tools: true,
              skill_access_mode: 'NONE',
              workspace_root_path: '/workspace/student-one',
            }),
          },
        ],
        task_executions: [],
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
  ['/StudentStudyGroup', metadata('study-ws', '/workspace/study')],
  ['/StudentStudyGroup/student_one', metadata('student-ws', '/workspace/student-one')],
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
    expect(view.root.effectiveConfig).toEqual(expect.objectContaining({
      runtimeKind: 'codex_app_server',
      workspaceRootPath: '/workspace/root',
      skillAccessMode: 'PRELOADED_ONLY',
    }))
    expect(view.teamsByAddress['/StudentStudyGroup']).toEqual(expect.objectContaining({
      parentAddress: '/',
      isCustomized: true,
      effectiveConfig: expect.objectContaining({
        runtimeKind: 'claude_agent_sdk',
        workspaceRootPath: '/workspace/study',
        skillAccessMode: 'NONE',
        llmConfig: null,
      }),
    }))
    expect(view.agentsByAddress['/StudentStudyGroup/student_one'].effectiveConfig).toEqual(expect.objectContaining({
      llmModelIdentifier: 'claude-opus',
      workspaceRootPath: '/workspace/student-one',
      skillAccessMode: 'NONE',
      llmConfig: { temperature: 0.2 },
    }))
    expect(Object.isFrozen(view)).toBe(true)
    expect(Object.isFrozen(view.teamsByAddress)).toBe(true)
    expect(Object.isFrozen(view.agentsByAddress['/StudentStudyGroup/student_one'].effectiveConfig.llmConfig)).toBe(true)
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
        skillAccessMode: 'PRELOADED_ONLY',
      }),
      teamOverrides: {
        '/StudentStudyGroup': {
          runtimeKind: 'claude_agent_sdk',
          workspace: expect.objectContaining({
            workspaceId: 'study-ws',
            workspaceMetadata: expect.objectContaining({ workspaceRootPath: '/workspace/study' }),
          }),
          llmModelIdentifier: 'claude-sonnet',
          llmConfig: null,
          autoExecuteTools: true,
        },
      },
      agentOverrides: {
        '/StudentStudyGroup/student_one': {
          llmModelIdentifier: 'claude-opus',
          llmConfig: { temperature: 0.2 },
        },
      },
      isLocked: false,
    }))
    expect(seed.agentOverrides['/StudentStudyGroup/student_one']).not.toHaveProperty('workspace')
    expect(seed.agentOverrides['/StudentStudyGroup/student_one']).not.toHaveProperty('skillAccessMode')
    expect(seed.teamOverrides['/StudentStudyGroup']).not.toHaveProperty('skillAccessMode')

    ;(seed.agentOverrides['/StudentStudyGroup/student_one'].llmConfig as { temperature: number }).temperature = 0.9
    expect(view.agentsByAddress['/StudentStudyGroup/student_one'].effectiveConfig.llmConfig).toEqual({ temperature: 0.2 })
  })

  it('creates one locked Agent context from the exact configured Agent snapshot', () => {
    const source = tree()
    expect(configuredAgentAtAddress(source, '/StudentStudyGroup/student_one')?.agent_run_id).toBe('student-one-run')

    const context = createTeamAgentContext({
      tree: source,
      agentRunId: 'student-one-run',
      address: '/StudentStudyGroup/student_one',
      workspaceMetadata: metadata('student-ws', '/workspace/student-one'),
    })

    expect(context?.config).toEqual(expect.objectContaining({
      agentDefinitionId: 'student-one-def',
      runtimeKind: 'claude_agent_sdk',
      llmModelIdentifier: 'claude-opus',
      workspaceId: 'student-ws',
      skillAccessMode: 'NONE',
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
