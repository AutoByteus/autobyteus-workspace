/** Settings → Agent Runtimes: the coding-agent runtimes installed on the node this window is bound to. */

export type AgentRuntimeUpdateState = 'CHECKING' | 'UP_TO_DATE' | 'UPDATE_AVAILABLE' | 'CHECK_FAILED' | 'NOT_CHECKED'
/** `NOT_APPLICABLE`: not installed, or a Codex provider that needs no OpenAI sign-in. */
export type AgentRuntimeAccountState = 'CHECKING' | 'SIGNED_IN' | 'SIGNED_OUT' | 'UNKNOWN' | 'NOT_APPLICABLE'
/** BROWSER: the page starts the runtime's own login; COMMAND_LINE: the user signs in from its command line. */
export type AgentRuntimeSignInRoute = 'BROWSER' | 'COMMAND_LINE'
export type AgentRuntimeOperationKind = 'UPDATE' | 'SIGN_IN'
export type AgentRuntimeOperationState = 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'DID_NOT_FINISH'

/** A running or finished update or sign-in. `step`: the updater's latest line; `error`: its failure output. */
export interface AgentRuntimeOperation {
  kind: AgentRuntimeOperationKind
  state: AgentRuntimeOperationState
  command: string | null
  step: string | null
  fromVersion: string | null
  toVersion: string | null
  error: string | null
}

export interface AgentRuntime {
  /** `codex_app_server`, `claude_agent_sdk`, `antigravity_cli` or `grok_build`. */
  runtimeKind: string
  installed: boolean
  installedVersion: string | null
  updates: { state: AgentRuntimeUpdateState; latestVersion: string | null }
  account: { state: AgentRuntimeAccountState }
  signInRoute: AgentRuntimeSignInRoute
  installInstructionsUrl: string
  runningAgentCount: number
  operation: AgentRuntimeOperation | null
  /** ISO time this runtime's last check finished; null before the first one. */
  checkedAt: string | null
}
