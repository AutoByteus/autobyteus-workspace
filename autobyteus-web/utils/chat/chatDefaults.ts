
/** The built-in agent that backs a New chat unless another agent or team is addressed. */
export const DEFAULT_CHAT_AGENT_DEFINITION_ID = 'autobyteus-daily-assistant'

/** The workspace a New chat uses unless another one is chosen. */
export const TEMP_WORKSPACE_ID = 'temp_ws_default'

export const CHAT_TITLE_MAX_LENGTH = 42

export const truncateChatTitle = (title: string): string => {
  const normalized = title.replace(/\s+/g, ' ').trim()
  return normalized.length > CHAT_TITLE_MAX_LENGTH
    ? `${normalized.slice(0, CHAT_TITLE_MAX_LENGTH - 1).trimEnd()}…`
    : normalized
}

export const isTemporaryRunId = (runId: string | null | undefined): boolean =>
  typeof runId === 'string' && runId.startsWith('temp-')

export const isAbsoluteFolderPath = (value: string): boolean => {
  const path = value.trim()
  return path.startsWith('/') || /^[A-Za-z]:[\\/]/.test(path) || path.startsWith('\\\\')
}
