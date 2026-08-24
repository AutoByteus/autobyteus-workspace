import { describe, expect, it } from 'vitest'
import {
  buildEditableAgentRunSeed,
  buildEditableTeamRunSeed,
} from '../useDefinitionLaunchDefaults'
import type { AgentRunConfig } from '~/types/agent/AgentRunConfig'
import type { TeamRunConfig } from '~/types/agent/TeamRunConfig'

describe('useDefinitionLaunchDefaults editable seeds', () => {
  it('deep-clones agent llmConfig and unlocks the editable seed', () => {
    const source: AgentRunConfig = {
      agentDefinitionId: 'agent-1',
      agentDefinitionName: 'Agent One',
      agentAvatarUrl: null,
      llmModelIdentifier: 'gpt-5.4',
      runtimeKind: 'codex_app_server',
      workspaceId: 'ws-1',
      workspaceMetadata: null,
      autoExecuteTools: false,
      skillAccessMode: 'PRELOADED_ONLY',
      isLocked: true,
      llmConfig: {
        reasoning_effort: 'xhigh',
        nested: {
          levels: ['low', 'xhigh'],
        },
      },
    }

    const seed = buildEditableAgentRunSeed(source)
    ;((seed.llmConfig?.nested as Record<string, unknown>).levels as string[]).push('mutated')

    expect(seed.isLocked).toBe(false)
    expect(source.isLocked).toBe(true)
    expect((source.llmConfig?.nested as Record<string, unknown>).levels).toEqual(['low', 'xhigh'])
  })

  it('deep-clones team global and member override llmConfig values', () => {
    const source: TeamRunConfig = {
      teamDefinitionId: 'team-1',
      teamDefinitionName: 'Team One',
      rootConfig: {
        llmModelIdentifier: 'gpt-5.4',
        runtimeKind: 'codex_app_server',
        workspace: { workspaceId: 'ws-1', workspaceMetadata: null },
        autoExecuteTools: false,
        skillAccessMode: 'PRELOADED_ONLY',
        llmConfig: {
          reasoning_effort: 'high',
          metadata: { allowed: ['high'] },
        },
      },
      isLocked: true,
      teamOverrides: {
        '/Reviewers': { workspace: { workspaceId: 'team-ws', workspaceMetadata: null } },
      },
      agentOverrides: {
        '/Reviewers/Reviewer': {
          llmModelIdentifier: 'gpt-5.3-codex',
          llmConfig: {
            reasoning_effort: 'medium',
            nested: {
              values: ['medium'],
            },
          },
        },
      },
    }

    const seed = buildEditableTeamRunSeed(source)
    ;((seed.rootConfig.llmConfig?.metadata as Record<string, unknown>).allowed as string[]).push('mutated')
    ;((seed.agentOverrides['/Reviewers/Reviewer'].llmConfig?.nested as Record<string, unknown>).values as string[]).push('mutated')

    expect(seed.isLocked).toBe(false)
    expect(source.isLocked).toBe(true)
    expect((source.rootConfig.llmConfig?.metadata as Record<string, unknown>).allowed).toEqual(['high'])
    expect(
      (source.agentOverrides['/Reviewers/Reviewer'].llmConfig?.nested as Record<string, unknown>).values,
    ).toEqual(['medium'])
    expect(seed.rootConfig.workspace).not.toBe(source.rootConfig.workspace)
    expect(seed.teamOverrides['/Reviewers'].workspace).not.toBe(source.teamOverrides['/Reviewers'].workspace)
  })
})
