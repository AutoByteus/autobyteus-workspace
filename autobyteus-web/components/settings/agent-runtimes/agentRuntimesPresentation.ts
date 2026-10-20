import type { AgentRuntime } from '~/types/agentRuntimes'

/** The page's plain runtime names (product names, not translated); the model menu keeps its own labels. */
const RUNTIME_NAMES: Readonly<Record<string, string>> = {
  codex_app_server: 'Codex',
  claude_agent_sdk: 'Claude',
  antigravity_cli: 'Antigravity',
  grok_build: 'Grok',
}

export const runtimeName = (runtimeKind: string): string => RUNTIME_NAMES[runtimeKind] ?? runtimeKind

export const isUpdating = (runtime: AgentRuntime) =>
  runtime.operation?.kind === 'UPDATE' && runtime.operation.state === 'RUNNING'

export const isSigningIn = (runtime: AgentRuntime) =>
  runtime.operation?.kind === 'SIGN_IN' && runtime.operation.state === 'RUNNING'

export const updateFailed = (runtime: AgentRuntime) =>
  runtime.operation?.kind === 'UPDATE' && runtime.operation.state === 'FAILED'

/** Update is offered when a newer version exists, and as Try again after a failed update. */
export const offersUpdate = (runtime: AgentRuntime) =>
  runtime.installed && !isUpdating(runtime) && (runtime.updates.state === 'UPDATE_AVAILABLE' || updateFailed(runtime))

/** Update stays visible but does nothing while that runtime has running agents (DEC-003). */
export const isBlockedByAgents = (runtime: AgentRuntime) => offersUpdate(runtime) && runtime.runningAgentCount > 0

/** Sign in is offered for a signed-out runtime whose own login runs in the browser (Codex, Grok). */
export const offersSignIn = (runtime: AgentRuntime) =>
  runtime.installed && runtime.signInRoute === 'BROWSER' && runtime.account.state === 'SIGNED_OUT'
