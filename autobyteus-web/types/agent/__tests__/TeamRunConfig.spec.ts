import { describe, it, expect } from 'vitest'
import { buildTeamRunTemplate } from '~/composables/useDefinitionLaunchDefaults'
import type { AgentTeamDefinition } from '~/stores/agentTeamDefinitionStore'

describe('TeamRunConfig helpers', () => {
  const mockTeamDef: AgentTeamDefinition = {
    id: 'team-def-1',
    name: 'Research Team',
    description: 'A team for research',
    instructions: 'Coordinate the research workflow.',
    coordinatorMemberName: 'Coordinator',
    nodes: [],
    defaultLaunchConfig: {
      runtimeKind: 'codex',
      llmModelIdentifier: 'gpt-5.4',
      llmConfig: {
        reasoning_effort: 'high',
      },
    },
  } as AgentTeamDefinition

  it('buildTeamRunTemplate initializes with team defaults', () => {
    const config = buildTeamRunTemplate(mockTeamDef)

    expect(config.teamDefinitionId).toBe('team-def-1')
    expect(config.teamDefinitionName).toBe('Research Team')
    expect(config.rootConfig.runtimeKind).toBe('codex')
    expect(config.rootConfig.workspace).toEqual({ workspaceId: null, workspaceMetadata: null })
    expect(config.rootConfig.llmModelIdentifier).toBe('gpt-5.4')
    expect(config.rootConfig.llmConfig).toEqual({
      reasoning_effort: 'high',
    })
    expect(config.rootConfig.autoExecuteTools).toBe(false)
    expect(config.rootConfig.skillAccessMode).toBe('PRELOADED_ONLY')
    expect(config.teamOverrides).toEqual({})
    expect(config.agentOverrides).toEqual({})
    expect(config.isLocked).toBe(false)
  })
})
