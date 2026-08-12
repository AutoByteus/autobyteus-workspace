import { describe, expect, it } from 'vitest'
import {
  hasExplicitMemberLlmConfigOverride,
  hasMeaningfulMemberOverride,
  modelConfigsEqual,
  reconstructTeamRunConfigFromMetadata,
  resolveEffectiveMemberLlmConfig,
} from '~/utils/teamRunConfigUtils'
import { evaluateTeamRunLaunchReadiness } from '~/utils/teamRunLaunchReadiness'

const agentMetadataMember = (member: Record<string, unknown>) => {
  const memberAddress = String(member.memberAddress)
  return {
    kind: 'agent' as const,
    address: memberAddress ? `/${memberAddress}` : '',
    role: null,
    description: null,
    agentRunId: member.agentRunId,
    runtimeKind: member.runtimeKind,
    platformAgentRunId: member.platformAgentRunId,
    agentDefinitionId: member.agentDefinitionId,
    llmModelIdentifier: member.llmModelIdentifier,
    autoExecuteTools: member.autoExecuteTools,
    skillAccessMode: member.skillAccessMode,
    llmConfig: member.llmConfig,
    workspaceRootPath: member.workspaceRootPath,
    applicationExecutionContext: null,
  } as any
}

const teamMetadata = (input: {
  teamRunId: string
  teamDefinitionId: string
  teamDefinitionName: string
  coordinatorAddress: string
  createdAt: string
  archivedAt: null
  members: ReturnType<typeof agentMetadataMember>[]
}) => ({
  schemaVersion: 3 as const,
  teamDefinitionName: input.teamDefinitionName,
  createdAt: input.createdAt,
  archivedAt: input.archivedAt,
  rootTeam: {
    kind: 'agent_team' as const,
    address: '/',
    role: null,
    description: null,
    teamDefinitionId: input.teamDefinitionId,
    teamRunId: input.teamRunId,
    coordinatorAddress: `/${input.coordinatorAddress}`,
    children: input.members,
  },
  handoffs: [],
})

const workspaceMetadata = (workspaceId: string, rootPath = '/tmp/workspace') => ({
  workspaceId,
  workspaceRootPath: rootPath,
  displayName: rootPath.split('/').filter(Boolean).pop() ?? rootPath,
  kind: 'filesystem' as const,
})

describe('teamRunConfigUtils', () => {
  it('treats only property presence as an explicit member llmConfig override', () => {
    expect(hasExplicitMemberLlmConfigOverride(undefined)).toBe(false)
    expect(hasExplicitMemberLlmConfigOverride({ agentDefinitionId: 'agent-a' })).toBe(false)
    expect(
      hasExplicitMemberLlmConfigOverride({
        agentDefinitionId: 'agent-a',
        llmConfig: null,
      }),
    ).toBe(true)
  })

  it('resolves effective member config from explicit override or global fallback', () => {
    expect(
      resolveEffectiveMemberLlmConfig(
        { agentDefinitionId: 'agent-a' },
        { reasoning_effort: 'high' },
      ),
    ).toEqual({ reasoning_effort: 'high' })

    expect(
      resolveEffectiveMemberLlmConfig(
        { agentDefinitionId: 'agent-a', llmConfig: null },
        { reasoning_effort: 'high' },
      ),
    ).toBeNull()
  })

  it('compares model configs independent of key order', () => {
    expect(
      modelConfigsEqual(
        { reasoning_effort: 'high', include_plan_tool: true },
        { include_plan_tool: true, reasoning_effort: 'high' },
      ),
    ).toBe(true)
  })

  it('treats explicit null llmConfig as a meaningful member override', () => {
    expect(
      hasMeaningfulMemberOverride({
        agentDefinitionId: 'agent-a',
        llmConfig: null,
      }),
    ).toBe(true)
  })

  it('reconstructs global defaults and only keeps divergent overrides from member metadata', () => {
    const config = reconstructTeamRunConfigFromMetadata({
      metadata: teamMetadata({
        teamRunId: 'team-1',
        teamDefinitionId: 'team-def-1',
        teamDefinitionName: 'Test Team',
        coordinatorAddress: 'professor',
        createdAt: '2026-03-30T00:00:00.000Z',
        archivedAt: null,
        members: [
          agentMetadataMember({
            memberAddress: 'professor',
            agentRunId: 'member-1',
            runtimeKind: 'codex_app_server',
            platformAgentRunId: null,
            agentDefinitionId: 'agent-a',
            llmModelIdentifier: 'gpt-5.4',
            autoExecuteTools: true,
            skillAccessMode: 'PRELOADED_ONLY',
            llmConfig: { reasoning_effort: 'high' },
            workspaceRootPath: '/tmp/workspace',
          }),
          agentMetadataMember({
            memberAddress: 'student',
            agentRunId: 'member-2',
            runtimeKind: 'codex_app_server',
            platformAgentRunId: null,
            agentDefinitionId: 'agent-b',
            llmModelIdentifier: 'gpt-5.4',
            autoExecuteTools: true,
            skillAccessMode: 'PRELOADED_ONLY',
            llmConfig: { reasoning_effort: 'high' },
            workspaceRootPath: '/tmp/workspace',
          }),
          agentMetadataMember({
            memberAddress: 'critic',
            agentRunId: 'member-3',
            runtimeKind: 'codex_app_server',
            platformAgentRunId: null,
            agentDefinitionId: 'agent-c',
            llmModelIdentifier: 'gpt-5.4',
            autoExecuteTools: false,
            skillAccessMode: 'PRELOADED_ONLY',
            llmConfig: null,
            workspaceRootPath: '/tmp/workspace',
          }),
        ],
      }),
      primaryWorkspaceMetadata: workspaceMetadata('ws-1'),
      isLocked: true,
    })

    expect(config.runtimeKind).toBe('codex_app_server')
    expect(config.llmModelIdentifier).toBe('gpt-5.4')
    expect(config.llmConfig).toEqual({ reasoning_effort: 'high' })
    expect(config.autoExecuteTools).toBe(true)
    expect(config.skillAccessMode).toBe('PRELOADED_ONLY')
    expect(config.memberOverrides).toEqual({
      '/critic': {
        agentDefinitionId: 'agent-c',
        autoExecuteTools: false,
        llmConfig: null,
      },
    })
  })

  it('reconstructs member runtime overrides when one member runtime differs from the dominant team runtime', () => {
    const config = reconstructTeamRunConfigFromMetadata({
      metadata: teamMetadata({
        teamRunId: 'team-2',
        teamDefinitionId: 'team-def-2',
        teamDefinitionName: 'Mixed Team',
        coordinatorAddress: 'writer',
        createdAt: '2026-03-30T00:00:00.000Z',
        archivedAt: null,
        members: [
          agentMetadataMember({
            memberAddress: 'writer',
            agentRunId: 'member-1',
            runtimeKind: 'codex_app_server',
            platformAgentRunId: null,
            agentDefinitionId: 'agent-writer',
            llmModelIdentifier: 'gpt-5.4',
            autoExecuteTools: false,
            skillAccessMode: 'PRELOADED_ONLY',
            llmConfig: null,
            workspaceRootPath: '/tmp/workspace',
          }),
          agentMetadataMember({
            memberAddress: 'reviewer',
            agentRunId: 'member-2',
            runtimeKind: 'claude_agent_sdk',
            platformAgentRunId: null,
            agentDefinitionId: 'agent-reviewer',
            llmModelIdentifier: 'claude-sonnet',
            autoExecuteTools: false,
            skillAccessMode: 'PRELOADED_ONLY',
            llmConfig: null,
            workspaceRootPath: '/tmp/workspace',
          }),
        ],
      }),
      primaryWorkspaceMetadata: workspaceMetadata('ws-2'),
      isLocked: false,
    })

    expect(config.runtimeKind).toBe('codex_app_server')
    expect(config.memberOverrides).toEqual({
      '/reviewer': {
        agentDefinitionId: 'agent-reviewer',
        runtimeKind: 'claude_agent_sdk',
        llmModelIdentifier: 'claude-sonnet',
      },
    })
  })

  it('does not synthesize member override keys from bare member names', () => {
    const config = reconstructTeamRunConfigFromMetadata({
      metadata: teamMetadata({
        teamRunId: 'team-duplicate-leaf',
        teamDefinitionId: 'team-def-duplicate-leaf',
        teamDefinitionName: 'Duplicate Leaf Team',
        coordinatorAddress: 'program_manager',
        createdAt: '2026-05-17T00:00:00.000Z',
        archivedAt: null,
        members: [
          agentMetadataMember({
            memberAddress: 'program_manager',
            agentRunId: 'program-manager-run',
            runtimeKind: 'codex_app_server',
            platformAgentRunId: null,
            agentDefinitionId: 'agent-program-manager',
            llmModelIdentifier: 'gpt-5.4',
            autoExecuteTools: false,
            skillAccessMode: 'PRELOADED_ONLY',
            llmConfig: null,
            workspaceRootPath: '/tmp/workspace',
          }),
          agentMetadataMember({
            memberAddress: '',
            agentRunId: 'missing-route-review-lead-run',
            runtimeKind: 'claude_agent_sdk',
            platformAgentRunId: null,
            agentDefinitionId: 'agent-missing-route-review-lead',
            llmModelIdentifier: 'claude-sonnet',
            autoExecuteTools: false,
            skillAccessMode: 'PRELOADED_ONLY',
            llmConfig: null,
            workspaceRootPath: '/tmp/workspace',
          }),
          agentMetadataMember({
            memberAddress: 'BuildSquad/review_lead',
            agentRunId: 'build-review-lead-run',
            runtimeKind: 'claude_agent_sdk',
            platformAgentRunId: null,
            agentDefinitionId: 'agent-build-review-lead',
            llmModelIdentifier: 'claude-sonnet',
            autoExecuteTools: false,
            skillAccessMode: 'PRELOADED_ONLY',
            llmConfig: null,
            workspaceRootPath: '/tmp/workspace',
          }),
        ],
      }),
      primaryWorkspaceMetadata: workspaceMetadata('ws-duplicate-leaf'),
      isLocked: false,
    })

    expect(config.memberOverrides).not.toHaveProperty('review_lead')
    expect(config.memberOverrides).toEqual({
      '/BuildSquad/review_lead': {
        agentDefinitionId: 'agent-build-review-lead',
        runtimeKind: 'claude_agent_sdk',
        llmModelIdentifier: 'claude-sonnet',
      },
    })
  })

  it('reconstructs a coherent default runtime/model/config tuple for mixed metadata and stays launch-ready', () => {
    const config = reconstructTeamRunConfigFromMetadata({
      metadata: teamMetadata({
        teamRunId: 'team-3',
        teamDefinitionId: 'team-def-3',
        teamDefinitionName: 'Mixed Restore Team',
        coordinatorAddress: 'writer',
        createdAt: '2026-04-23T00:00:00.000Z',
        archivedAt: null,
        members: [
          agentMetadataMember({
            memberAddress: 'writer',
            agentRunId: 'member-1',
            runtimeKind: 'autobyteus',
            platformAgentRunId: null,
            agentDefinitionId: 'agent-writer',
            llmModelIdentifier: 'auto-model-z',
            autoExecuteTools: false,
            skillAccessMode: 'PRELOADED_ONLY',
            llmConfig: { thinking_level: 4 },
            workspaceRootPath: '/tmp/workspace',
          }),
          agentMetadataMember({
            memberAddress: 'researcher',
            agentRunId: 'member-2',
            runtimeKind: 'autobyteus',
            platformAgentRunId: null,
            agentDefinitionId: 'agent-researcher',
            llmModelIdentifier: 'auto-model-z',
            autoExecuteTools: false,
            skillAccessMode: 'PRELOADED_ONLY',
            llmConfig: { thinking_level: 4 },
            workspaceRootPath: '/tmp/workspace',
          }),
          agentMetadataMember({
            memberAddress: 'reviewer',
            agentRunId: 'member-3',
            runtimeKind: 'codex_app_server',
            platformAgentRunId: null,
            agentDefinitionId: 'agent-reviewer',
            llmModelIdentifier: 'codex-model-a',
            autoExecuteTools: false,
            skillAccessMode: 'PRELOADED_ONLY',
            llmConfig: { reasoning_effort: 'high' },
            workspaceRootPath: '/tmp/workspace',
          }),
          agentMetadataMember({
            memberAddress: 'implementer',
            agentRunId: 'member-4',
            runtimeKind: 'codex_app_server',
            platformAgentRunId: null,
            agentDefinitionId: 'agent-implementer',
            llmModelIdentifier: 'codex-model-a',
            autoExecuteTools: false,
            skillAccessMode: 'PRELOADED_ONLY',
            llmConfig: { reasoning_effort: 'high' },
            workspaceRootPath: '/tmp/workspace',
          }),
          agentMetadataMember({
            memberAddress: 'critic',
            agentRunId: 'member-5',
            runtimeKind: 'codex_app_server',
            platformAgentRunId: null,
            agentDefinitionId: 'agent-critic',
            llmModelIdentifier: 'codex-model-b',
            autoExecuteTools: false,
            skillAccessMode: 'PRELOADED_ONLY',
            llmConfig: { reasoning_effort: 'medium' },
            workspaceRootPath: '/tmp/workspace',
          }),
        ],
      }),
      primaryWorkspaceMetadata: workspaceMetadata('ws-3'),
      isLocked: false,
    })

    expect(config.runtimeKind).toBe('codex_app_server')
    expect(config.llmModelIdentifier).toBe('codex-model-a')
    expect(config.llmConfig).toEqual({ reasoning_effort: 'high' })
    expect(config.memberOverrides).toEqual({
      '/writer': {
        agentDefinitionId: 'agent-writer',
        runtimeKind: 'autobyteus',
        llmModelIdentifier: 'auto-model-z',
        llmConfig: { thinking_level: 4 },
      },
      '/researcher': {
        agentDefinitionId: 'agent-researcher',
        runtimeKind: 'autobyteus',
        llmModelIdentifier: 'auto-model-z',
        llmConfig: { thinking_level: 4 },
      },
      '/critic': {
        agentDefinitionId: 'agent-critic',
        llmModelIdentifier: 'codex-model-b',
        llmConfig: { reasoning_effort: 'medium' },
      },
    })

    expect(
      evaluateTeamRunLaunchReadiness(config, {
        autobyteus: ['auto-model-z'],
        codex_app_server: ['codex-model-a', 'codex-model-b'],
      }),
    ).toEqual({
      canLaunch: true,
      blockingIssues: [],
      unresolvedMembers: [],
    })
  })
})
