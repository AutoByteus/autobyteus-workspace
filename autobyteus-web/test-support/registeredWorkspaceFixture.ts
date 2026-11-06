import { useWorkspaceStore } from '~/stores/workspace'

/**
 * Registers a folder in the active Pinia workspace store, as the app's workspace catalog would. The Workspaces view lists
 * a run's folder only while the folder is registered (workspace-tree-vs-chooser REQ-002, REQ-009), so a spec that reads
 * Org rows through the Workspaces tree registers the Org's root folder first.
 */
export const registerTestWorkspace = (rootPath: string, workspaceId = 'ws-org', name = 'Org Workspace'): void => {
  useWorkspaceStore().workspaces[workspaceId] = {
    workspaceId, name, absolutePath: rootPath, workspaceConfig: { root_path: rootPath },
  } as never
}

