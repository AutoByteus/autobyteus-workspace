import { runtimeKindToLabel } from '~/types/agent/AgentRunConfig'

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

// Compact runtime names shown next to a model name in the Chat footer and search results.
const RUNTIME_SHORT_LABELS: Record<string, string> = {
  autobyteus: 'AutoByteus',
  codex_app_server: 'Codex',
  claude_agent_sdk: 'Claude SDK',
  antigravity_cli: 'Antigravity',
  grok_build: 'Grok Build',
}

export const runtimeShortLabel = (runtimeKind: string): string =>
  RUNTIME_SHORT_LABELS[runtimeKind] ?? runtimeKindToLabel(runtimeKind)

export const isTemporaryRunId = (runId: string | null | undefined): boolean =>
  typeof runId === 'string' && runId.startsWith('temp-')

export const isAbsoluteFolderPath = (value: string): boolean => {
  const path = value.trim()
  return path.startsWith('/') || /^[A-Za-z]:[\\/]/.test(path) || path.startsWith('\\\\')
}
