import { describe, expect, it } from 'vitest';
import {
  hasExplicitMemberLlmConfigOverride,
  hasMeaningfulMemberOverride,
  modelConfigsEqual,
  reconstructTeamRunConfigFromMetadata,
  resolveEffectiveMemberLlmConfig,
} from '~/utils/teamRunConfigUtils';

describe('teamRunConfigUtils', () => {
  it('treats only property presence as an explicit member llmConfig override', () => {
    expect(hasExplicitMemberLlmConfigOverride(undefined)).toBe(false);
    expect(hasExplicitMemberLlmConfigOverride({ agentDefinitionId: 'agent-a' })).toBe(false);
    expect(
      hasExplicitMemberLlmConfigOverride({
        agentDefinitionId: 'agent-a',
        llmConfig: null,
      }),
    ).toBe(true);
  });

  it('resolves effective member config from explicit override or global fallback', () => {
    expect(
      resolveEffectiveMemberLlmConfig(
        { agentDefinitionId: 'agent-a' },
        { reasoning_effort: 'high' },
      ),
    ).toEqual({ reasoning_effort: 'high' });

    expect(
      resolveEffectiveMemberLlmConfig(
        { agentDefinitionId: 'agent-a', llmConfig: null },
        { reasoning_effort: 'high' },
      ),
    ).toBeNull();
  });

  it('compares model configs independent of key order', () => {
    expect(
      modelConfigsEqual(
        { reasoning_effort: 'high', include_plan_tool: true },
        { include_plan_tool: true, reasoning_effort: 'high' },
      ),
    ).toBe(true);
  });

  it('treats explicit null llmConfig as a meaningful member override', () => {
    expect(
      hasMeaningfulMemberOverride({
        agentDefinitionId: 'agent-a',
        llmConfig: null,
      }),
    ).toBe(true);
  });

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
    });

    expect(config.runtimeKind).toBe('codex_app_server');
    expect(config.llmModelIdentifier).toBe('gpt-5.4');
    expect(config.llmConfig).toEqual({ reasoning_effort: 'high' });
    expect(config.autoExecuteTools).toBe(true);
    expect(config.skillAccessMode).toBe('GLOBAL_DISCOVERY');
    expect(config.memberOverrides).toEqual({
      Critic: {
        agentDefinitionId: 'agent-c',
        autoExecuteTools: false,
        llmConfig: null,
      },
    });
  });
});
