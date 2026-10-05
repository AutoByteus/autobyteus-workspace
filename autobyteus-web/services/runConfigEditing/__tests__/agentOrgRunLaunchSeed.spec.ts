import { describe, it, expect } from 'vitest'
import { buildEditableAgentOrgRunSeed } from '../agentOrgRunLaunchSeed'
import { seedFixture } from './orgSeedFixture'
import { toAgentOrgPlacementLaunchConfiguration } from '~/utils/agentOrgLaunchPatch'

describe('Org source configuration projection', () => {
  it('projects immediate-parent sparse overrides with equal-config model change, null, 0/false and Team paths; excludes all runtime data', () => {
    const { view, definition, references } = seedFixture(), original = JSON.stringify(view)
    const seed = buildEditableAgentOrgRunSeed(view.execution_tree, definition, references)
    expect(seed.llmConfig).toEqual({ budget: 0, enabled: false })
    expect(seed.agentOverrides['/director']).toEqual({ llmModelIdentifier: 'direct-model', llmConfig: { budget: 0, enabled: false }, autoExecuteTools: true })
    expect(seed.teamOverrides['/team']).toEqual({ llmModelIdentifier: 'team-model', llmConfig: null, workspace: { workspaceId: null, workspaceMetadata: null } })
    expect(seed.teamWorkspaceSelections['/team'].newWorkspacePath).toBe('/source/team')
    expect(toAgentOrgPlacementLaunchConfiguration(seed.teamOverrides['/team'], seed.teamWorkspaceSelections['/team'].newWorkspacePath))
      .toEqual({ llmModelIdentifier: 'team-model', llmConfig: null, workspaceRootPath: '/source/team' })
    expect(seed.agentOverrides['/team/lead']).toEqual({ llmModelIdentifier: 'mounted-model', llmConfig: { budget: 3, enabled: false } })
    for (const forbidden of ['orgRunId', 'agentRunId', 'teamRunId', 'platformAgentRunId', 'taskExecutions', 'applicationBinding', 'task_records']) expect(JSON.stringify(seed)).not.toContain(forbidden)
    seed.llmConfig!.budget = 8
    expect(JSON.stringify(view)).toBe(original)
  })
  it.each(['root', 'placement', 'kind', 'child', 'coordinator', 'agent-workspace'])('blocks unrepresentable or changed %s instead of normalizing or rebinding', what => {
    const { view, definition, references } = seedFixture(), root = view.execution_tree.rootOrg
    if (what === 'root') definition.id = 'other'
    if (what === 'placement') definition.members.pop()
    if (what === 'kind') definition.members[0].refType = 'AGENT_TEAM'
    if (what === 'child') references.teams['team-definition'].nodes[0].ref = 'rebound'
    if (what === 'coordinator') references.teams['team-definition'].coordinatorMemberName = 'worker'
    if (what === 'agent-workspace' && 'agentRunId' in root.members[0]) root.members[0].launchConfiguration.workspaceRootPath = '/different'
    expect(() => buildEditableAgentOrgRunSeed(view.execution_tree, definition, references)).toThrow()
  })
  it('retains explicit child parameters for a runtime difference even when equal to parent', () => {
    const { view, definition, references } = seedFixture()
    const child = view.execution_tree.rootOrg.members[0]
    if (!('agentRunId' in child)) throw new Error('fixture')
    child.launchConfiguration.runtimeKind = 'autobyteus'
    const seed = buildEditableAgentOrgRunSeed(view.execution_tree, definition, references)
    expect(seed.agentOverrides['/director']).toMatchObject({ runtimeKind: 'autobyteus', llmConfig: { budget: 0, enabled: false } })
  })
  it('keeps missing root and Team paths incomplete, never substitutes a temporary path', () => {
    const { view, definition, references } = seedFixture(), root = view.execution_tree.rootOrg
    root.defaultLaunchConfiguration.workspaceRootPath = null
    for (const member of root.members) if ('agentRunId' in member) member.launchConfiguration.workspaceRootPath = null
    const seed = buildEditableAgentOrgRunSeed(view.execution_tree, definition, references)
    expect(seed.workspaceSelection.newWorkspacePath).toBe('')
  })
})
