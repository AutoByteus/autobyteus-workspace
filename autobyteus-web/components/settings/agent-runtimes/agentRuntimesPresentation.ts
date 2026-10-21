import type { AgentRuntime } from '~/types/agentRuntimes'

/** The page's plain runtime names (product names, not translated); the model menu keeps its own labels. */
const RUNTIME_NAMES: Readonly<Record<string, string>> = {
  codex_app_server: 'Codex',
  claude_agent_sdk: 'Claude',
  antigravity_cli: 'Antigravity',
  grok_build: 'Grok',
}

export const runtimeName = (runtimeKind: string): string => RUNTIME_NAMES[runtimeKind] ?? runtimeKind

/**
 * What this window may do with the bound node's runtimes. `own`: the desktop's own node. `remoteDesktop`: a remote node
 * whose server can open a browser on its own desktop (a Docker node's VNC Chromium). `remoteStatusOnly`: one that cannot.
 */
export type AgentRuntimeNodeAccess = 'own' | 'remoteDesktop' | 'remoteStatusOnly'

/** Update runs only on the desktop's own node: a Docker node's runtimes live in its image (D-3, DEC-006). */
export const canUpdateHere = (access: AgentRuntimeNodeAccess) => access === 'own'

/** Sign in runs where its browser can open: the own node, or a remote node with a desktop browser (DEC-002, DEC-003). */
export const canSignInHere = (access: AgentRuntimeNodeAccess) => access !== 'remoteStatusOnly'

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
