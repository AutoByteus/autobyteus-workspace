import { describe, expect, it } from 'vitest'
import {
  buildAgentRunTemplate,
  buildTeamRunTemplate,
  buildEditableAgentRunSeed,
  buildEditableTeamRunSeed,
} from '../useDefinitionLaunchDefaults'
import type { AgentRunConfig } from '~/types/agent/AgentRunConfig'
import { resolveTeamRunConfiguration, projectTeamRunLaunchRecords } from '~/utils/teamRunLaunchHierarchy'
import type { TeamDefinitionMemberNode } from '~/utils/teamDefinitionMembers'
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

    expect(seed.autoExecuteTools).toBe(false)
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

    expect(seed.rootConfig.autoExecuteTools).toBe(false)
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

// Round-trip through the actual effective resolver and Create records, not only sparse shape.
describe('canonical view seed parameter fidelity', () => {
  const members: readonly TeamDefinitionMemberNode[] = [{ kind: 'agent', address: '/lead', displayName: 'Lead', agentDefinitionId: 'agent' }]
  const source = (llmConfig: Record<string, unknown> | null): TeamRunConfig => ({
    teamDefinitionId: 'team', teamDefinitionName: 'Team', isLocked: false,
    rootConfig: { runtimeKind: 'autobyteus', llmModelIdentifier: 'root-model', llmConfig,
      workspace: { workspaceId: null, workspaceMetadata: null }, autoExecuteTools: false },
    teamOverrides: {}, agentOverrides: {},
  })
  const cases = (['model', 'runtime', 'both'] as const).flatMap(change =>
    [null, { reasoning_effort: 'low' }, { budget: 0, enabled: false }].map(parameters => ({ change, parameters })))
  it.each(cases)('preserves equal parameters $parameters with $change override', ({ change, parameters }) => {
    const config = source(parameters)
    config.agentOverrides['/lead'] = {
      ...(change !== 'runtime' ? { llmModelIdentifier: 'member-model' } : {}),
      ...(change !== 'model' ? { runtimeKind: 'codex_app_server' as const } : {}),
      llmConfig: parameters,
    }
    const canonicalView = resolveTeamRunConfiguration(config, members)
    const seed = buildEditableTeamRunSeed(canonicalView)
    expect(Object.hasOwn(seed.agentOverrides['/lead'], 'llmConfig')).toBe(true)
    expect(resolveTeamRunConfiguration(seed, members).agentsByAddress['/lead'].effectiveConfig)
      .toEqual(canonicalView.agentsByAddress['/lead'].effectiveConfig)
    expect(projectTeamRunLaunchRecords(seed, members)).toEqual(projectTeamRunLaunchRecords(config, members))
    if (seed.agentOverrides['/lead'].llmConfig) {
      seed.agentOverrides['/lead'].llmConfig!.changed = true
      expect(canonicalView.agentsByAddress['/lead'].effectiveConfig.llmConfig).toEqual(parameters)
    }
  })
  it('keeps the existing shared scope projector coherent (pure view only, not nested runtime admission)', () => {
    const config = source({ reasoning_effort: 'low' })
    const scopeNodes: readonly TeamDefinitionMemberNode[] = [{
      kind: 'agent_team', address: '/scope', displayName: 'Scope', teamDefinitionId: 'scope',
      coordinatorAddress: '/scope/lead', children: [{ kind: 'agent', address: '/scope/lead', displayName: 'Lead', agentDefinitionId: 'agent' }],
    }]
    config.teamOverrides['/scope'] = { llmModelIdentifier: 'scope-model', llmConfig: { reasoning_effort: 'low' } }
    const seed = buildEditableTeamRunSeed(resolveTeamRunConfiguration(config, scopeNodes))
    expect(seed.teamOverrides['/scope'].llmConfig).toEqual({ reasoning_effort: 'low' })
    expect(projectTeamRunLaunchRecords(seed, scopeNodes)).toEqual(projectTeamRunLaunchRecords(config, scopeNodes))
  })
  it('keeps unchanged model/runtime/equal parameters inherited and sparse', () => {
    const config = source({ budget: 0, enabled: false })
    const seed = buildEditableTeamRunSeed(resolveTeamRunConfiguration(config, members))
    expect(seed.agentOverrides).toEqual({})
    expect(projectTeamRunLaunchRecords(seed, members)).toEqual(projectTeamRunLaunchRecords(config, members))
  })
  it.each(['model', 'runtime'])('preserves deliberate %s edit behavior: omitted parameters still clear', change => {
    const config = source({ reasoning_effort: 'low' })
    config.agentOverrides['/lead'] = change === 'model' ? { llmModelIdentifier: 'member-model' } : { runtimeKind: 'codex_app_server' }
    expect(projectTeamRunLaunchRecords(config, members).memberConfigs[0].llmConfig).toBeNull()
  })
})

describe('fresh launch approval defaults', () => {
  it.each([undefined, 'autobyteus', 'codex_app_server', 'claude_agent_sdk', 'antigravity_cli', 'grok_build'])(
    'starts fresh Agent and Team templates approved for %s', (runtimeKind) => {
      const definition = { id: 'definition', name: 'Definition', defaultLaunchConfig: runtimeKind ? { runtimeKind } : null }
      const agent = buildAgentRunTemplate(definition)
      const team = buildTeamRunTemplate(definition)
      expect(agent.autoExecuteTools).toBe(true)
      expect(team.rootConfig.autoExecuteTools).toBe(true)
      expect(agent.runtimeKind).toBe(runtimeKind ?? 'autobyteus')
      expect(team.rootConfig.runtimeKind).toBe(runtimeKind ?? 'autobyteus')
      expect(team.agentOverrides).toEqual({})
      // A fresh constructor invocation does not carry an earlier launch's opt-out.
      agent.autoExecuteTools = false
      team.rootConfig.autoExecuteTools = false
      expect(buildAgentRunTemplate(definition).autoExecuteTools).toBe(true)
      expect(buildTeamRunTemplate(definition).rootConfig.autoExecuteTools).toBe(true)
    },
  )

  it('inherits fresh Team approval while retaining explicit member false in records and derived seeds', () => {
    const members: readonly TeamDefinitionMemberNode[] = [
      { kind: 'agent', address: '/lead', displayName: 'Lead', agentDefinitionId: 'lead' },
      { kind: 'agent', address: '/reviewer', displayName: 'Reviewer', agentDefinitionId: 'reviewer' },
    ]
    const config = buildTeamRunTemplate({ id: 'team', name: 'Team' })
    expect(projectTeamRunLaunchRecords(config, members).memberConfigs.map(member => member.autoExecuteTools)).toEqual([true, true])
    config.agentOverrides['/reviewer'] = { autoExecuteTools: false }
    const view = resolveTeamRunConfiguration(config, members)
    const seed = buildEditableTeamRunSeed(view)
    expect(seed.rootConfig.autoExecuteTools).toBe(true)
    expect(seed.agentOverrides['/reviewer'].autoExecuteTools).toBe(false)
    expect(projectTeamRunLaunchRecords(seed, members).memberConfigs.map(member => member.autoExecuteTools)).toEqual([true, false])
    config.rootConfig.autoExecuteTools = false
    expect(buildEditableTeamRunSeed(resolveTeamRunConfiguration(config, members)).rootConfig.autoExecuteTools).toBe(false)
  })
})
