/**
 * chatDraftProjectChoice (projects-left-navigation, REQ-004, REQ-005, AC-004, AC-015, DEC-014): choosing a Project on a
 * New chat draft preselects its first linked folder, else the temp workspace, unless the user already picked a folder;
 * "No project" makes a plain start and keeps the folder; nothing changes while the first send is in flight.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useWorkspaceStore } from '../workspace'
import { chooseDraftFolder, chooseDraftProject, noProjectChoice, projectFolderOf, startDraftUnderProject } from '../chatDraftProjectChoice'
import type { ChatDraft } from '../chatDraftStore'

const draft = (): ChatDraft => ({ workspace: { kind: 'existing', workspaceId: 'temp_ws_default' }, projectChoice: noProjectChoice(), starting: false } as unknown as ChatDraft)

describe('chatDraftProjectChoice', () => {
  beforeEach(() => { setActivePinia(createPinia()); useWorkspaceStore() })

  it("preselects the Project's first linked folder, else the temp workspace (AC-004)", () => {
    const target = draft()
    chooseDraftProject(target, 'P', '/Users/me/autobyteus')
    expect(target.projectChoice.projectId).toBe('P')
    expect(target.workspace).toEqual({ kind: 'folder', rootPath: '/Users/me/autobyteus' })
    chooseDraftProject(target, 'Q', null)
    expect(target.workspace).toMatchObject({ kind: 'existing' })
  })

  it('keeps a folder the user picked on this start; "No project" keeps the folder (AC-015)', () => {
    const target = draft()
    chooseDraftFolder(target, { kind: 'folder', rootPath: '/x' })
    chooseDraftProject(target, 'P', '/Users/me/autobyteus')
    expect(target.workspace).toEqual({ kind: 'folder', rootPath: '/x' })
    chooseDraftProject(target, null, null)
    expect(target.projectChoice.projectId).toBeNull()
    expect(target.workspace).toEqual({ kind: 'folder', rootPath: '/x' })
  })

  it('changes nothing while the first message is being sent (the Project is fixed once the run exists)', () => {
    const target = { ...draft(), starting: true } as ChatDraft
    chooseDraftProject(target, 'P', '/Users/me/autobyteus')
    expect(target.projectChoice.projectId).toBeNull()
  })

  it('"+" on a Project starts the default agent, on a group that agent or team, under the Project (REQ-004)', () => {
    const calls: unknown[] = []
    const drafts = {
      startNewChat: (preset?: unknown) => { calls.push(['newChat', preset]); return draft() },
      startForDefinition: (target: unknown) => { calls.push(['definition', target]); return draft() },
      setProject: (projectId: string | null, folder: string | null) => { calls.push(['project', projectId, folder]) },
    }
    startDraftUnderProject(drafts, { projectId: 'P', folderRootPath: '/f', target: null })
    startDraftUnderProject(drafts, { projectId: 'P', folderRootPath: '/f', target: { kind: 'agent', agentDefinitionId: 'pm' } })
    startDraftUnderProject(drafts, { projectId: 'P', folderRootPath: null, target: { kind: 'team', teamDefinitionId: 'set' } })
    expect(calls).toEqual([
      ['newChat', {}], ['project', 'P', '/f'],
      ['newChat', { agentDefinitionId: 'pm' }], ['project', 'P', '/f'],
      ['definition', { kind: 'team', teamDefinitionId: 'set' }], ['project', 'P', null],
    ])
    expect(projectFolderOf({ workspaces: [{ workspaceRootPath: ' /a ' }, { workspaceRootPath: '/b' }] } as never)).toBe('/a')
    expect(projectFolderOf({ workspaces: [] })).toBeNull()
  })
})
