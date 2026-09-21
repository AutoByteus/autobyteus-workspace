import { describe, expect, it } from 'vitest'
import type { AgentOrgDefinition } from '~/stores/agentOrgDefinitionStore'
import type { AgentTeamDefinition } from '~/stores/agentTeamDefinitionStore'
import type { ResolvedTeamRunLaunchConfig } from '~/types/agent/TeamRunConfig'
import { projectEditableAgentOrgRunFormModel } from '../editableAgentOrgRunFormModel'

const rootConfig: ResolvedTeamRunLaunchConfig = {
  runtimeKind: 'autobyteus', workspaceId: 'root-workspace',
  workspaceMetadata: {
    workspaceId: 'root-workspace', workspaceRootPath: '/workspace/root',
    displayName: 'Root', kind: 'filesystem',
  },
  workspaceRootPath: '/workspace/root', llmModelIdentifier: 'gpt-root',
  llmConfig: { reasoning_effort: 'medium' }, autoExecuteTools: false,
  skillAccessMode: 'PRELOADED_ONLY',
}
const softwareTeam: AgentTeamDefinition = {
  id: 'software-team', name: 'Software Engineering', description: '', instructions: '',
  coordinatorMemberName: 'architecture_designer',
  nodes: [
    { memberName: 'architecture_designer', ref: 'architecture-agent' },
    { memberName: 'implementation_engineer', ref: 'implementation-agent' },
  ],
}
const productTeam: AgentTeamDefinition = {
  id: 'product-team', name: 'Product Design', description: '', instructions: '',
  coordinatorMemberName: 'product_designer',
  nodes: [
    { memberName: 'product_designer', ref: 'product-agent' },
    { memberName: 'prototype_engineer', ref: 'prototype-agent' },
  ],
}
const org: AgentOrgDefinition = {
  id: 'org', name: 'Delivery Org', description: '', instructions: '', revision: '1', handoffs: [],
  members: [
    { memberName: 'requirements_engineer', ref: 'requirements-agent', refType: 'AGENT', refScope: 'SHARED' },
    { memberName: 'product', ref: 'product-team', refType: 'AGENT_TEAM', refScope: 'SHARED' },
    { memberName: 'software', ref: 'software-team', refType: 'AGENT_TEAM', refScope: 'SHARED' },
  ],
}
const teams = new Map([[softwareTeam.id, softwareTeam], [productTeam.id, productTeam]])
const project = (changes: Partial<Parameters<typeof projectEditableAgentOrgRunFormModel>[0]> = {}) =>
  projectEditableAgentOrgRunFormModel({
    orgDefinition: org,
    rootConfig,
    teamOverrides: {},
    agentOverrides: {},
    getTeamDefinitionById: (id) => teams.get(id) ?? null,
    getAgentDisplayNameById: (id) => id === 'requirements-agent' ? 'Requirements Engineer' : null,
    workspaceSelectionFor: (_address, effective) => ({
      mode: effective.workspaceId ? 'existing' : 'new',
      existingWorkspaceId: effective.workspaceId,
      newWorkspacePath: effective.workspaceRootPath ?? '',
    }),
    workspaceOperationFor: () => ({ status: 'idle', error: null }),
    runtimeCatalogStateFor: () => ({ status: 'idle', error: null }),
    ...changes,
  })
const readyModel = (changes: Partial<Parameters<typeof projectEditableAgentOrgRunFormModel>[0]> = {}) => {
  const result = project(changes)
  if (result.status !== 'ready') throw new Error(result.diagnostic.message)
  return result.model
}

describe('projectEditableAgentOrgRunFormModel', () => {
  it('projects exact direct Agents and one independently collapsible Team level with exact coordinator identity', () => {
    const model = readyModel()

    expect(model.configurableAgentCount).toBe(5)
    expect(model.directAgents).toEqual([
      expect.objectContaining({
        address: '/requirements_engineer', displayName: 'Requirements Engineer',
        isCoordinator: false, isCustomized: false,
      }),
    ])
    expect(model.mountedTeams.map((node) => node.address)).toEqual(['/product', '/software'])
    expect(model.mountedTeams[1]).toEqual(expect.objectContaining({
      address: '/software',
      scope: expect.objectContaining({
        displayName: 'Software Engineering', isCustomized: false,
        inheritedConfig: rootConfig,
      }),
      children: [
        expect.objectContaining({ address: '/software/architecture_designer', isCoordinator: true }),
        expect.objectContaining({ address: '/software/implementation_engineer', isCoordinator: false }),
      ],
    }))
  })

  it('keeps Team and exact-Agent customization independent while applying root -> Team -> Agent precedence', () => {
    const agentOnly = readyModel({
      agentOverrides: { '/software/implementation_engineer': { llmModelIdentifier: 'gpt-agent', llmConfig: null } },
    })
    expect(agentOnly.mountedTeams[1]!.scope.isCustomized).toBe(false)
    expect(agentOnly.mountedTeams[1]!.children[1]).toEqual(expect.objectContaining({
      isCustomized: true,
      baselineConfig: expect.objectContaining({ llmModelIdentifier: 'gpt-root' }),
      effectiveConfig: expect.objectContaining({ llmModelIdentifier: 'gpt-agent' }),
    }))

    const teamAndAgent = readyModel({
      teamOverrides: { '/software': { runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-team', llmConfig: null } },
      agentOverrides: { '/software/implementation_engineer': { autoExecuteTools: true } },
    })
    expect(teamAndAgent.mountedTeams[1]!.scope).toEqual(expect.objectContaining({
      isCustomized: true,
      effectiveConfig: expect.objectContaining({ runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-team' }),
    }))
    expect(teamAndAgent.mountedTeams[1]!.children[1]).toEqual(expect.objectContaining({
      baselineConfig: expect.objectContaining({ llmModelIdentifier: 'gpt-team' }),
      effectiveConfig: expect.objectContaining({ llmModelIdentifier: 'gpt-team', autoExecuteTools: true }),
    }))
  })

  it('preserves an inherited new root workspace and labels only value-changing patches as customized', () => {
    const newWorkspaceRoot = {
      ...rootConfig,
      workspaceId: null,
      workspaceMetadata: null,
      workspaceRootPath: '/workspace/new-root',
    }
    const model = readyModel({
      rootConfig: newWorkspaceRoot,
      teamOverrides: { '/software': { autoExecuteTools: false } },
      agentOverrides: { '/software/implementation_engineer': { autoExecuteTools: false } },
    })

    expect(model.mountedTeams[1]!.scope).toEqual(expect.objectContaining({
      isCustomized: false,
      effectiveConfig: expect.objectContaining({ workspaceRootPath: '/workspace/new-root' }),
      workspaceSelection: expect.objectContaining({ newWorkspacePath: '/workspace/new-root' }),
    }))
    expect(model.mountedTeams[1]!.children[1]).toEqual(expect.objectContaining({
      isCustomized: false,
      effectiveConfig: expect.objectContaining({ workspaceRootPath: '/workspace/new-root' }),
    }))
  })

  it('projects a pending new Team workspace as the exact customized Team and Agent baseline', () => {
    const model = readyModel({
      teamOverrides: { '/software': { workspace: { workspaceId: null, workspaceMetadata: null } } },
      workspaceSelectionFor: (address, effective) => address === '/software'
        ? { mode: 'new', existingWorkspaceId: null, newWorkspacePath: '/workspace/software' }
        : {
            mode: effective.workspaceId ? 'existing' : 'new',
            existingWorkspaceId: effective.workspaceId,
            newWorkspacePath: effective.workspaceRootPath ?? '',
          },
    })

    expect(model.mountedTeams[1]!.scope).toEqual(expect.objectContaining({
      isCustomized: true,
      effectiveConfig: expect.objectContaining({ workspaceRootPath: '/workspace/software' }),
    }))
    expect(model.mountedTeams[1]!.children[0]).toEqual(expect.objectContaining({
      baselineConfig: expect.objectContaining({ workspaceRootPath: '/workspace/software' }),
    }))
  })

  it.each([
    ['missing Team', { getTeamDefinitionById: () => null }, 'MISSING_TEAM_DEFINITION', "cannot resolve Team '/product'"],
    ['duplicate Org address', { orgDefinition: { ...org, members: [...org.members, { ...org.members[0] }] } }, 'DUPLICATE_ADDRESS', "duplicate Agent address '/requirements_engineer'"],
    ['missing coordinator', { getTeamDefinitionById: (id: string) => id === 'software-team' ? { ...softwareTeam, coordinatorMemberName: 'absent' } : teams.get(id) ?? null }, 'INVALID_TEAM_COORDINATOR', "Team '/software' has no exact coordinator member 'absent'"],
    ['deeper configured member', { getTeamDefinitionById: (id: string) => id === 'software-team' ? { ...softwareTeam, nodes: [{ memberName: 'architecture_designer', ref: 'architecture-agent' }, { memberName: 'nested/member', ref: 'invalid' }] } : teams.get(id) ?? null }, 'INVALID_MEMBER_ADDRESS', "invalid member name 'nested/member' below '/software'"],
    ['stale Team override', { teamOverrides: { '/missing': { autoExecuteTools: true } } }, 'STALE_TEAM_OVERRIDE', "stale Team override '/missing'"],
    ['stale Agent override', { agentOverrides: { '/missing': { autoExecuteTools: true } } }, 'STALE_AGENT_OVERRIDE', "stale Agent override '/missing'"],
  ])('fails closed with an exact diagnostic for %s', (_case, changes, code, message) => {
    expect(project(changes as Partial<Parameters<typeof projectEditableAgentOrgRunFormModel>[0]>)).toEqual({
      status: 'blocked',
      diagnostic: expect.objectContaining({ code, message: expect.stringContaining(message) }),
    })
  })
})
