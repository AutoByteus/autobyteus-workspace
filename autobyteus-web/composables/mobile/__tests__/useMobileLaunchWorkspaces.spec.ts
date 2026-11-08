import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { ApolloError } from '@apollo/client/core'
import { GraphQLError } from 'graphql'
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

  it('shows the node\'s refusal reason under the path field and registers nothing (autobyteus-426 AC-008)', async () => {
    const workspaceStore = useWorkspaceStore()
    const refused = (reason: string) => new ApolloError({
      graphQLErrors: [new GraphQLError('refused', { extensions: { code: 'WORKSPACE_PATH_REFUSED', reason } })],
    })
    const launchWorkspaces = useMobileLaunchWorkspaces()
    const cases: Array<[string, string, string]> = [
      ['/definitely/not/a/folder', 'missing', 'No folder at this path.'],
      ['/etc/hosts', 'not_a_folder', 'This path is a file, not a folder.'],
      ['relative/dir', 'not_absolute', 'Enter a full path, starting with /.'],
    ]
    for (const [path, reason, text] of cases) {
      vi.spyOn(workspaceStore, 'createWorkspace').mockRejectedValueOnce(refused(reason))
      await expect(launchWorkspaces.loadByPath(path)).rejects.toThrow()
      expect(launchWorkspaces.error.value).toBe(text)
    }
    expect(launchWorkspaces.workspaceItems.value).toEqual([])
  })

  it('keeps the request\'s own message for any other failure', async () => {
    const workspaceStore = useWorkspaceStore()
    vi.spyOn(workspaceStore, 'createWorkspace').mockRejectedValue(new Error('Workspace request is no longer eligible on this node.'))
    const launchWorkspaces = useMobileLaunchWorkspaces()

    await expect(launchWorkspaces.loadByPath('/srv/x')).rejects.toThrow()
    expect(launchWorkspaces.error.value).toBe('Workspace request is no longer eligible on this node.')
  })

  it('rejects empty path loads with local picker error state', async () => {
    const launchWorkspaces = useMobileLaunchWorkspaces()

    await expect(launchWorkspaces.loadByPath('   ')).rejects.toThrow('Enter a server-side workspace path before loading.')

    expect(launchWorkspaces.error.value).toBe('Enter a server-side workspace path before loading.')
  })
})
