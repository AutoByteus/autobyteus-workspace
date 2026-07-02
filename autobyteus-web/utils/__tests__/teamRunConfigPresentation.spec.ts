import { describe, expect, it } from 'vitest'
import type { AgentTeamMemberNode } from '~/types/agent/AgentTeamContext'
import type { TeamRunConfig } from '~/types/agent/TeamRunConfig'
import {
  buildModelConfigEntries,
  buildTeamMemberOverridesPresentation,
  buildTeamRunDefaultsPresentation,
  buildTeamRunLaunchSummaryPresentation,
} from '~/utils/teamRunConfigPresentation'

const baseConfig: TeamRunConfig = {
  teamDefinitionId: 'team-1',
  teamDefinitionName: 'Test Team',
  runtimeKind: 'autobyteus',
  workspaceId: null,
  workspaceMetadata: null,
  llmModelIdentifier: 'gpt-5.4',
  llmConfig: null,
  autoExecuteTools: false,
  skillAccessMode: 'PRELOADED_ONLY',
  memberOverrides: {},
  isLocked: false,
}

const leafMember = (memberRouteKey: string, memberPath: string[]): AgentTeamMemberNode => ({
  memberKind: 'agent',
  memberName: memberPath[memberPath.length - 1] ?? memberRouteKey,
  displayName: memberPath[memberPath.length - 1] ?? memberRouteKey,
  memberPath,
  memberRouteKey,
  memberRunId: null,
  agentDefinitionId: `agent-${memberRouteKey}`,
})

describe('teamRunConfigPresentation', () => {
  it('keeps run defaults marked as team defaults when normalized llmConfig matches', () => {
    const summary = buildTeamRunDefaultsPresentation({
      config: {
        ...baseConfig,
        llmConfig: {
          nested: { beta: 2, alpha: 1 },
          reasoning_effort: 'high',
        },
      },
      defaultLaunchConfig: {
        runtimeKind: 'autobyteus',
        llmModelIdentifier: 'gpt-5.4',
        llmConfig: {
          reasoning_effort: 'high',
          nested: { alpha: 1, beta: 2 },
        },
      },
    })

    expect(summary.state).toBe('team-defaults')
    expect(summary.modelConfigChangedFromDefinition).toBe(false)
    expect(summary.modelConfigEntries.map((entry) => entry.key)).toEqual([
      'nested',
      'reasoning_effort',
    ])
  })

  it('marks run defaults changed when only llmConfig differs', () => {
    const summary = buildTeamRunDefaultsPresentation({
      config: {
        ...baseConfig,
        llmConfig: { reasoning_effort: 'high' },
      },
      defaultLaunchConfig: {
        runtimeKind: 'autobyteus',
        llmModelIdentifier: 'gpt-5.4',
        llmConfig: null,
      },
    })

    expect(summary.state).toBe('changed')
    expect(summary.runtimeChangedFromDefinition).toBe(false)
    expect(summary.modelChangedFromDefinition).toBe(false)
    expect(summary.modelConfigChangedFromDefinition).toBe(true)
    expect(summary.modelConfigEntries).toMatchObject([
      { key: 'reasoning_effort', value: 'high', title: 'high', truncated: false },
    ])
  })

  it('returns empty model config entries for missing config', () => {
    const summary = buildTeamRunDefaultsPresentation({
      config: {
        ...baseConfig,
        llmConfig: null,
      },
      defaultLaunchConfig: {
        runtimeKind: 'autobyteus',
        llmModelIdentifier: 'gpt-5.4',
        llmConfig: null,
      },
    })

    expect(summary.hasModelConfig).toBe(false)
    expect(summary.modelConfigEntries).toEqual([])
  })

  it('formats model config entries deterministically with compact truncation', () => {
    const entries = buildModelConfigEntries({
      zeta: true,
      alpha: ['first', { nested: 'value' }],
      long_value: 'abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnop',
    })

    expect(entries.map((entry) => entry.key)).toEqual(['alpha', 'long_value', 'zeta'])
    expect(entries[0]).toMatchObject({
      key: 'alpha',
      value: '[\"first\",{\"nested\":\"value\"}]',
      title: '[\"first\",{\"nested\":\"value\"}]',
      truncated: false,
    })
    expect(entries[1].title).toBe('abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnop')
    expect(entries[1].value).toBe('abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijk…')
    expect(entries[1].truncated).toBe(true)
    expect(entries[2]).toMatchObject({
      key: 'zeta',
      value: 'true',
      title: 'true',
      truncated: false,
    })
  })

  it('marks missing model before default-change state', () => {
    const summary = buildTeamRunDefaultsPresentation({
      config: {
        ...baseConfig,
        llmModelIdentifier: '',
        llmConfig: { reasoning_effort: 'high' },
      },
      defaultLaunchConfig: {
        runtimeKind: 'autobyteus',
        llmModelIdentifier: 'gpt-5.4',
        llmConfig: null,
      },
    })

    expect(summary.state).toBe('missing-model')
  })

  it('summarizes meaningful member override names and hidden count', () => {
    const summary = buildTeamMemberOverridesPresentation({
      leafMembers: [
        leafMember('Member A', ['Member A']),
        leafMember('BuildSquad/reviewer', ['BuildSquad', 'reviewer']),
        leafMember('BuildSquad/qa', ['BuildSquad', 'qa']),
      ],
      memberOverrides: {
        'Member A': { agentDefinitionId: 'agent-a', autoExecuteTools: true },
        'BuildSquad/reviewer': { agentDefinitionId: 'agent-review', runtimeKind: 'codex_app_server' },
        'BuildSquad/qa': { agentDefinitionId: 'agent-qa' },
        'stale/unknown': { agentDefinitionId: 'agent-stale', llmModelIdentifier: 'gpt-5.5' },
      },
      maxVisibleNames: 2,
    })

    expect(summary.totalMembers).toBe(3)
    expect(summary.activeOverrideCount).toBe(3)
    expect(summary.activeOverrideNames).toHaveLength(2)
    expect(summary.activeOverrideNames).toContain('BuildSquad / reviewer')
    expect(summary.hiddenOverrideCount).toBe(1)
  })

  it('builds a footer launch summary from team config and nested leaf member count', () => {
    const summary = buildTeamRunLaunchSummaryPresentation({
      config: {
        ...baseConfig,
        runtimeKind: 'codex_app_server',
        llmModelIdentifier: 'gpt-5.4',
        autoExecuteTools: true,
      },
      leafMembers: [
        leafMember('program_manager', ['program_manager']),
        leafMember('BuildSquad/review_lead', ['BuildSquad', 'review_lead']),
        leafMember('BuildSquad/qa_specialist', ['BuildSquad', 'qa_specialist']),
      ],
      workspace: { mode: 'existing', name: 'Temp Workspace' },
    })

    expect(summary).toEqual({
      memberCount: 3,
      runtimeLabel: 'Codex App Server',
      modelIdentifier: 'gpt-5.4',
      autoApproveEnabled: true,
      workspace: { mode: 'existing', name: 'Temp Workspace' },
      memberOverrideTag: null,
    })
  })

  it('builds localization-safe override tag facts and route keys for one or two overrides', () => {
    const summary = buildTeamRunLaunchSummaryPresentation({
      config: {
        ...baseConfig,
        memberOverrides: {
          program_manager: { agentDefinitionId: 'agent-program_manager', autoExecuteTools: true },
          'BuildSquad/review_lead': { agentDefinitionId: 'agent-review_lead', runtimeKind: 'claude_agent_sdk' },
        },
      },
      leafMembers: [
        leafMember('program_manager', ['program_manager']),
        leafMember('BuildSquad/review_lead', ['BuildSquad', 'review_lead']),
      ],
      workspace: { mode: 'new', path: '/tmp/project' },
    })

    expect(summary.memberOverrideTag).toEqual({
      count: 2,
      routeKeys: ['BuildSquad/review_lead', 'program_manager'],
      visibleNames: ['BuildSquad / review_lead', 'program_manager'],
    })
    expect(summary.memberOverrideTag).not.toHaveProperty('label')
  })

  it('limits override tag visible names for more than two overrides', () => {
    const summary = buildTeamRunLaunchSummaryPresentation({
      config: {
        ...baseConfig,
        memberOverrides: {
          program_manager: { agentDefinitionId: 'agent-program_manager', autoExecuteTools: true },
          'BuildSquad/review_lead': { agentDefinitionId: 'agent-review_lead', runtimeKind: 'claude_agent_sdk' },
          'BuildSquad/qa_specialist': { agentDefinitionId: 'agent-qa_specialist', llmModelIdentifier: 'qa-model' },
        },
      },
      leafMembers: [
        leafMember('program_manager', ['program_manager']),
        leafMember('BuildSquad/review_lead', ['BuildSquad', 'review_lead']),
        leafMember('BuildSquad/qa_specialist', ['BuildSquad', 'qa_specialist']),
      ],
    })

    expect(summary.memberOverrideTag?.count).toBe(3)
    expect(summary.memberOverrideTag?.visibleNames).toEqual([
      'BuildSquad / qa_specialist',
      'BuildSquad / review_lead',
    ])
    expect(summary.memberOverrideTag?.routeKeys).toEqual([
      'BuildSquad/qa_specialist',
      'BuildSquad/review_lead',
      'program_manager',
    ])
    expect(summary.memberOverrideTag).not.toHaveProperty('label')
  })
})
