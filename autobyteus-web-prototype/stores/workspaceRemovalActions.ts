import { getApolloClient } from '~/utils/apolloClient';
import { RemoveWorkspace } from '~/graphql/mutations/workspace_mutations';

interface WorkspaceRemovalStoreLike {
  error: any;
  workspaces: Record<string, { workspaceRootPath?: string | null; absolutePath?: string | null }>;
  removeWorkspaceEntryById(workspaceId: string): void;
}

interface RemoveWorkspaceMutationData {
  removeWorkspace: {
    success: boolean;
    message: string;
    workspaceId: string;
    workspaceRootPath?: string | null;
  };
}

interface RemoveWorkspaceMutationVariables {
  input: { workspaceId: string };
}

export const removeWorkspaceForStore = async (
  store: WorkspaceRemovalStoreLike,
  workspaceId: string,
): Promise<{ workspaceRootPath: string | null; message: string }> => {
  const client = getApolloClient();
  const { data, errors } = await client.mutate<RemoveWorkspaceMutationData, RemoveWorkspaceMutationVariables>({
    mutation: RemoveWorkspace,
    variables: { input: { workspaceId } },
  });
  if (errors && errors.length > 0) {
    throw new Error(errors.map((e: { message: string }) => e.message).join(', '));
  }
  const result = data?.removeWorkspace;
  if (!result) {
    throw new Error('Failed to remove workspace: No data returned.');
  }
  if (!result.success) {
    throw new Error(result.message || 'Workspace could not be removed.');
  }
  const workspaceRootPath = result.workspaceRootPath
    || store.workspaces[result.workspaceId]?.workspaceRootPath
    || store.workspaces[result.workspaceId]?.absolutePath
    || null;
  store.removeWorkspaceEntryById(result.workspaceId);
  return { workspaceRootPath, message: result.message };
};
