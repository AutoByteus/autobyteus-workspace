import { describe, it, expect } from 'vitest'
import { taskBearingView } from '~/services/agentOrgExecution/__tests__/taskBearingOrgFixture'
import { createExistingAgentOrgWorkspaceDraft, existingAgentOrgWorkspacesDirty, existingAgentOrgWorkspacesValid,
  planExistingAgentOrgWorkspacePatches, previewExistingAgentOrgWorkspaces, updateExistingAgentOrgWorkspaceDraft } from '../existingAgentOrgWorkspaceDraft'
import { createExistingAgentOrgModelConfigDraft } from '../existingAgentOrgModelConfigDraft'
import { projectExistingAgentOrgRunFormModel } from '../existingAgentOrgRunFormModel'

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
  const form = projectExistingAgentOrgRunFormModel({ tree, planner, workspaceDraft: draft,
    isActive: false, modelConfigEditable: true, modelConfigReason: null, saving: false })
  const projected = form.members[2]!
  expect(form.root.workspacePresentation).toEqual({ kind: 'selector', model: expect.objectContaining({ mode: 'stored' }) })
  expect(projected.kind).toBe('agent_team')
  if (projected.kind !== 'agent_team') throw new Error('fixture')
  expect(projected.scope.workspacePresentation).toEqual({ kind: 'selector', model: expect.objectContaining({ mode: 'editable' }) })
  expect(projected.scope.isCustomized).toBe(true)
  expect(projected.children.map(child => child.kind === 'agent' && child.workspacePresentation.kind === 'selector'
    && child.workspacePresentation.model.mode === 'stored' && child.workspacePresentation.model.workspace?.rootPath)).toEqual(['/B', '/B'])
  expect(projected.children[1]?.kind === 'agent' && projected.children[1].effectiveConfig.llmConfig).toEqual({ customized: true })
  draft = updateExistingAgentOrgWorkspaceDraft(draft, '/team', { mode: 'new', existingWorkspaceId: null, newWorkspacePath: ' ' }, known)
  expect(existingAgentOrgWorkspacesDirty(tree, draft)).toBe(true)
  expect(existingAgentOrgWorkspacesValid(tree, draft)).toBe(false)
  draft = updateExistingAgentOrgWorkspaceDraft(draft, '/team', { mode: 'new', existingWorkspaceId: null, newWorkspacePath: '/A' }, known)
  expect(existingAgentOrgWorkspacesDirty(tree, draft)).toBe(false)
  expect(previewExistingAgentOrgWorkspaces(tree, draft)).toEqual(tree)
  expect(planner).toEqual(createExistingAgentOrgModelConfigDraft(tree))
})
