/**
 * Whether a workspace of this kind is a place to run (autobyteus-576 DEC-003): a folder on the node (`filesystem`) or
 * its temp workspace (`temp`). A skill's or a semantic memory folder's workspace is a view, never offered as a run's
 * workspace. The one rule for the run-history sidebar, the chat / Run Settings workspace menu and the mobile launch
 * picker.
 */
export const isRunnableWorkspaceKind = (kind: string): boolean => kind === 'filesystem' || kind === 'temp'
