import { describe, expect, it } from 'vitest'
import { buildTestTeamContext, testAgentNode, testSubTeamNode } from '~/test-support/currentTeamTestFixtures'
import { projectStoredTeamRunFormModel } from '~/services/teamExecution/storedTeamRunFormModel'

const storedView = () => buildTestTeamContext({
  teamRunId: 'stored-root-run',
  teamDefinitionId: 'stored-root-definition',
  teamDefinitionName: 'Stored Mixed Team',
  coordinatorAddress: '/coordinator',
  rootChildren: [
    testAgentNode('/coordinator', {
      runtimeKind: 'removed-runtime',
      llmModelIdentifier: 'removed-root-model',
      llmConfig: { reasoning_effort: 'high' },
      autoExecuteTools: false,
      skillAccessMode: 'PRELOADED_ONLY',
      workspaceRootPath: '/history/root',
    }),
    testSubTeamNode('/Research', [
      testAgentNode('/Research/researcher', {
        runtimeKind: 'claude_agent_sdk',
        llmModelIdentifier: 'removed-agent-model',
        llmConfig: { temperature: 0.2, nested: { enabled: true } },
        autoExecuteTools: true,
        skillAccessMode: 'NONE',
        workspaceRootPath: '/history/researcher',
      }),
      testAgentNode('/Research/reviewer', {
        runtimeKind: 'claude_agent_sdk',
        llmModelIdentifier: 'claude-sonnet',
        workspaceRootPath: '/history/research',
      }),
    ], {
      teamDefinitionId: 'research-definition',
      displayName: 'Research',
      defaultLaunchConfiguration: {
        runtime_kind: 'claude_agent_sdk',
        llm_model_identifier: 'claude-sonnet',
        llm_config: null,
        auto_execute_tools: true,
        skill_access_mode: 'NONE',
        workspace_root_path: '/history/research',
      },
    }),
    testAgentNode('/writer', {
      llmModelIdentifier: 'writer-model',
      workspaceRootPath: '/history/root',
    }),
  ],
}).view.getConfigurationView()

describe('projectStoredTeamRunFormModel', () => {
  it('preserves the stored mixed sibling order and exact complete values without editable intent', () => {
    const view = storedView()
    expect(view.source).toBe('STORED_SNAPSHOT')
    const model = projectStoredTeamRunFormModel(view)

    expect(model.mode).toBe('stored')
    expect(model.definitionLabel).toBe('Stored Mixed Team')
    expect(model.members.map((member) => [member.kind, member.address])).toEqual([
      ['agent', '/coordinator'],
      ['agent_team', '/Research'],
      ['agent', '/writer'],
    ])
    const research = model.members[1]
    expect(research.kind).toBe('agent_team')
    if (research.kind !== 'agent_team') throw new Error('Expected stored Research Team.')
    expect(research.children.map((member) => member.address)).toEqual([
      '/Research/researcher',
      '/Research/reviewer',
    ])
    const researcher = research.children[0]
    expect(researcher.kind).toBe('agent')
    if (researcher.kind !== 'agent') throw new Error('Expected stored researcher Agent.')
    expect(researcher.effectiveConfig).toEqual(expect.objectContaining({
      runtimeKind: 'claude_agent_sdk',
      llmModelIdentifier: 'removed-agent-model',
      llmConfig: { temperature: 0.2, nested: { enabled: true } },
      autoExecuteTools: true,
      skillAccessMode: 'NONE',
      workspaceRootPath: '/history/researcher',
    }))
    expect(researcher.storedWorkspace).toEqual({
      workspaceId: null,
      displayName: '/history/researcher',
      rootPath: '/history/researcher',
      availability: 'historical-only',
    })
    expect(model).not.toHaveProperty('config')
    expect(model).not.toHaveProperty('commands')
    expect(model).not.toHaveProperty('workspaceAuthoring')
  })

  it('derives stored state from stored parent snapshots and returns a deeply immutable form model', () => {
    const model = projectStoredTeamRunFormModel(storedView())
    const research = model.members[1]
    expect(research.kind).toBe('agent_team')
    if (research.kind !== 'agent_team') throw new Error('Expected stored Research Team.')
    expect(research.scope.isCustomized).toBe(true)
    expect(research.scope).not.toHaveProperty('override')
    expect(research.scope).not.toHaveProperty('workspaceSelection')
    expect(research.scope).not.toHaveProperty('workspaceOperation')
    expect(research.scope).not.toHaveProperty('runtimeCatalogState')
    expect(research.scope.storedWorkspace).toEqual({
      workspaceId: null,
      displayName: '/history/research',
      rootPath: '/history/research',
      availability: 'historical-only',
    })
    expect(Object.isFrozen(model)).toBe(true)
    expect(Object.isFrozen(model.members)).toBe(true)
    expect(Object.isFrozen(research.children)).toBe(true)
    expect(Object.isFrozen(research.children[0]?.effectiveConfig)).toBe(true)
  })
})
