import { defineStore } from 'pinia'
import { getApolloClient } from '~/utils/apolloClient'
import { CreateWorkspace } from '~/graphql/mutations/workspace_mutations'
import { GetAllWorkspaces } from '~/graphql/queries/workspace_queries'
import type {
  CreateWorkspaceMutation,
  CreateWorkspaceMutationVariables,
  GetAllWorkspacesQuery,
} from '~/generated/graphql'
import type { FileSystemChangeEvent } from '~/types/fileSystemChangeTypes'
import { useAgentSelectionStore } from '~/stores/agentSelectionStore'
import { useAgentContextsStore } from '~/stores/agentContextsStore'
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore'
import { useAgentRunConfigStore } from '~/stores/agentRunConfigStore'
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore'
import { useFileExplorerStore } from '~/stores/fileExplorer'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import type {
  WorkspaceMetadataLoadState,
  WorkspaceMetadata,
} from '~/types/workspace/WorkspaceMetadata'
import {
  createWorkspaceMetadata,
  normalizeWorkspaceRootPath as normalizeRootPath,
  workspaceMetadataFromWorkspaceInfo,
} from '~/utils/workspaceMetadata'
import {
  cacheWorkspaceMetadataForStore,
  ensureWorkspaceMetadataForStore,
  findWorkspaceInfoByRootPathForStore,
  registerWorkspaceInfoMetadataForStore,
  resolveWorkspaceMetadataByRootPathForStore,
} from '~/stores/workspaceMetadataActions'
import {
  acquireFileExplorerLiveSessionForStore,
  clearFileExplorerLiveSessionForWorkspaceForStore,
  connectFileExplorerLiveStreamForStore,
  disconnectAllFileExplorerLiveStreamsForStore,
  disconnectFileExplorerLiveStreamForStore,
  refreshFileExplorerSnapshotForStore,
  releaseFileExplorerLiveSessionForStore,
} from '~/stores/workspaceFileExplorerLiveActions'
import type { FetchFolderChildrenOptions } from '~/stores/fileExplorerTreeActions'
import type { FileExplorerStreamingService } from '~/services/fileExplorerStreaming/FileExplorerStreamingService'
import { removeWorkspaceForStore } from '~/stores/workspaceRemovalActions'

export interface WorkspaceInfo {
  workspaceId: string;
  name: string;
  displayName?: string;
  workspaceConfig: any;
  absolutePath: string | null;
  workspaceRootPath?: string | null;
  kind?: string;
  isTemp?: boolean;
}

interface WorkspaceState {
  workspaces: Record<string, WorkspaceInfo>;
  workspaceMetadataById: Record<string, WorkspaceMetadata>;
  workspaceMetadataIdsByRootPath: Record<string, string>;
  workspaceMetadataLoadStateById: Record<string, WorkspaceMetadataLoadState>;
  loading: boolean;
  error: any;
  workspacesFetched: boolean;
  fileSystemConnections: Map<string, FileExplorerStreamingService>;
  fileExplorerLiveConsumers: Map<string, Set<string>>;
  fileExplorerSnapshotRefreshes: Map<string, Promise<void>>;
  workspaceMetadataRegistrationTasks: Map<string, Promise<WorkspaceInfo>>;
}

const workspaceRootFromPayload = (workspace: any, fallbackRootPath?: string | null): string | null => (
  workspace?.workspaceRootPath
    ?? workspace?.absolutePath
    ?? workspace?.config?.rootPath
    ?? workspace?.config?.root_path
    ?? fallbackRootPath
    ?? null
);

const workspaceInfoFromPayload = (
  workspace: any,
  fallbackConfig: Record<string, unknown> = {},
  fallbackRootPath?: string | null,
): WorkspaceInfo => {
  const rootPath = workspaceRootFromPayload(workspace, fallbackRootPath);
  return {
    workspaceId: workspace.workspaceId,
    name: workspace.name || workspace.displayName || workspace.workspaceId,
    displayName: workspace.displayName || workspace.name || workspace.workspaceId,
    workspaceConfig: workspace.config || fallbackConfig,
    absolutePath: rootPath,
    workspaceRootPath: rootPath,
    kind: workspace.kind || 'filesystem',
    isTemp: workspace.isTemp ?? workspace.workspaceId === 'temp_ws_default',
  };
};

export const useWorkspaceStore = defineStore('workspace', {
  state: (): WorkspaceState => ({
    workspaces: {},
    workspaceMetadataById: {},
    workspaceMetadataIdsByRootPath: {},
    workspaceMetadataLoadStateById: {},
    loading: false,
    error: null,
    workspacesFetched: false,
    fileSystemConnections: new Map(),
    fileExplorerLiveConsumers: new Map(),
    fileExplorerSnapshotRefreshes: new Map(),
    workspaceMetadataRegistrationTasks: new Map(),
  }),
  actions: {
    cacheWorkspaceMetadata(metadata: WorkspaceMetadata | null | undefined) {
      cacheWorkspaceMetadataForStore(this, metadata);
    },

    registerWorkspaceInfoMetadata(workspace: WorkspaceInfo): WorkspaceMetadata | null {
      return registerWorkspaceInfoMetadataForStore(this, workspace) as WorkspaceMetadata | null;
    },

    findWorkspaceInfoByRootPath(rootPath: string): WorkspaceInfo | null {
      return findWorkspaceInfoByRootPathForStore(this, rootPath) as WorkspaceInfo | null;
    },

    async resolveWorkspaceMetadataByRootPath(
      rootPath: string | null | undefined,
    ): Promise<WorkspaceMetadata | null> {
      return resolveWorkspaceMetadataByRootPathForStore(this, rootPath);
    },

    async ensureWorkspaceMetadata(metadata: WorkspaceMetadata): Promise<WorkspaceInfo> {
      return ensureWorkspaceMetadataForStore(this, metadata) as Promise<WorkspaceInfo>;
    },

    removeWorkspaceEntriesByRootPath(rootPath: string | null | undefined) {
      const normalizedTarget = normalizeRootPath(rootPath);
      if (!normalizedTarget) {
        return;
      }

      for (const [workspaceId, workspace] of Object.entries(this.workspaces)) {
        const normalizedWorkspaceRoot = normalizeRootPath(
          workspace.absolutePath
            || workspace.workspaceRootPath
            || workspace.workspaceConfig?.root_path
            || workspace.workspaceConfig?.rootPath
            || null,
        );
        if (normalizedWorkspaceRoot === normalizedTarget) {
          this.removeWorkspaceEntryById(workspaceId);
        }
      }
    },

    removeWorkspaceEntryById(workspaceId: string) {
      const workspace = this.workspaces[workspaceId];
      const normalizedRoot = normalizeRootPath(
        workspace?.workspaceRootPath
          || workspace?.absolutePath
          || workspace?.workspaceConfig?.root_path
          || workspace?.workspaceConfig?.rootPath
          || null,
      );
      this.clearFileExplorerLiveSessionForWorkspace(workspaceId);
      useFileExplorerStore().fileExplorerStateByWorkspace.delete(workspaceId);
      delete this.workspaces[workspaceId];
      delete this.workspaceMetadataById[workspaceId];
      delete this.workspaceMetadataLoadStateById[workspaceId];
      if (normalizedRoot) {
        delete this.workspaceMetadataIdsByRootPath[normalizedRoot];
      }
    },

    async createWorkspace(config: { root_path: string }): Promise<string> {
      this.loading = true;
      this.error = null;
      const client = getApolloClient();
      try {
        const { data, errors } = await client.mutate<CreateWorkspaceMutation, CreateWorkspaceMutationVariables>({
          mutation: CreateWorkspace,
          variables: {
            input: {
              rootPath: config.root_path,
            },
          },
        });

        if (errors && errors.length > 0) {
          throw new Error(errors.map((e: { message: string }) => e.message).join(', '));
        }

        if (!data?.createWorkspace) {
          throw new Error('Failed to create workspace metadata: No data returned.');
        }

        const newWorkspace = data.createWorkspace as any;
        const rootPath = workspaceRootFromPayload(newWorkspace, config.root_path);
        this.removeWorkspaceEntriesByRootPath(rootPath);
        const workspaceInfo = workspaceInfoFromPayload(newWorkspace, config, rootPath);
        this.workspaces[workspaceInfo.workspaceId] = workspaceInfo;
        this.registerWorkspaceInfoMetadata(workspaceInfo);
        return workspaceInfo.workspaceId;
      } catch (e: any) {
        this.error = e;
        console.error('Error creating workspace metadata:', e);
        throw e;
      } finally {
        this.loading = false;
      }
    },

    async removeWorkspace(workspaceId: string): Promise<{ workspaceRootPath: string | null; message: string }> {
      this.loading = true;
      this.error = null;
      try {
        return await removeWorkspaceForStore(this, workspaceId);
      } catch (e: any) {
        this.error = e;
        console.error('Error removing workspace:', e);
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
        const windowNodeContextStore = useWindowNodeContextStore();
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

        const isReady = await windowNodeContextStore.waitForBoundBackendReady();
        if (!isReady) {
          throw new Error('Bound backend is not ready');
        }

        if (windowNodeContextStore.bindingRevision !== bindingRevisionAtStart) {
          console.warn(
            `[Workspace] Discarding workspace fetch because binding revision changed to ${windowNodeContextStore.bindingRevision}`,
          );
          return;
        }

        const client = getApolloClient();
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
            const workspaceInfo = workspaceInfoFromPayload(ws, ws.config || {});
            this.workspaces[workspaceInfo.workspaceId] = workspaceInfo;
            this.registerWorkspaceInfoMetadata(workspaceInfo);
          });
          this.workspacesFetched = true;
        }
      } catch (error: any) {
        console.error('Failed to fetch all workspace metadata:', error);
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
      this.workspaceMetadataById = {};
      this.workspaceMetadataIdsByRootPath = {};
      this.workspaceMetadataLoadStateById = {};
      this.workspaceMetadataRegistrationTasks.clear();
      this.workspacesFetched = false;
      this.loading = false;
      this.error = null;
      useFileExplorerStore().fileExplorerStateByWorkspace.clear();

      if (!reload) {
        return;
      }

      try {
        await this.fetchAllWorkspaces(true, bindingRevisionAtReset);
      } catch (error) {
        console.warn(
          `[Workspace] Failed to reload workspace metadata after backend context reset: ${String(error)}`,
        );
      }
    },

    handleFileSystemChange(
      workspaceId: string,
      event: FileSystemChangeEvent,
      source: 'mutation' | 'stream' = 'stream',
    ) {
      useFileExplorerStore().handleFileSystemChange(workspaceId, event, source);
    },

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

    async fetchFolderChildren(
      workspaceId: string,
      folderPath: string,
      options?: FetchFolderChildrenOptions,
    ): Promise<void> {
      await useFileExplorerStore().fetchFolderChildren(workspaceId, folderPath, options);
    },

    registerSkillWorkspace(skillId: string): string {
      const workspaceId = `skill_ws_${skillId}`;
      if (this.workspaces[workspaceId]) {
        return workspaceId;
      }

      const workspaceInfo: WorkspaceInfo = {
        workspaceId,
        name: skillId,
        displayName: skillId,
        workspaceConfig: { isTransient: true },
        absolutePath: null,
        workspaceRootPath: null,
        kind: 'skill',
        isTemp: false,
      };
      this.workspaces[workspaceId] = workspaceInfo;
      this.workspaceMetadataById[workspaceId] = createWorkspaceMetadata({
        workspaceId,
        workspaceRootPath: `/skills/${skillId}`,
        displayName: skillId,
        kind: 'skill',
      });
      return workspaceId;
    },

    unregisterSkillWorkspace(workspaceId: string) {
      if (!this.workspaces[workspaceId]) return;
      this.clearFileExplorerLiveSessionForWorkspace(workspaceId);
      delete this.workspaces[workspaceId];
      delete this.workspaceMetadataById[workspaceId];
      useFileExplorerStore().fileExplorerStateByWorkspace.delete(workspaceId);
    },
  },

  getters: {
    activeWorkspaceMetadata(): WorkspaceMetadata | null {
      const selectionStore = useAgentSelectionStore();
      const agentContextsStore = useAgentContextsStore();
      const teamContextsStore = useAgentTeamContextsStore();
      const agentRunConfigStore = useAgentRunConfigStore();
      const teamRunConfigStore = useTeamRunConfigStore();

      let metadata: WorkspaceMetadata | null = null;
      let workspaceId: string | null = null;

      if (selectionStore.selectedType === 'agent') {
        const config = agentContextsStore.activeRun?.config || null;
        metadata = config?.workspaceMetadata || null;
        workspaceId = config?.workspaceId || null;
      } else if (selectionStore.selectedType === 'team') {
        const teamContext = teamContextsStore.activeTeamContext;
        const focusedConfig = teamContextsStore.activeExecutionFocusedMemberContext?.config
          || null;
        const configuration = teamContext?.view.getConfigurationView() ?? null;
        metadata = focusedConfig?.workspaceMetadata || configuration?.workspaceMetadata || null;
        workspaceId = focusedConfig?.workspaceId || configuration?.workspaceId || null;
      } else {
        const config = agentRunConfigStore.config || teamRunConfigStore.config || null;
        metadata = config?.workspaceMetadata || null;
        workspaceId = config?.workspaceId || null;
      }

      if (metadata) {
        return metadata;
      }
      if (!workspaceId) {
        return null;
      }
      return this.workspaceMetadataById[workspaceId]
        || workspaceMetadataFromWorkspaceInfo(this.workspaces[workspaceId])
        || null;
    },

    activeWorkspace(): WorkspaceInfo | null {
      const workspaceId = this.activeWorkspaceMetadata?.workspaceId || null;
      return workspaceId ? this.workspaces[workspaceId] : null;
    },

    workspaceMetadataLoadState: (state) =>
      (metadataOrId: WorkspaceMetadata | string | null | undefined): WorkspaceMetadataLoadState => {
        const workspaceId = typeof metadataOrId === 'string'
          ? metadataOrId
          : metadataOrId?.workspaceId || '';
        if (!workspaceId) {
          return { status: 'unregistered', error: null };
        }
        if (state.workspaces[workspaceId]) {
          return { status: 'registered', error: null };
        }
        return state.workspaceMetadataLoadStateById[workspaceId] || {
          status: 'unregistered',
          error: null,
        };
      },

    allWorkspaceIds: (state): string[] => Object.keys(state.workspaces),
    allWorkspaces: (state): WorkspaceInfo[] => Object.values(state.workspaces),

    tempWorkspaceId: (state): string | null => {
      return Object.values(state.workspaces).find(w => w.workspaceId === 'temp_ws_default' || w.isTemp)?.workspaceId ?? null;
    },

    tempWorkspace: (state): WorkspaceInfo | null => {
      return Object.values(state.workspaces).find(w => w.workspaceId === 'temp_ws_default' || w.isTemp) || null;
    },
  },
});
