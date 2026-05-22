import { defineStore } from 'pinia'
import { getApolloClient } from '~/utils/apolloClient'
import { CreateWorkspace } from '~/graphql/mutations/workspace_mutations'
import { GetAllWorkspaces } from '~/graphql/queries/workspace_queries'
import type {
  CreateWorkspaceMutation,
  CreateWorkspaceMutationVariables,
  GetAllWorkspacesQuery,
} from '~/generated/graphql'
import { TreeNode, convertJsonToTreeNode } from '~/utils/fileExplorer/TreeNode'
import { createNodeIdToNodeDictionary, handleFileSystemChange as applyTreeChanges } from '~/utils/fileExplorer/fileUtils'
import type { FileSystemChangeEvent } from '~/types/fileSystemChangeTypes'
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useAgentRunConfigStore } from '~/stores/agentRunConfigStore';
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore';
import { useFileExplorerStore } from '~/stores/fileExplorer'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { replaceFolderChildren } from '~/utils/fileExplorer/openFolderRefresh'
import type {
  WorkspaceActivationState,
  WorkspaceReference,
} from '~/types/workspace/WorkspaceReference'
import {
  normalizeWorkspaceRootPath as normalizeRootPath,
  workspaceReferenceFromWorkspaceInfo,
} from '~/utils/workspaceReference'
import {
  cacheWorkspaceReferenceForStore,
  ensureWorkspaceInitializedForStore,
  findWorkspaceInfoByRootPathForStore,
  registerWorkspaceInfoReferenceForStore,
  resolveWorkspaceReferenceByRootPathForStore,
} from '~/stores/workspaceReferenceActions'
import {
  acquireFileExplorerLiveSessionForStore,
  clearFileExplorerLiveSessionForWorkspaceForStore,
  connectFileExplorerLiveStreamForStore,
  disconnectAllFileExplorerLiveStreamsForStore,
  disconnectFileExplorerLiveStreamForStore,
  refreshFileExplorerSnapshotForStore,
  releaseFileExplorerLiveSessionForStore,
} from '~/stores/workspaceFileExplorerLiveActions'
import type { FileExplorerStreamingService } from '~/services/fileExplorerStreaming/FileExplorerStreamingService'

export interface WorkspaceInfo {
  workspaceId: string;
  name: string;
  fileExplorer: TreeNode;
  nodeIdToNode: Record<string, TreeNode>;
  workspaceConfig: any;
  absolutePath: string | null;
  isTemp?: boolean;
}

interface WorkspaceState {
  workspaces: Record<string, WorkspaceInfo>;
  workspaceReferencesById: Record<string, WorkspaceReference>;
  workspaceReferenceIdsByRootPath: Record<string, string>;
  workspaceActivationStateById: Record<string, WorkspaceActivationState>;
  loading: boolean;
  error: any;
  workspacesFetched: boolean;
  fileSystemConnections: Map<string, FileExplorerStreamingService>;
  fileExplorerLiveConsumers: Map<string, Set<string>>;
  fileExplorerSnapshotRefreshes: Map<string, Promise<void>>;
  workspaceActivationTasks: Map<string, Promise<WorkspaceInfo>>;
}

export const useWorkspaceStore = defineStore('workspace', {
  state: (): WorkspaceState => ({
    workspaces: {},
    workspaceReferencesById: {},
    workspaceReferenceIdsByRootPath: {},
    workspaceActivationStateById: {},
    loading: false,
    error: null,
    workspacesFetched: false,
    fileSystemConnections: new Map(),
    fileExplorerLiveConsumers: new Map(),
    fileExplorerSnapshotRefreshes: new Map(),
    workspaceActivationTasks: new Map(),
  }),
  actions: {    
    cacheWorkspaceReference(reference: WorkspaceReference | null | undefined) {
      cacheWorkspaceReferenceForStore(this, reference);
    },

    registerWorkspaceInfoReference(workspace: WorkspaceInfo): WorkspaceReference | null {
      return registerWorkspaceInfoReferenceForStore(this, workspace) as WorkspaceReference | null;
    },

    findWorkspaceInfoByRootPath(rootPath: string): WorkspaceInfo | null {
      return findWorkspaceInfoByRootPathForStore(this, rootPath) as WorkspaceInfo | null;
    },

    async resolveWorkspaceReferenceByRootPath(
      rootPath: string | null | undefined,
    ): Promise<WorkspaceReference | null> {
      return resolveWorkspaceReferenceByRootPathForStore(this, rootPath);
    },

    async ensureWorkspaceInitialized(reference: WorkspaceReference): Promise<WorkspaceInfo> {
      return ensureWorkspaceInitializedForStore(this, reference) as Promise<WorkspaceInfo>;
    },

    removeWorkspaceEntriesByRootPath(rootPath: string | null | undefined) {
      const normalizedTarget = normalizeRootPath(rootPath);
      if (!normalizedTarget) {
        return;
      }

      for (const [workspaceId, workspace] of Object.entries(this.workspaces)) {
        const normalizedWorkspaceRoot = normalizeRootPath(
          workspace.absolutePath
            || workspace.workspaceConfig?.root_path
            || workspace.workspaceConfig?.rootPath
            || null,
        );
        if (normalizedWorkspaceRoot !== normalizedTarget) {
          continue;
        }
        this.clearFileExplorerLiveSessionForWorkspace(workspaceId);
        delete this.workspaces[workspaceId];
      }
    },

    async createWorkspace(config: { root_path: string }): Promise<string> {
      this.loading = true;
      this.error = null;
      const client = getApolloClient()
      try {
        const { data, errors } = await client.mutate<CreateWorkspaceMutation, CreateWorkspaceMutationVariables>({
          mutation: CreateWorkspace,
          variables: {
            input: {
              rootPath: config.root_path
            }
          }
        });

        if (errors && errors.length > 0) {
          throw new Error(errors.map((e: { message: string }) => e.message).join(', '));
        }

        if (data?.createWorkspace) {
          const newWorkspace = data.createWorkspace;
          this.removeWorkspaceEntriesByRootPath(newWorkspace.absolutePath ?? config.root_path);
          
          const treeNode = convertJsonToTreeNode(newWorkspace.fileExplorer);
          const nodeIdToNode = createNodeIdToNodeDictionary(treeNode);

          this.workspaces[newWorkspace.workspaceId] = {
            workspaceId: newWorkspace.workspaceId,
            name: newWorkspace.name,
            fileExplorer: treeNode,
            nodeIdToNode: nodeIdToNode,
            workspaceConfig: config,
            absolutePath: newWorkspace.absolutePath ?? null,
          };
          this.registerWorkspaceInfoReference(this.workspaces[newWorkspace.workspaceId]);
          
          return newWorkspace.workspaceId;
        } else {
          throw new Error('Failed to create workspace: No data returned.');
        }
      } catch (e: any) {
        this.error = e;
        console.error('Error creating workspace:', e);
        throw e;
      } finally {
        this.loading = false;
      }
    },
    async fetchAllWorkspaces(force = false, expectedBindingRevision?: number) {
      if (this.workspacesFetched && !force) return;
      this.loading = true;
      this.error = null;
      try {
        const windowNodeContextStore = useWindowNodeContextStore()
        const bindingRevisionAtStart =
          expectedBindingRevision ?? windowNodeContextStore.bindingRevision;

        if (windowNodeContextStore.bindingRevision !== bindingRevisionAtStart) {
          console.warn(
            `[Workspace] Skipping workspace fetch due to stale binding revision ${bindingRevisionAtStart}. Current revision: ${windowNodeContextStore.bindingRevision}`,
          );
          return;
        }

        if (force) {
          this.disconnectAllFileExplorerLiveStreams();
          this.workspaces = {};
          this.workspacesFetched = false;
        }

        const isReady = await windowNodeContextStore.waitForBoundBackendReady()
        if (!isReady) {
          throw new Error('Bound backend is not ready')
        }

        if (windowNodeContextStore.bindingRevision !== bindingRevisionAtStart) {
          console.warn(
            `[Workspace] Discarding workspace fetch because binding revision changed to ${windowNodeContextStore.bindingRevision}`,
          );
          return;
        }

        const client = getApolloClient()
        const { data, errors } = await client.query<GetAllWorkspacesQuery>({
          query: GetAllWorkspaces,
          fetchPolicy: 'network-only',
        });

        if (windowNodeContextStore.bindingRevision !== bindingRevisionAtStart) {
          console.warn(
            `[Workspace] Ignoring workspace query result for stale revision ${bindingRevisionAtStart}; current revision is ${windowNodeContextStore.bindingRevision}`,
          );
          return;
        }

        if (errors && errors.length > 0) {
          throw new Error(errors.map((e: { message: string }) => e.message).join(', '));
        }

        if (data?.workspaces) {
          data.workspaces.forEach((ws: any) => {
            const treeNode = convertJsonToTreeNode(ws.fileExplorer);
            const nodeIdToNode = createNodeIdToNodeDictionary(treeNode);
            this.workspaces[ws.workspaceId] = {
              workspaceId: ws.workspaceId,
              name: ws.name,
              fileExplorer: treeNode,
              nodeIdToNode: nodeIdToNode,
              workspaceConfig: ws.config,
              absolutePath: ws.absolutePath ?? null,
              isTemp: (ws as any).isTemp ?? false,
            };
            this.registerWorkspaceInfoReference(this.workspaces[ws.workspaceId]);
          });
          this.workspacesFetched = true;
        }
      } catch (error: any) {
        console.error("Failed to fetch all workspaces:", error);
        this.error = error;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async resetWorkspaceStateForBackendContextChange(options?: {
      reason?: string;
      reload?: boolean;
    }) {
      const windowNodeContextStore = useWindowNodeContextStore();
      const bindingRevisionAtReset = windowNodeContextStore.bindingRevision;
      const reason = options?.reason || 'backend_context_changed';
      const reload = options?.reload ?? true;
      console.info(`[Workspace] Resetting workspace state due to ${reason}`);

      this.disconnectAllFileExplorerLiveStreams();

      this.workspaces = {};
      this.workspaceReferencesById = {};
      this.workspaceReferenceIdsByRootPath = {};
      this.workspaceActivationStateById = {};
      this.workspaceActivationTasks.clear();
      this.workspacesFetched = false;
      this.loading = false;
      this.error = null;

      const fileExplorerStore = useFileExplorerStore();
      fileExplorerStore.fileExplorerStateByWorkspace.clear();

      if (!reload) {
        return;
      }

      try {
        await this.fetchAllWorkspaces(true, bindingRevisionAtReset);
      } catch (error) {
        console.warn(
          `[Workspace] Failed to reload workspaces after backend context reset: ${String(error)}`,
        );
      }
    },

    handleFileSystemChange(
      workspaceId: string,
      event: FileSystemChangeEvent,
      source: 'mutation' | 'stream' = 'stream',
    ) {
      const workspace = this.workspaces[workspaceId];
      if (!workspace) {
        console.error(`Workspace with ID ${workspaceId} not found`);
        return;
      }
      
      const fileExplorerStore = useFileExplorerStore();
      const effectiveEvent =
        source === 'stream'
          ? fileExplorerStore.consumeRecentStructuralChangeEchoes(workspaceId, event)
          : event;

      if (effectiveEvent.changes.length === 0) {
        return;
      }
      
      // Apply structural changes to the tree
      applyTreeChanges(workspace.fileExplorer, workspace.nodeIdToNode, effectiveEvent);

      // Handle content invalidation intelligently
      effectiveEvent.changes.forEach(change => {
        if (change.type === 'modify') {
          const node = workspace.nodeIdToNode[change.node_id];
          if (node && node.is_file) {
            const wsFileExplorerState = fileExplorerStore._getOrCreateWorkspaceState(workspaceId);
            
            // Check if this modify event is an echo of our own save action
            if (wsFileExplorerState.filesToIgnoreNextModify.has(node.path)) {
              // It is. Consume the tag and do not invalidate the content.
              wsFileExplorerState.filesToIgnoreNextModify.delete(node.path);
            } else {
              // It's an external change. Invalidate content to trigger a re-fetch.
              fileExplorerStore.invalidateFileContent(node.path, workspaceId);
            }
          }
        }
      });
    },

    /**
     * Registers a visible file explorer consumer and keeps one live stream open
     * while at least one consumer is present for a workspace.
     */
    acquireFileExplorerLiveSession(workspaceId: string, consumerId: string): () => void {
      return acquireFileExplorerLiveSessionForStore(this as any, workspaceId, consumerId);
    },

    releaseFileExplorerLiveSession(workspaceId: string, consumerId: string) {
      releaseFileExplorerLiveSessionForStore(this as any, workspaceId, consumerId);
    },

    connectFileExplorerLiveStream(workspaceId: string) {
      connectFileExplorerLiveStreamForStore(this as any, workspaceId);
    },

    disconnectFileExplorerLiveStream(workspaceId: string) {
      disconnectFileExplorerLiveStreamForStore(this as any, workspaceId);
    },

    disconnectAllFileExplorerLiveStreams() {
      disconnectAllFileExplorerLiveStreamsForStore(this as any);
    },

    clearFileExplorerLiveSessionForWorkspace(workspaceId: string) {
      clearFileExplorerLiveSessionForWorkspaceForStore(this as any, workspaceId);
    },

    refreshFileExplorerSnapshot(workspaceId: string): Promise<void> {
      return refreshFileExplorerSnapshotForStore(this as any, workspaceId);
    },

    /**
     * Fetches children of a folder for lazy loading.
     * Called when a user expands a folder that hasn't had its children loaded yet.
     */
    async fetchFolderChildren(workspaceId: string, folderPath: string): Promise<void> {
      const workspace = this.workspaces[workspaceId];
      if (!workspace) {
        console.error(`Workspace ${workspaceId} not found`);
        return;
      }

      const client = getApolloClient()
      try {
        const { GetFolderChildren } = await import('~/graphql/queries/file_explorer_queries');
        const { data, errors } = await client.query({
          query: GetFolderChildren,
          variables: { workspaceId, folderPath },
          fetchPolicy: 'network-only', // Always fetch fresh data
        });

        if (errors && errors.length > 0) {
          console.error('Error fetching folder children:', errors);
          return;
        }

        if (data?.folderChildren) {
          const folderData = JSON.parse(data.folderChildren);
          
          // Check for error response
          if (folderData.error) {
            console.error('Server error:', folderData.error);
            return;
          }

          // Case 1: Root Initialization (for transient workspaces)
          if (folderPath === '' || folderPath === '/') {
              // If we are still using the placeholder 'root' ID, update it to the actual ID from server
              if (workspace.fileExplorer.id === 'root' && folderData.id !== 'root') {
                  const oldId = workspace.fileExplorer.id;
                  
                  // Update root node properties
                  workspace.fileExplorer.id = folderData.id;
                  workspace.fileExplorer.path = folderData.path || folderData.id; // Fallback if path missing
                  if (folderData.name) workspace.fileExplorer.name = folderData.name;

                  // Update dictionary
                  delete workspace.nodeIdToNode[oldId];
                  workspace.nodeIdToNode[folderData.id] = workspace.fileExplorer;
              }
          }

          // Find the folder node in the tree
          let folderNode = workspace.nodeIdToNode[folderData.id];
          
          if (!folderNode && (folderPath === '' || folderPath === '/')) {
              // Fallback: use root if ID mismatch or not found yet (should be covered above)
              folderNode = workspace.fileExplorer; 
          }

          if (!folderNode) {
            console.error(`Folder node not found for path: ${folderPath}`);
            return;
          }

          replaceFolderChildren(folderNode, folderData.children, workspace.nodeIdToNode);
        }
      } catch (error) {
        console.error('Error fetching folder children:', error);
      }
    },

    /**
     * Registers a skill workspace without persisting it to the backend database.
     * Starts with an empty tree. Live file watching is acquired only by a visible FileExplorer.
     * Returns the generated workspaceId.
     */
    registerSkillWorkspace(skillId: string): string {
        const workspaceId = `skill_ws_${skillId}`;
        const name = skillId; // Use ID as name for now

        if (this.workspaces[workspaceId]) {
            return workspaceId;
        }
        
        // Create a placeholder root node
        const rootNode = new TreeNode(name, "", false, [], "root", true);
        const nodeIdToNode = createNodeIdToNodeDictionary(rootNode);
        
        this.workspaces[workspaceId] = {
             workspaceId,
             name,
             fileExplorer: rootNode,
             nodeIdToNode,
             workspaceConfig: { isTransient: true },
             absolutePath: null, // Unknown until interactions happen, or not needed
        };

        // Trigger a fetch of the root children to populate the tree
        this.fetchFolderChildren(workspaceId, "");

        return workspaceId;
    },

    /**
     * Unregisters a skill workspace and cleans up connections.
     */
    unregisterSkillWorkspace(workspaceId: string) {
        if (!this.workspaces[workspaceId]) return;
        
        this.clearFileExplorerLiveSessionForWorkspace(workspaceId);
        delete this.workspaces[workspaceId];
        
        // Also cleanup file explorer state if any
        const fileExplorerStore = useFileExplorerStore();
        if (fileExplorerStore.fileExplorerStateByWorkspace.has(workspaceId)) {
            fileExplorerStore.fileExplorerStateByWorkspace.delete(workspaceId);
        }
    }
  },

  getters: {
    activeWorkspaceReference(): WorkspaceReference | null {
      const selectionStore = useAgentSelectionStore();
      const agentContextsStore = useAgentContextsStore();
      const teamContextsStore = useAgentTeamContextsStore();
      const agentRunConfigStore = useAgentRunConfigStore();
      const teamRunConfigStore = useTeamRunConfigStore();

      let reference: WorkspaceReference | null = null;
      let workspaceId: string | null = null;

      if (selectionStore.selectedType === 'agent') {
        const config = agentContextsStore.activeRun?.config || null;
        reference = config?.workspaceReference || null;
        workspaceId = config?.workspaceId || null;
      } else if (selectionStore.selectedType === 'team') {
        const teamContext = teamContextsStore.activeTeamContext;
        const focusedConfig = teamContext
          ? teamContext.leafAgentContextsByRouteKey.get(teamContext.focusedMemberRouteKey)?.config || null
          : null;
        reference = focusedConfig?.workspaceReference || teamContext?.config.workspaceReference || null;
        workspaceId = focusedConfig?.workspaceId || teamContext?.config.workspaceId || null;
      } else {
        const config = agentRunConfigStore.config || teamRunConfigStore.config || null;
        reference = config?.workspaceReference || null;
        workspaceId = config?.workspaceId || null;
      }

      if (reference) {
        return reference;
      }
      if (!workspaceId) {
        return null;
      }
      return this.workspaceReferencesById[workspaceId]
        || workspaceReferenceFromWorkspaceInfo(this.workspaces[workspaceId])
        || null;
    },

    activeWorkspace(): WorkspaceInfo | null {
      const workspaceId = this.activeWorkspaceReference?.workspaceId || null;
      return workspaceId ? this.workspaces[workspaceId] : null;
    },

    workspaceActivationState: (state) =>
      (referenceOrId: WorkspaceReference | string | null | undefined): WorkspaceActivationState => {
        const workspaceId = typeof referenceOrId === 'string'
          ? referenceOrId
          : referenceOrId?.workspaceId || '';
        if (!workspaceId) {
          return { status: 'uninitialized', error: null };
        }
        if (state.workspaces[workspaceId]) {
          return { status: 'initialized', error: null };
        }
        return state.workspaceActivationStateById[workspaceId] || {
          status: 'uninitialized',
          error: null,
        };
      },
    
    allWorkspaceIds: (state): string[] => Object.keys(state.workspaces),
    allWorkspaces: (state): WorkspaceInfo[] => Object.values(state.workspaces),
    
    tempWorkspaceId: (state): string | null => {
      // Find workspace with ID 'temp_ws_default' or where isTemp is true
      return Object.values(state.workspaces).find(w => w.workspaceId === 'temp_ws_default' || w.isTemp)?.workspaceId ?? null;
    },
    
    tempWorkspace: (state): WorkspaceInfo | null => {
       return Object.values(state.workspaces).find(w => w.workspaceId === 'temp_ws_default' || w.isTemp) || null;
    },
    
    currentWorkspaceTree(): TreeNode | null {
      return this.activeWorkspace ? this.activeWorkspace.fileExplorer : null;
    }
  }
});
