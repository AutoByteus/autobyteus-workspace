import { describe, expect, it } from 'vitest'
import {
  buildEditableAgentRunSeed,
  buildEditableTeamRunSeed,
  buildEditableCatalogTeamRunSeed,
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
      llmModelIdentifier: 'gpt-5.4',
      runtimeKind: 'codex_app_server',
      workspaceId: 'ws-1',
      workspaceMetadata: null,
      autoExecuteTools: false,
      skillAccessMode: 'PRELOADED_ONLY',
      isLocked: true,
      llmConfig: {
        reasoning_effort: 'high',
        metadata: {
          allowed: ['high'],
        },
      },
      memberOverrides: {
        Reviewer: {
          agentDefinitionId: 'agent-reviewer',
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
    ;((seed.llmConfig?.metadata as Record<string, unknown>).allowed as string[]).push('mutated')
    ;((seed.memberOverrides.Reviewer.llmConfig?.nested as Record<string, unknown>).values as string[]).push('mutated')

    expect(seed.isLocked).toBe(false)
    expect(source.isLocked).toBe(true)
    expect((source.llmConfig?.metadata as Record<string, unknown>).allowed).toEqual(['high'])
    expect(
      (source.memberOverrides.Reviewer.llmConfig?.nested as Record<string, unknown>).values,
    ).toEqual(['medium'])
  })

  it('canonicalizes editable team seeds to catalog definitions and prunes runtime-only member overrides', () => {
    const source: TeamRunConfig = {
      teamDefinitionId: 'task-team-run-1',
      teamDefinitionName: 'task trail',
      llmModelIdentifier: 'gpt-5.4',
      runtimeKind: 'codex_app_server',
      workspaceId: 'ws-1',
      workspaceMetadata: null,
      autoExecuteTools: true,
      skillAccessMode: 'PRELOADED_ONLY',
      isLocked: true,
      llmConfig: null,
      memberOverrides: {
        homework_teacher: {
          agentDefinitionId: 'teacher-agent-def',
          llmModelIdentifier: 'gpt-5.3-codex',
        },
        'task-team-run-1/homework_teacher': {
          agentDefinitionId: 'task-agent-run-1',
          llmModelIdentifier: 'runtime-task-model',
        },
      },
    }
    const taskTrailDefinition = {
      id: 'catalog-task-trail-team',
      name: 'task trail',
      coordinatorMemberName: 'homework_teacher',
      nodes: [
        { memberName: 'homework_student', refType: 'AGENT', ref: 'student-agent-def' },
        { memberName: 'homework_teacher', refType: 'AGENT', ref: 'teacher-agent-def' },
      ],
    } as any

    const seed = buildEditableCatalogTeamRunSeed(source, {
      getTeamDefinitionById: (id) => id === taskTrailDefinition.id ? taskTrailDefinition : null,
      getTeamDefinitionByName: (name) => name === taskTrailDefinition.name ? taskTrailDefinition : null,
    })

    expect(seed).toEqual(expect.objectContaining({
      teamDefinitionId: 'catalog-task-trail-team',
      teamDefinitionName: 'task trail',
      isLocked: false,
      memberOverrides: {
        homework_teacher: expect.objectContaining({
          agentDefinitionId: 'teacher-agent-def',
          llmModelIdentifier: 'gpt-5.3-codex',
        }),
      },
    }))
    expect(seed?.memberOverrides).not.toHaveProperty('task-team-run-1/homework_teacher')
  })

  it('returns null when a team run seed cannot be resolved to a catalog definition', () => {
    const source: TeamRunConfig = {
      teamDefinitionId: 'task-team-run-1',
      teamDefinitionName: 'missing team',
      llmModelIdentifier: 'gpt-5.4',
      runtimeKind: 'codex_app_server',
      workspaceId: 'ws-1',
      workspaceMetadata: null,
      autoExecuteTools: false,
      skillAccessMode: 'PRELOADED_ONLY',
      isLocked: true,
      llmConfig: null,
      memberOverrides: {},
    }

    expect(buildEditableCatalogTeamRunSeed(source, {
      getTeamDefinitionById: () => null,
      getTeamDefinitionByName: () => null,
    })).toBeNull()
  })

})
