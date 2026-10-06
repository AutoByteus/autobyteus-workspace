import { describe, it, expect } from 'vitest'
import { taskBearingView } from '~/services/agentOrgExecution/__tests__/taskBearingOrgFixture'
import { createExistingAgentOrgWorkspaceDraft, existingAgentOrgWorkspacesDirty, existingAgentOrgWorkspacesValid,
  planExistingAgentOrgWorkspacePatches, previewExistingAgentOrgWorkspaces, updateExistingAgentOrgWorkspaceDraft } from '../existingAgentOrgWorkspaceDraft'
import { createExistingAgentOrgModelConfigDraft } from '../existingAgentOrgModelConfigDraft'
import { buildSavedRunMemberTree } from '~/utils/runSettings/runMemberTree'
import type { RunWorkspaceChoice } from '~/types/runSettings/RunWorkspaceChoice'

const folder = (rootPath: string | null): RunWorkspaceChoice | null => (rootPath ? { kind: 'folder', rootPath } : null)
const treeDeps = {
  schemaFor: () => null,
  sameWorkspace: (left: RunWorkspaceChoice | null, right: RunWorkspaceChoice | null) => JSON.stringify(left) === JSON.stringify(right),
  workspaceFromRootPath: folder,
}

it('composes independent workspace intentions without repairing distinct children at draft open or changing models', () => {
  const tree = JSON.parse(JSON.stringify(taskBearingView().execution_tree))
  const team = tree.rootOrg.members[2]
  team.defaultLaunchConfiguration.workspaceRootPath = '/A'
  team.members[0].launchConfiguration.workspaceRootPath = '/A'
  team.members[1].launchConfiguration = { ...team.members[1].launchConfiguration, workspaceRootPath: '/C', llmConfig: { customized: true } }
  const known = [{ workspaceId: 'A', absolutePath: '/A' }, { workspaceId: 'B', absolutePath: '/B' }]
  let draft = createExistingAgentOrgWorkspaceDraft(tree, known)
  expect(draft['/team']?.selection.mode).toBe('existing')
  expect(existingAgentOrgWorkspacesDirty(tree, draft)).toBe(false)
  expect(planExistingAgentOrgWorkspacePatches(tree, draft)).toEqual([])
  expect(previewExistingAgentOrgWorkspaces(tree, draft)).toEqual(tree)
  const planner = createExistingAgentOrgModelConfigDraft(tree)
  draft = updateExistingAgentOrgWorkspaceDraft(draft, '/team', { mode: 'existing', existingWorkspaceId: 'B', newWorkspacePath: '' }, known)
  expect(planExistingAgentOrgWorkspacePatches(tree, draft)).toEqual([{ teamAddress: '/team', workspaceRootPath: '/B' }])
  // The saved-run Members list shows the placed team's edited workspace; its members follow it.
  const saved = buildSavedRunMemberTree({ kind: 'agent_org', tree, planner, workspaceDraft: draft }, treeDeps)
  const projected = saved.nodes[2]!
  expect(projected.kind).toBe('team')
  expect(projected.values.workspace).toEqual(folder('/B'))
  expect(projected.customized.workspace).toBe(true)
  expect(projected.children.map((child) => child.values.workspace)).toEqual([folder('/B'), folder('/B')])
  expect(projected.children[1]!.values.llmConfig).toEqual({ customized: true })
  draft = updateExistingAgentOrgWorkspaceDraft(draft, '/team', { mode: 'new', existingWorkspaceId: null, newWorkspacePath: ' ' }, known)
  expect(existingAgentOrgWorkspacesDirty(tree, draft)).toBe(true)
  expect(existingAgentOrgWorkspacesValid(tree, draft)).toBe(false)
  draft = updateExistingAgentOrgWorkspaceDraft(draft, '/team', { mode: 'new', existingWorkspaceId: null, newWorkspacePath: '/A' }, known)
  expect(existingAgentOrgWorkspacesDirty(tree, draft)).toBe(false)
  expect(previewExistingAgentOrgWorkspaces(tree, draft)).toEqual(tree)
  expect(planner).toEqual(createExistingAgentOrgModelConfigDraft(tree))
})
