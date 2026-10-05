/**
 * Where a new run's files live, chosen before it starts: a known workspace, or a folder path that
 * becomes a workspace when the run starts. It is the only workspace shape in start drafts
 * (New chat, the Org launch page), the run-settings views and the member tree.
 */
export type RunWorkspaceChoice =
  | Readonly<{ kind: 'existing'; workspaceId: string }>
  | Readonly<{ kind: 'folder'; rootPath: string }>
