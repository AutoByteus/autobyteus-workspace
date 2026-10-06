import { describe, expect, it } from 'vitest'
import {
  buildOrgMemberTree,
  buildTeamMemberTree,
  countAgentMembers,
  countCustomizedMembers,
} from '../runMemberTree'
import type { RunSettingsValues } from '~/types/runSettings/RunSettings'
import type { RunWorkspaceChoice } from '~/types/runSettings/RunWorkspaceChoice'
import type { UiModelConfigSchema } from '~/utils/llmConfigSchema'

const codex = {
  reasoning_effort: { type: 'string', enum: ['low', 'medium', 'high'], default: 'medium' },
  service_tier: { type: 'string', enum: ['fast'], title: 'Fast mode' },
} as unknown as UiModelConfigSchema
const deps = {
  schemaFor: (runtimeKind: string) => (runtimeKind === 'codex_app_server' ? codex : null),
  sameWorkspace: (left: RunWorkspaceChoice | null, right: RunWorkspaceChoice | null) => JSON.stringify(left) === JSON.stringify(right),
}
const root: RunSettingsValues = {
  workspace: { kind: 'existing', workspaceId: 'temp' },
  runtimeKind: 'codex_app_server',
  llmModelIdentifier: 'gpt-codex',
  llmConfig: { reasoning_effort: 'medium' },
  autoExecuteTools: true,
}
const team = { coordinatorMemberName: 'lead', nodes: [{ memberName: 'lead', ref: 'a' }, { memberName: 'writer', ref: 'b' }] }

describe('runMemberTree', () => {
  it('a Team member follows the composer unless it sets something itself', () => {
    const nodes = buildTeamMemberTree({ team, root, agentOverrides: {} }, deps)
    expect(nodes.map((node) => [node.key, node.isCoordinator])).toEqual([['/lead', true], ['/writer', false]])
    expect(nodes[1]!.values).toEqual(root)
    expect(countCustomizedMembers(nodes)).toBe(0)
    expect(countAgentMembers(nodes)).toBe(2)
  })

  it('counts Thinking only when the thinking settings differ; Fast mode is its own setting', () => {
    const [, fastOnly] = buildTeamMemberTree({ team, root, agentOverrides: {
      '/writer': { llmConfig: { reasoning_effort: 'medium', service_tier: 'fast' } },
    } }, deps)
    expect(fastOnly!.customized.thinking).toBe(false)
    expect(fastOnly!.customizedOptionKeys).toEqual(['service_tier'])

    const [, both] = buildTeamMemberTree({ team, root, agentOverrides: {
      '/writer': { llmConfig: { reasoning_effort: 'high', service_tier: 'fast' } },
    } }, deps)
    expect(both!.customized.thinking).toBe(true)
    expect(both!.customizedOptionKeys).toEqual(['service_tier'])
  })

  it('an own model is the customization (thinking belongs to it); Antigravity’s fixed approval is not', () => {
    const [, member] = buildTeamMemberTree({ team, root: { ...root, autoExecuteTools: false }, agentOverrides: {
      '/writer': { runtimeKind: 'antigravity_cli', llmModelIdentifier: 'gemini', llmConfig: null, autoExecuteTools: true },
    } }, deps)
    expect(member!.customized).toMatchObject({ model: true, thinking: false, approval: false })
  })

  it('an Org tree has placed teams (with their workspace) over their members, and direct agents', () => {
    const tree = buildOrgMemberTree({
      org: { members: [
        { memberName: 'product', ref: 'product-team', refType: 'AGENT_TEAM', refScope: 'SHARED' },
        { memberName: 'analyst', ref: 'analyst', refType: 'AGENT', refScope: 'SHARED' },
      ] },
      root,
      getTeamDefinitionById: () => ({ name: 'Product Team', ...team }),
      getAgentDisplayNameById: () => 'Analyst',
      teamOverrides: { '/product': { autoExecuteTools: false } },
      teamWorkspaces: { '/product': { kind: 'folder', rootPath: '/work/product' } },
      agentOverrides: {},
    }, deps)
    expect(tree.status).toBe('ready')
    if (tree.status !== 'ready') return
    const [placed, analyst] = tree.nodes
    expect(placed).toMatchObject({ kind: 'team', name: 'Product Team', customized: { workspace: true, approval: true } })
    // Members follow their team, not the Org card.
    expect(placed!.children[1]!.values).toMatchObject({ autoExecuteTools: false, workspace: { kind: 'folder', rootPath: '/work/product' } })
    expect(placed!.children[1]!.customized.approval).toBe(false)
    expect(analyst).toMatchObject({ kind: 'agent', name: 'Analyst' })
    expect(countAgentMembers(tree.nodes)).toBe(3)
    expect(countCustomizedMembers(tree.nodes)).toBe(1)
  })

  it('blocks a broken Org topology instead of guessing', () => {
    const tree = buildOrgMemberTree({
      org: { members: [{ memberName: 'product', ref: 'missing', refType: 'AGENT_TEAM', refScope: 'SHARED' }] },
      root, getTeamDefinitionById: () => null, getAgentDisplayNameById: () => null,
      teamOverrides: {}, teamWorkspaces: {}, agentOverrides: {},
    }, deps)
    expect(tree).toMatchObject({ status: 'blocked', diagnostic: { code: 'MISSING_TEAM_DEFINITION' } })
  })
})
