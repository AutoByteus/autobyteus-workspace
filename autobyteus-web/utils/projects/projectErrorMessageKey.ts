const PROJECT_ERROR_MESSAGE_KEYS: Readonly<Record<string, string>> = {
  PROJECT_NAME_REQUIRED: 'projects.errors.nameRequired',
  PROJECT_NAME_TAKEN: 'projects.errors.nameTaken',
  PROJECT_NOT_FOUND: 'projects.errors.projectNotFound',
  WORKSPACE_NOT_REGISTERED: 'projects.errors.workspaceNotRegistered',
  WORKSPACE_ALREADY_LINKED: 'projects.errors.workspaceAlreadyLinked',
  WORKSPACE_LINK_NOT_FOUND: 'projects.errors.workspaceLinkNotFound',
}

/** Translation key for a Project request failure; unknown failures use the generic key. */
export const projectErrorMessageKey = (error: unknown): string => {
  const code = (error as { code?: unknown } | null)?.code
  return (typeof code === 'string' && PROJECT_ERROR_MESSAGE_KEYS[code]) || 'projects.errors.requestFailed'
}
