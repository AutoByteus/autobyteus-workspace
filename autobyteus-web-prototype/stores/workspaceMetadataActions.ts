import { getApolloClient } from '~/utils/apolloClient';
import { GetWorkspaceMetadata } from '~/graphql/queries/workspace_queries';
import type {
  WorkspaceMetadataLoadState,
  WorkspaceMetadata,
} from '~/types/workspace/WorkspaceMetadata';
import {
  createWorkspaceMetadata,
  normalizeWorkspaceRootPath,
  workspaceMetadataFromWorkspaceInfo,
  workspaceMetadataKeyForRootPath,
} from '~/utils/workspaceMetadata';

interface WorkspaceInfoLike {
  workspaceId: string;
  name: string;
  absolutePath: string | null;
  workspaceRootPath?: string | null;
  kind?: string | null;
  workspaceConfig: any;
}

interface WorkspaceMetadataHost {
  workspaces: Record<string, WorkspaceInfoLike>;
  allWorkspaces: WorkspaceInfoLike[];
  workspaceMetadataById: Record<string, WorkspaceMetadata>;
  workspaceMetadataIdsByRootPath: Record<string, string>;
  workspaceMetadataLoadStateById: Record<string, WorkspaceMetadataLoadState>;
  workspaceMetadataRegistrationTasks: Map<string, Promise<WorkspaceInfoLike>>;
  createWorkspace(config: { root_path: string }): Promise<string>;
}

interface GetWorkspaceMetadataQueryData {
  workspaceMetadata: WorkspaceMetadata;
}

export const cacheWorkspaceMetadataForStore = (
  store: WorkspaceMetadataHost,
  metadata: WorkspaceMetadata | null | undefined,
): void => {
  if (!metadata?.workspaceId || !metadata.workspaceRootPath) {
    return;
  }
  const normalizedMetadata = createWorkspaceMetadata({
    workspaceId: metadata.workspaceId,
    workspaceRootPath: metadata.workspaceRootPath,
    displayName: metadata.displayName,
    kind: metadata.kind,
  });
  store.workspaceMetadataById[normalizedMetadata.workspaceId] = normalizedMetadata;
  store.workspaceMetadataIdsByRootPath[
    workspaceMetadataKeyForRootPath(normalizedMetadata.workspaceRootPath)
  ] = normalizedMetadata.workspaceId;
};

export const registerWorkspaceInfoMetadataForStore = (
  store: WorkspaceMetadataHost,
  workspace: WorkspaceInfoLike,
): WorkspaceMetadata | null => {
  const metadata = workspaceMetadataFromWorkspaceInfo(workspace);
  if (!metadata) {
    return null;
  }
  cacheWorkspaceMetadataForStore(store, metadata);
  store.workspaceMetadataLoadStateById[metadata.workspaceId] = {
    status: 'registered',
    error: null,
  };
  return metadata;
};

export const findWorkspaceInfoByRootPathForStore = (
  store: WorkspaceMetadataHost,
  rootPath: string,
): WorkspaceInfoLike | null => {
  const normalizedTarget = normalizeWorkspaceRootPath(rootPath);
  if (!normalizedTarget) {
    return null;
  }
  return store.allWorkspaces.find((workspace) => {
    const normalizedWorkspaceRoot = normalizeWorkspaceRootPath(
      workspace.workspaceRootPath ||
        workspace.absolutePath ||
        workspace.workspaceConfig?.root_path ||
        workspace.workspaceConfig?.rootPath ||
        null,
    );
    return normalizedWorkspaceRoot === normalizedTarget;
  }) || null;
};

export const resolveWorkspaceMetadataByRootPathForStore = async (
  store: WorkspaceMetadataHost,
  rootPath: string | null | undefined,
): Promise<WorkspaceMetadata | null> => {
  const normalizedRootPath = normalizeWorkspaceRootPath(rootPath);
  if (!normalizedRootPath) {
    return null;
  }

  const registeredWorkspace = findWorkspaceInfoByRootPathForStore(store, normalizedRootPath);
  if (registeredWorkspace) {
    return registerWorkspaceInfoMetadataForStore(store, registeredWorkspace);
  }

  const rootKey = workspaceMetadataKeyForRootPath(normalizedRootPath);
  const cachedId = store.workspaceMetadataIdsByRootPath[rootKey];
  const cachedMetadata = cachedId ? store.workspaceMetadataById[cachedId] : null;
  if (cachedMetadata) {
    return cachedMetadata;
  }

  const client = getApolloClient();
  const { data, errors } = await client.query<GetWorkspaceMetadataQueryData>({
    query: GetWorkspaceMetadata,
    variables: { rootPath: normalizedRootPath },
    fetchPolicy: 'network-only',
  });
  if (errors && errors.length > 0) {
    throw new Error(errors.map((e: { message: string }) => e.message).join(', '));
  }
  const metadata = data?.workspaceMetadata
    ? createWorkspaceMetadata(data.workspaceMetadata)
    : null;
  cacheWorkspaceMetadataForStore(store, metadata);
  return metadata;
};

export const ensureWorkspaceMetadataForStore = async (
  store: WorkspaceMetadataHost,
  metadata: WorkspaceMetadata,
): Promise<WorkspaceInfoLike> => {
  cacheWorkspaceMetadataForStore(store, metadata);
  const existingWorkspace = store.workspaces[metadata.workspaceId];
  if (existingWorkspace) {
    store.workspaceMetadataLoadStateById[metadata.workspaceId] = {
      status: 'registered',
      error: null,
    };
    return existingWorkspace;
  }

  const existingTask = store.workspaceMetadataRegistrationTasks.get(metadata.workspaceId);
  if (existingTask) {
    return existingTask;
  }

  store.workspaceMetadataLoadStateById[metadata.workspaceId] = {
    status: 'registering',
    error: null,
  };
  const registrationTask = (async () => {
    try {
      const workspaceId = await store.createWorkspace({ root_path: metadata.workspaceRootPath });
      if (workspaceId !== metadata.workspaceId) {
        throw new Error(
          `Workspace metadata registration returned '${workspaceId}' for metadata '${metadata.workspaceId}'.`,
        );
      }
      const workspace = store.workspaces[workspaceId];
      if (!workspace) {
        throw new Error(`Workspace '${workspaceId}' was not available after metadata registration.`);
      }
      store.workspaceMetadataLoadStateById[metadata.workspaceId] = {
        status: 'registered',
        error: null,
      };
      return workspace;
    } catch (error: any) {
      store.workspaceMetadataLoadStateById[metadata.workspaceId] = {
        status: 'error',
        error: error?.message || String(error),
      };
      throw error;
    } finally {
      store.workspaceMetadataRegistrationTasks.delete(metadata.workspaceId);
    }
  })();
  store.workspaceMetadataRegistrationTasks.set(metadata.workspaceId, registrationTask);
  return registrationTask;
};
