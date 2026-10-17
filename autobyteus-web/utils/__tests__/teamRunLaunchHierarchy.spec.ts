import { describe, expect, it } from 'vitest'
import type { TeamRunConfig } from '~/types/agent/TeamRunConfig'
import type { TeamDefinitionAgentNode } from '~/utils/teamDefinitionMembers'
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

/** A flat Team definition: every member is an Agent directly under the root Team. */
const tree: readonly TeamDefinitionAgentNode[] = [
  { kind: 'agent', address: '/root_agent', displayName: 'root_agent', agentDefinitionId: 'root-agent-def' },
  { kind: 'agent', address: '/lead', displayName: 'lead', agentDefinitionId: 'lead-def' },
  { kind: 'agent', address: '/reviewer', displayName: 'reviewer', agentDefinitionId: 'reviewer-def' },
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
  },
  teamOverrides: {},
  agentOverrides: {
    '/reviewer': {
      runtimeKind: 'autobyteus',
      workspace: workspace('review-ws', '/workspace/review'),
      llmModelIdentifier: 'gpt-5.6-luna',
      llmConfig: null,
      autoExecuteTools: true,
    },
  },
  isLocked: false,
})

describe('teamRunLaunchHierarchy', () => {
  it('indexes the root Team and every Agent subject', () => {
    const index = indexTeamLaunchTopology(tree)

    expect([...index.teams]).toEqual(['/'])
    expect([...index.agents]).toEqual(['/root_agent', '/lead', '/reviewer'])
  })

  it('resolves root-Team and exact-Agent precedence without activating embedded definition defaults', () => {
    const view = resolveTeamRunConfiguration(config(), tree)

    expect(view.root.effectiveConfig).toEqual(expect.objectContaining({
      runtimeKind: 'codex_app_server',
      workspaceRootPath: '/workspace/root',
      llmModelIdentifier: 'gpt-5.4',
      llmConfig: { reasoning_effort: 'medium' },
    }))
    expect(Object.keys(view.teamsByAddress)).toEqual(['/'])
    expect(view.agentsByAddress['/reviewer']).toEqual(expect.objectContaining({
      containingTeamAddress: '/',
      effectiveConfig: expect.objectContaining({
        runtimeKind: 'autobyteus',
        workspaceRootPath: '/workspace/review',
        llmModelIdentifier: 'gpt-5.6-luna',
        llmConfig: null,
        autoExecuteTools: true,
      }),
    }))
    expect(view.agentsByAddress['/lead'].effectiveConfig).toEqual(
      expect.objectContaining({ runtimeKind: 'codex_app_server', workspaceRootPath: '/workspace/root' }),
    )
  })

  it('clears inherited model config when a runtime or model is explicitly changed without a config value', () => {
    const candidate = config()
    candidate.agentOverrides['/root_agent'] = { runtimeKind: 'autobyteus' }
    candidate.agentOverrides['/lead'] = { llmModelIdentifier: 'claude-haiku' }

    const view = resolveTeamRunConfiguration(candidate, tree)

    expect(view.agentsByAddress['/root_agent'].effectiveConfig.llmConfig).toBeNull()
    expect(view.agentsByAddress['/lead'].effectiveConfig.llmConfig).toBeNull()
  })

  it('prunes noncanonical, stale, and kind-mismatched intent in sorted address order', () => {
    const candidate = config()
    candidate.teamOverrides['/lead'] = { autoExecuteTools: false }
    candidate.teamOverrides['/Research'] = { autoExecuteTools: false }
    candidate.agentOverrides['/Missing'] = { autoExecuteTools: false }
    candidate.agentOverrides['lead'] = { autoExecuteTools: false }

    const result = reconcileTeamRunConfigTopology(candidate, tree)

    expect(result.repairedAddresses).toEqual(['/Missing', '/Research', '/lead', 'lead'])
    expect(result.config.teamOverrides).toEqual({})
    expect(result.config.agentOverrides).toEqual({ '/reviewer': candidate.agentOverrides['/reviewer'] })
  })

  it('projects one complete root Team record and one complete Agent record per member', () => {
    const result = projectTeamRunLaunchRecords(config(), tree)

    expect(result.teamConfigs).toEqual([{
      teamAddress: '/',
      runtimeKind: 'codex_app_server',
      llmModelIdentifier: 'gpt-5.4',
      llmConfig: { reasoning_effort: 'medium' },
      autoExecuteTools: false,
      workspaceRootPath: '/workspace/root',
    }])
    expect(result.memberConfigs.map((entry) => entry.memberAddress)).toEqual(['/root_agent', '/lead', '/reviewer'])
    expect(result.memberConfigs.find((entry) => entry.memberAddress === '/reviewer')).toEqual({
      memberAddress: '/reviewer',
      agentDefinitionId: 'reviewer-def',
      runtimeKind: 'autobyteus',
      llmModelIdentifier: 'gpt-5.6-luna',
      llmConfig: null,
      autoExecuteTools: true,
      workspaceRootPath: '/workspace/review',
    })
  })
})
