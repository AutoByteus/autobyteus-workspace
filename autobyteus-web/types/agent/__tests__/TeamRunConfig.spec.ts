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
    expect(config.runtimeKind).toBe('codex')
    expect(config.workspaceId).toBeNull()
    expect(config.llmModelIdentifier).toBe('gpt-5.4')
    expect(config.llmConfig).toEqual({
      reasoning_effort: 'high',
    })
    expect(config.autoExecuteTools).toBe(false)
    expect(config.skillAccessMode).toBe('PRELOADED_ONLY')
    expect(config.memberOverrides).toEqual({})
    expect(config.isLocked).toBe(false)
  })
})
