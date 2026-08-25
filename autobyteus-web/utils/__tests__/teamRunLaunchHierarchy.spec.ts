import { describe, expect, it } from 'vitest'
import type { TeamRunConfig } from '~/types/agent/TeamRunConfig'
import type { TeamDefinitionMemberNode } from '~/utils/teamDefinitionMembers'
import {
  indexTeamLaunchTopology,
  projectTeamRunLaunchRecords,
  reconcileTeamRunConfigTopology,
  resolveTeamRunConfiguration,
} from '~/utils/teamRunLaunchHierarchy'

const workspace = (id: string, path: string) => ({
  workspaceId: id,
  workspaceMetadata: {
    workspaceId: id,
    workspaceRootPath: path,
    displayName: id,
    kind: 'filesystem' as const,
  },
})

const tree: readonly TeamDefinitionMemberNode[] = [
  {
    kind: 'agent',
    address: '/root_agent',
    displayName: 'root_agent',
    agentDefinitionId: 'root-agent-def',
  },
  {
    kind: 'agent_team',
    address: '/Research',
    displayName: 'Research',
    teamDefinitionId: 'research-def',
    coordinatorAddress: '/Research/lead',
    children: [
      {
        kind: 'agent',
        address: '/Research/lead',
        displayName: 'lead',
        agentDefinitionId: 'lead-def',
      },
      {
        kind: 'agent_team',
        address: '/Research/Review',
        displayName: 'Review',
        teamDefinitionId: 'review-def',
        coordinatorAddress: '/Research/Review/reviewer',
        children: [
          {
            kind: 'agent',
            address: '/Research/Review/reviewer',
            displayName: 'reviewer',
            agentDefinitionId: 'reviewer-def',
          },
        ],
      },
    ],
  },
  {
    kind: 'agent_team',
    address: '/Delivery',
    displayName: 'Delivery',
    teamDefinitionId: 'delivery-def',
    coordinatorAddress: '/Delivery/publisher',
    children: [
      {
        kind: 'agent',
        address: '/Delivery/publisher',
        displayName: 'publisher',
        agentDefinitionId: 'publisher-def',
      },
    ],
  },
]

const config = (): TeamRunConfig => ({
  teamDefinitionId: 'root-def',
  teamDefinitionName: 'Root Team',
  rootConfig: {
    runtimeKind: 'codex_app_server',
    workspace: workspace('root-ws', '/workspace/root'),
    llmModelIdentifier: 'gpt-5.4',
    llmConfig: { reasoning_effort: 'medium' },
    autoExecuteTools: false,
    skillAccessMode: 'PRELOADED_ONLY',
  },
  teamOverrides: {
    '/Research': {
      runtimeKind: 'claude_agent_sdk',
      workspace: workspace('research-ws', '/workspace/research'),
      llmModelIdentifier: 'claude-sonnet',
      llmConfig: null,
      autoExecuteTools: true,
    },
    '/Research/Review': {
      llmModelIdentifier: 'claude-opus',
      llmConfig: { thinking: true },
    },
  },
  agentOverrides: {
    '/Research/Review/reviewer': {
      runtimeKind: 'autobyteus',
      llmModelIdentifier: 'gpt-5.6-luna',
      llmConfig: null,
      autoExecuteTools: false,
    },
  },
  isLocked: false,
})

describe('teamRunLaunchHierarchy', () => {
  it('indexes exact Team and Agent subjects including the root Team', () => {
    const index = indexTeamLaunchTopology(tree)

    expect([...index.teams]).toEqual(['/', '/Research', '/Research/Review', '/Delivery'])
    expect([...index.agents]).toEqual([
      '/root_agent',
      '/Research/lead',
      '/Research/Review/reviewer',
      '/Delivery/publisher',
    ])
  })

  it('resolves nearest-Team and exact-Agent precedence without activating embedded definition defaults', () => {
    const view = resolveTeamRunConfiguration(config(), tree)

    expect(view.root.effectiveConfig).toEqual(expect.objectContaining({
      runtimeKind: 'codex_app_server',
      workspaceRootPath: '/workspace/root',
      llmModelIdentifier: 'gpt-5.4',
      llmConfig: { reasoning_effort: 'medium' },
      skillAccessMode: 'PRELOADED_ONLY',
    }))
    expect(view.teamsByAddress['/Research']).toEqual(expect.objectContaining({
      parentAddress: '/',
      depth: 1,
      isCustomized: true,
      effectiveConfig: expect.objectContaining({
        runtimeKind: 'claude_agent_sdk',
        workspaceRootPath: '/workspace/research',
        llmConfig: null,
      }),
    }))
    expect(view.teamsByAddress['/Research/Review'].effectiveConfig).toEqual(expect.objectContaining({
      runtimeKind: 'claude_agent_sdk',
      workspaceRootPath: '/workspace/research',
      llmModelIdentifier: 'claude-opus',
      llmConfig: { thinking: true },
      autoExecuteTools: true,
    }))
    expect(view.agentsByAddress['/Research/Review/reviewer'].effectiveConfig).toEqual(expect.objectContaining({
      runtimeKind: 'autobyteus',
      workspaceRootPath: '/workspace/research',
      llmModelIdentifier: 'gpt-5.6-luna',
      llmConfig: null,
      autoExecuteTools: false,
      skillAccessMode: 'PRELOADED_ONLY',
    }))
    expect(view.agentsByAddress['/Delivery/publisher'].effectiveConfig).toEqual(
      expect.objectContaining({ runtimeKind: 'codex_app_server', workspaceRootPath: '/workspace/root' }),
    )
  })

  it('clears inherited model config when a runtime or model is explicitly changed without a config value', () => {
    const candidate = config()
    candidate.teamOverrides['/Delivery'] = { runtimeKind: 'autobyteus' }
    candidate.agentOverrides['/Research/lead'] = { llmModelIdentifier: 'claude-haiku' }

    const view = resolveTeamRunConfiguration(candidate, tree)

    expect(view.teamsByAddress['/Delivery'].effectiveConfig.llmConfig).toBeNull()
    expect(view.agentsByAddress['/Research/lead'].effectiveConfig.llmConfig).toBeNull()
  })

  it('prunes noncanonical, stale, and kind-mismatched intent in sorted address order', () => {
    const candidate = config()
    candidate.teamOverrides['/Research/lead'] = { autoExecuteTools: false }
    candidate.teamOverrides['/Missing'] = { autoExecuteTools: false }
    candidate.agentOverrides['/Research'] = { autoExecuteTools: false }
    candidate.agentOverrides['Research/lead'] = { autoExecuteTools: false }

    const result = reconcileTeamRunConfigTopology(candidate, tree)

    expect(result.repairedAddresses).toEqual([
      '/Missing',
      '/Research',
      '/Research/lead',
      'Research/lead',
    ])
    expect(result.config.teamOverrides['/Research']).toEqual(candidate.teamOverrides['/Research'])
    expect(result.config.agentOverrides['/Research/Review/reviewer']).toEqual(
      candidate.agentOverrides['/Research/Review/reviewer'],
    )
  })

  it('projects one complete Team record per scope and one complete Agent record per leaf', () => {
    const result = projectTeamRunLaunchRecords(config(), tree)

    expect(result.teamConfigs.map((entry) => entry.teamAddress)).toEqual([
      '/',
      '/Research',
      '/Research/Review',
      '/Delivery',
    ])
    expect(result.memberConfigs.map((entry) => entry.memberAddress)).toEqual([
      '/root_agent',
      '/Research/lead',
      '/Research/Review/reviewer',
      '/Delivery/publisher',
    ])
    expect(result.teamConfigs.find((entry) => entry.teamAddress === '/Research/Review')).toEqual({
      teamAddress: '/Research/Review',
      runtimeKind: 'claude_agent_sdk',
      llmModelIdentifier: 'claude-opus',
      llmConfig: { thinking: true },
      autoExecuteTools: true,
      skillAccessMode: 'PRELOADED_ONLY',
      workspaceRootPath: '/workspace/research',
    })
    expect(result.memberConfigs.find((entry) => entry.memberAddress === '/Research/Review/reviewer')).toEqual({
      memberAddress: '/Research/Review/reviewer',
      agentDefinitionId: 'reviewer-def',
      runtimeKind: 'autobyteus',
      llmModelIdentifier: 'gpt-5.6-luna',
      llmConfig: null,
      autoExecuteTools: false,
      skillAccessMode: 'PRELOADED_ONLY',
      workspaceRootPath: '/workspace/research',
    })
  })
})
