import { getApolloClient } from '~/utils/apolloClient';
import { GetWorkspaceReference } from '~/graphql/queries/workspace_queries';
import type {
  WorkspaceActivationState,
  WorkspaceReference,
} from '~/types/workspace/WorkspaceReference';
import {
  createWorkspaceReference,
  normalizeWorkspaceRootPath,
  workspaceReferenceFromWorkspaceInfo,
  workspaceReferenceKeyForRootPath,
} from '~/utils/workspaceReference';

interface WorkspaceInfoLike {
  workspaceId: string;
  name: string;
  absolutePath: string | null;
  workspaceConfig: any;
}

interface WorkspaceReferenceHost {
  workspaces: Record<string, WorkspaceInfoLike>;
  allWorkspaces: WorkspaceInfoLike[];
  workspaceReferencesById: Record<string, WorkspaceReference>;
  workspaceReferenceIdsByRootPath: Record<string, string>;
  workspaceActivationStateById: Record<string, WorkspaceActivationState>;
  workspaceActivationTasks: Map<string, Promise<WorkspaceInfoLike>>;
  createWorkspace(config: { root_path: string }): Promise<string>;
}

interface GetWorkspaceReferenceQueryData {
  workspaceReference: WorkspaceReference;
}

export const cacheWorkspaceReferenceForStore = (
  store: WorkspaceReferenceHost,
  reference: WorkspaceReference | null | undefined,
): void => {
  if (!reference?.workspaceId || !reference.workspaceRootPath) {
    return;
  }
  const normalizedReference = createWorkspaceReference({
    workspaceId: reference.workspaceId,
    workspaceRootPath: reference.workspaceRootPath,
    displayName: reference.displayName,
  });
  store.workspaceReferencesById[normalizedReference.workspaceId] = normalizedReference;
  store.workspaceReferenceIdsByRootPath[
    workspaceReferenceKeyForRootPath(normalizedReference.workspaceRootPath)
  ] = normalizedReference.workspaceId;
};

export const registerWorkspaceInfoReferenceForStore = (
  store: WorkspaceReferenceHost,
  workspace: WorkspaceInfoLike,
): WorkspaceReference | null => {
  const reference = workspaceReferenceFromWorkspaceInfo(workspace);
  if (!reference) {
    return null;
  }
  cacheWorkspaceReferenceForStore(store, reference);
  store.workspaceActivationStateById[reference.workspaceId] = {
    status: 'initialized',
    error: null,
  };
  return reference;
};

export const findWorkspaceInfoByRootPathForStore = (
  store: WorkspaceReferenceHost,
  rootPath: string,
): WorkspaceInfoLike | null => {
  const normalizedTarget = normalizeWorkspaceRootPath(rootPath);
  if (!normalizedTarget) {
    return null;
  }
  return store.allWorkspaces.find((workspace) => {
    const normalizedWorkspaceRoot = normalizeWorkspaceRootPath(
      workspace.absolutePath ||
        workspace.workspaceConfig?.root_path ||
        workspace.workspaceConfig?.rootPath ||
        null,
    );
    return normalizedWorkspaceRoot === normalizedTarget;
  }) || null;
};

export const resolveWorkspaceReferenceByRootPathForStore = async (
  store: WorkspaceReferenceHost,
  rootPath: string | null | undefined,
): Promise<WorkspaceReference | null> => {
  const normalizedRootPath = normalizeWorkspaceRootPath(rootPath);
  if (!normalizedRootPath) {
    return null;
  }

  const initializedWorkspace = findWorkspaceInfoByRootPathForStore(store, normalizedRootPath);
  if (initializedWorkspace) {
    return registerWorkspaceInfoReferenceForStore(store, initializedWorkspace);
  }

  const rootKey = workspaceReferenceKeyForRootPath(normalizedRootPath);
  const cachedId = store.workspaceReferenceIdsByRootPath[rootKey];
  const cachedReference = cachedId ? store.workspaceReferencesById[cachedId] : null;
  if (cachedReference) {
    return cachedReference;
  }

  const client = getApolloClient();
  const { data, errors } = await client.query<GetWorkspaceReferenceQueryData>({
    query: GetWorkspaceReference,
    variables: { rootPath: normalizedRootPath },
    fetchPolicy: 'network-only',
  });
  if (errors && errors.length > 0) {
    throw new Error(errors.map((e: { message: string }) => e.message).join(', '));
  }
  const reference = data?.workspaceReference
    ? createWorkspaceReference(data.workspaceReference)
    : null;
  cacheWorkspaceReferenceForStore(store, reference);
  return reference;
};

export const ensureWorkspaceInitializedForStore = async (
  store: WorkspaceReferenceHost,
  reference: WorkspaceReference,
): Promise<WorkspaceInfoLike> => {
  cacheWorkspaceReferenceForStore(store, reference);
  const existingWorkspace = store.workspaces[reference.workspaceId];
  if (existingWorkspace) {
    store.workspaceActivationStateById[reference.workspaceId] = {
      status: 'initialized',
      error: null,
    };
    return existingWorkspace;
  }

  const existingTask = store.workspaceActivationTasks.get(reference.workspaceId);
  if (existingTask) {
    return existingTask;
  }

  store.workspaceActivationStateById[reference.workspaceId] = {
    status: 'activating',
    error: null,
  };
  const activationTask = (async () => {
    try {
      const workspaceId = await store.createWorkspace({ root_path: reference.workspaceRootPath });
      if (workspaceId !== reference.workspaceId) {
        throw new Error(
          `Workspace activation returned '${workspaceId}' for reference '${reference.workspaceId}'.`,
        );
      }
      const workspace = store.workspaces[workspaceId];
      if (!workspace) {
        throw new Error(`Workspace '${workspaceId}' was not available after activation.`);
      }
      store.workspaceActivationStateById[reference.workspaceId] = {
        status: 'initialized',
        error: null,
      };
      return workspace;
    } catch (error: any) {
      store.workspaceActivationStateById[reference.workspaceId] = {
        status: 'error',
        error: error?.message || String(error),
      };
      throw error;
    } finally {
      store.workspaceActivationTasks.delete(reference.workspaceId);
    }
  })();
  store.workspaceActivationTasks.set(reference.workspaceId, activationTask);
  return activationTask;
};
