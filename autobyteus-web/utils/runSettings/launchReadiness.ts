import type { RunSettingsValues } from '~/types/runSettings/RunSettings'
import type { RunMemberNode } from '~/utils/runSettings/runMemberTree'

/**
 * One readiness rule for both start surfaces (DI-004): New chat (Agent and Team) and the Org launch
 * page. It reads the effective scopes of the `runMemberTree` projection: the start settings and
 * every member (placed teams and their members included). Pure: the caller supplies the runtime
 * availability and the localized copy.
 */
export type LaunchReadiness = Readonly<{ ready: true }> | Readonly<{ ready: false; reason: string }>

/** The effective scopes to check, or an Org whose topology cannot be launched. */
export type LaunchScopes =
  | Readonly<{ status: 'ready'; root: RunSettingsValues; members: readonly RunMemberNode[] }>
  | Readonly<{ status: 'blocked' }>

export interface LaunchReadinessInput {
  /** False when the chosen Agent, Team or Org no longer exists or cannot be read. */
  targetAvailable: boolean
  scopes: LaunchScopes
  /** Null while runtime availability is unknown: nothing is blocked on it then. */
  isRuntimeEnabled: ((runtimeKind: string) => boolean) | null
}

export interface LaunchReadinessCopy {
  /** The target is gone, or (Org only) its topology is broken: the user picks another target. */
  targetUnavailable: string
  runtimeUnavailable: (runtimeKind: string) => string
  chooseModel: string
}

const effectiveScopes = (root: RunSettingsValues, members: readonly RunMemberNode[]): RunSettingsValues[] => {
  const scopes = [root]
  const visit = (nodes: readonly RunMemberNode[]) => nodes.forEach((node) => {
    scopes.push(node.values)
    visit(node.children)
  })
  visit(members)
  return scopes
}

/**
 * Blocking reasons, in order (AC-002): the target is unavailable (or the Org topology is blocked) →
 * a scope's runtime is disabled → a scope has no model.
 */
export const resolveScopesReadiness = (input: LaunchReadinessInput, copy: LaunchReadinessCopy): LaunchReadiness => {
  if (!input.targetAvailable || input.scopes.status === 'blocked') return { ready: false, reason: copy.targetUnavailable }
  const scopes = effectiveScopes(input.scopes.root, input.scopes.members)
  const isRuntimeEnabled = input.isRuntimeEnabled
  const offRuntime = isRuntimeEnabled ? scopes.find((scope) => !isRuntimeEnabled(scope.runtimeKind)) : undefined
  if (offRuntime) return { ready: false, reason: copy.runtimeUnavailable(offRuntime.runtimeKind) }
  if (scopes.some((scope) => !scope.llmModelIdentifier.trim())) return { ready: false, reason: copy.chooseModel }
  return { ready: true }
}
