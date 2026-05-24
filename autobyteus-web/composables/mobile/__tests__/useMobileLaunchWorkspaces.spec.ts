import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useMobileLaunchWorkspaces } from '~/composables/mobile/useMobileLaunchWorkspaces'
import { useWorkspaceStore } from '~/stores/workspace'

const makeWorkspace = (workspaceId: string, name: string, rootPath: string) => ({
  workspaceId,
  name,
  absolutePath: rootPath,
  workspaceConfig: { root_path: rootPath },
  nodeIdToNode: {},
  fileExplorer: { id: 'root', name, path: rootPath, is_file: false, children: [] } as any,
})

describe('useMobileLaunchWorkspaces', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    setActivePinia(createPinia())
  })

  it('refreshes through the workspace store and maps every store workspace as a launch choice', async () => {
    const workspaceStore = useWorkspaceStore()
    workspaceStore.workspaces = {
      'workspace-active': makeWorkspace('workspace-active', 'Active Workspace', '/Users/normy/active'),
      'workspace-dormant': makeWorkspace('workspace-dormant', 'Dormant Workspace', '/Users/normy/dormant'),
    }
    const fetchSpy = vi.spyOn(workspaceStore, 'fetchAllWorkspaces').mockResolvedValue(undefined)

    const launchWorkspaces = useMobileLaunchWorkspaces()
    await launchWorkspaces.refresh()

    expect(fetchSpy).toHaveBeenCalledWith(false)
    expect(launchWorkspaces.workspaceItems.value.map((item) => item.label)).toEqual([
      'Active Workspace',
      'Dormant Workspace',
    ])
    expect(launchWorkspaces.getWorkspaceIdForRootPath('/Users/normy/dormant/')).toBe('workspace-dormant')
  })

  it('loads an unlisted server-side path through workspaceStore.createWorkspace', async () => {
    const workspaceStore = useWorkspaceStore()
    const createSpy = vi.spyOn(workspaceStore, 'createWorkspace').mockImplementation(async (config: { root_path: string }) => {
      workspaceStore.workspaces['workspace-loaded'] = makeWorkspace('workspace-loaded', 'Loaded Workspace', config.root_path)
      return 'workspace-loaded'
    })

    const launchWorkspaces = useMobileLaunchWorkspaces()
    const result = await launchWorkspaces.loadByPath('  /srv/autobyteus/loaded  ')

    expect(createSpy).toHaveBeenCalledWith({ root_path: '/srv/autobyteus/loaded' })
    expect(result).toEqual({ workspaceId: 'workspace-loaded', rootPath: '/srv/autobyteus/loaded' })
    expect(launchWorkspaces.workspaceItems.value[0]).toMatchObject({
      id: 'workspace-loaded',
      label: 'Loaded Workspace',
      detail: '/srv/autobyteus/loaded',
    })
  })

  it('rejects empty path loads with local picker error state', async () => {
    const launchWorkspaces = useMobileLaunchWorkspaces()

    await expect(launchWorkspaces.loadByPath('   ')).rejects.toThrow('Enter a server-side workspace path before loading.')

    expect(launchWorkspaces.error.value).toBe('Enter a server-side workspace path before loading.')
  })
})
