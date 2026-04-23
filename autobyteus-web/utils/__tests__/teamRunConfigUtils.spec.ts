import { describe, expect, it } from 'vitest'
import {
  hasExplicitMemberLlmConfigOverride,
  hasMeaningfulMemberOverride,
  modelConfigsEqual,
  reconstructTeamRunConfigFromMetadata,
  resolveEffectiveMemberLlmConfig,
} from '~/utils/teamRunConfigUtils'
import { evaluateTeamRunLaunchReadiness } from '~/utils/teamRunLaunchReadiness'

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
      metadata: {
        teamRunId: 'team-1',
        teamDefinitionId: 'team-def-1',
        teamDefinitionName: 'Test Team',
        coordinatorMemberRouteKey: 'professor',
        runVersion: 1,
        createdAt: '2026-03-30T00:00:00.000Z',
        updatedAt: '2026-03-30T00:00:00.000Z',
        memberMetadata: [
          {
            memberRouteKey: 'professor',
            memberName: 'Professor',
            memberRunId: 'member-1',
            runtimeKind: 'codex_app_server',
            platformAgentRunId: null,
            agentDefinitionId: 'agent-a',
            llmModelIdentifier: 'gpt-5.4',
            autoExecuteTools: true,
            skillAccessMode: 'GLOBAL_DISCOVERY',
            llmConfig: { reasoning_effort: 'high' },
            workspaceRootPath: '/tmp/workspace',
          },
          {
            memberRouteKey: 'student',
            memberName: 'Student',
            memberRunId: 'member-2',
            runtimeKind: 'codex_app_server',
            platformAgentRunId: null,
            agentDefinitionId: 'agent-b',
            llmModelIdentifier: 'gpt-5.4',
            autoExecuteTools: true,
            skillAccessMode: 'GLOBAL_DISCOVERY',
            llmConfig: { reasoning_effort: 'high' },
            workspaceRootPath: '/tmp/workspace',
          },
          {
            memberRouteKey: 'critic',
            memberName: 'Critic',
            memberRunId: 'member-3',
            runtimeKind: 'codex_app_server',
            platformAgentRunId: null,
            agentDefinitionId: 'agent-c',
            llmModelIdentifier: 'gpt-5.4',
            autoExecuteTools: false,
            skillAccessMode: 'GLOBAL_DISCOVERY',
            llmConfig: null,
            workspaceRootPath: '/tmp/workspace',
          },
        ],
      },
      firstWorkspaceId: 'ws-1',
      isLocked: true,
    })

    expect(config.runtimeKind).toBe('codex_app_server')
    expect(config.llmModelIdentifier).toBe('gpt-5.4')
    expect(config.llmConfig).toEqual({ reasoning_effort: 'high' })
    expect(config.autoExecuteTools).toBe(true)
    expect(config.skillAccessMode).toBe('GLOBAL_DISCOVERY')
    expect(config.memberOverrides).toEqual({
      Critic: {
        agentDefinitionId: 'agent-c',
        autoExecuteTools: false,
        llmConfig: null,
      },
    })
  })

  it('reconstructs member runtime overrides when one member runtime differs from the dominant team runtime', () => {
    const config = reconstructTeamRunConfigFromMetadata({
      metadata: {
        teamRunId: 'team-2',
        teamDefinitionId: 'team-def-2',
        teamDefinitionName: 'Mixed Team',
        coordinatorMemberRouteKey: 'writer',
        runVersion: 1,
        createdAt: '2026-03-30T00:00:00.000Z',
        updatedAt: '2026-03-30T00:00:00.000Z',
        memberMetadata: [
          {
            memberRouteKey: 'writer',
            memberName: 'Writer',
            memberRunId: 'member-1',
            runtimeKind: 'codex_app_server',
            platformAgentRunId: null,
            agentDefinitionId: 'agent-writer',
            llmModelIdentifier: 'gpt-5.4',
            autoExecuteTools: false,
            skillAccessMode: 'PRELOADED_ONLY',
            llmConfig: null,
            workspaceRootPath: '/tmp/workspace',
          },
          {
            memberRouteKey: 'reviewer',
            memberName: 'Reviewer',
            memberRunId: 'member-2',
            runtimeKind: 'claude_agent_sdk',
            platformAgentRunId: null,
            agentDefinitionId: 'agent-reviewer',
            llmModelIdentifier: 'claude-sonnet',
            autoExecuteTools: false,
            skillAccessMode: 'PRELOADED_ONLY',
            llmConfig: null,
            workspaceRootPath: '/tmp/workspace',
          },
        ],
      },
      firstWorkspaceId: 'ws-2',
      isLocked: false,
    })

    expect(config.runtimeKind).toBe('codex_app_server')
    expect(config.memberOverrides).toEqual({
      Reviewer: {
        agentDefinitionId: 'agent-reviewer',
        runtimeKind: 'claude_agent_sdk',
        llmModelIdentifier: 'claude-sonnet',
      },
    })
  })

  it('reconstructs a coherent default runtime/model/config tuple for mixed metadata and stays launch-ready', () => {
    const config = reconstructTeamRunConfigFromMetadata({
      metadata: {
        teamRunId: 'team-3',
        teamDefinitionId: 'team-def-3',
        teamDefinitionName: 'Mixed Restore Team',
        coordinatorMemberRouteKey: 'writer',
        runVersion: 1,
        createdAt: '2026-04-23T00:00:00.000Z',
        updatedAt: '2026-04-23T00:00:00.000Z',
        memberMetadata: [
          {
            memberRouteKey: 'writer',
            memberName: 'Writer',
            memberRunId: 'member-1',
            runtimeKind: 'autobyteus',
            platformAgentRunId: null,
            agentDefinitionId: 'agent-writer',
            llmModelIdentifier: 'auto-model-z',
            autoExecuteTools: false,
            skillAccessMode: 'PRELOADED_ONLY',
            llmConfig: { thinking_level: 4 },
            workspaceRootPath: '/tmp/workspace',
          },
          {
            memberRouteKey: 'researcher',
            memberName: 'Researcher',
            memberRunId: 'member-2',
            runtimeKind: 'autobyteus',
            platformAgentRunId: null,
            agentDefinitionId: 'agent-researcher',
            llmModelIdentifier: 'auto-model-z',
            autoExecuteTools: false,
            skillAccessMode: 'PRELOADED_ONLY',
            llmConfig: { thinking_level: 4 },
            workspaceRootPath: '/tmp/workspace',
          },
          {
            memberRouteKey: 'reviewer',
            memberName: 'Reviewer',
            memberRunId: 'member-3',
            runtimeKind: 'codex_app_server',
            platformAgentRunId: null,
            agentDefinitionId: 'agent-reviewer',
            llmModelIdentifier: 'codex-model-a',
            autoExecuteTools: false,
            skillAccessMode: 'PRELOADED_ONLY',
            llmConfig: { reasoning_effort: 'high' },
            workspaceRootPath: '/tmp/workspace',
          },
          {
            memberRouteKey: 'implementer',
            memberName: 'Implementer',
            memberRunId: 'member-4',
            runtimeKind: 'codex_app_server',
            platformAgentRunId: null,
            agentDefinitionId: 'agent-implementer',
            llmModelIdentifier: 'codex-model-a',
            autoExecuteTools: false,
            skillAccessMode: 'PRELOADED_ONLY',
            llmConfig: { reasoning_effort: 'high' },
            workspaceRootPath: '/tmp/workspace',
          },
          {
            memberRouteKey: 'critic',
            memberName: 'Critic',
            memberRunId: 'member-5',
            runtimeKind: 'codex_app_server',
            platformAgentRunId: null,
            agentDefinitionId: 'agent-critic',
            llmModelIdentifier: 'codex-model-b',
            autoExecuteTools: false,
            skillAccessMode: 'PRELOADED_ONLY',
            llmConfig: { reasoning_effort: 'medium' },
            workspaceRootPath: '/tmp/workspace',
          },
        ],
      },
      firstWorkspaceId: 'ws-3',
      isLocked: false,
    })

    expect(config.runtimeKind).toBe('codex_app_server')
    expect(config.llmModelIdentifier).toBe('codex-model-a')
    expect(config.llmConfig).toEqual({ reasoning_effort: 'high' })
    expect(config.memberOverrides).toEqual({
      Writer: {
        agentDefinitionId: 'agent-writer',
        runtimeKind: 'autobyteus',
        llmModelIdentifier: 'auto-model-z',
        llmConfig: { thinking_level: 4 },
      },
      Researcher: {
        agentDefinitionId: 'agent-researcher',
        runtimeKind: 'autobyteus',
        llmModelIdentifier: 'auto-model-z',
        llmConfig: { thinking_level: 4 },
      },
      Critic: {
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
