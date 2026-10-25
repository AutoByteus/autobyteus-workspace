/**
 * Settings → Model Routing → "Agent runtimes now": the node's answer to "what can run here now", exactly as
 * `list_available_agent_runtimes` returns it (GraphQL `availableAgentRuntimes`, one JSON value).
 */

/** A runtime or provider value that could not be read, with its short reason. */
export type UnknownText = `unknown: ${string}`

export interface UsageLimitView {
  /** What it covers and its window: "Weekly", "Claude and GPT models · weekly". */
  name: string
  remainingPercent: number | null
  /** ISO-8601. */
  resetsAt: string | null
}

export interface ModelBlock {
  until: string | null
  /** A limit's name, or the provider's reason. */
  by: string
}

export interface AvailableModel {
  id: string
  name: string
  contextTokens?: number
  blocked?: ModelBlock
}

export interface ExternalAgentRuntimeEntry {
  runtime: 'codex_app_server' | 'claude_agent_sdk' | 'antigravity_cli' | 'grok_build'
  name: string
  signIn?: 'not checked'
  limits: UsageLimitView[] | 'not reported' | UnknownText
  limitsNote?: string
  models: AvailableModel[] | UnknownText
}

export interface AutoByteusProviderEntry {
  provider: string
  balance?: string
  blocked?: string
  limits?: 'not reported' | UnknownText
  /** `unknown: <reason>`: a custom endpoint whose models could not be read now. */
  models: AvailableModel[] | UnknownText
}

export interface AutoByteusEntry {
  runtime: 'autobyteus'
  name: 'AutoByteus'
  providers: AutoByteusProviderEntry[]
}

export type AvailableAgentRuntimeEntry = ExternalAgentRuntimeEntry | AutoByteusEntry

export interface AvailableAgentRuntimesReport {
  checkedAt: string
  agentRuntimes: AvailableAgentRuntimeEntry[]
}
