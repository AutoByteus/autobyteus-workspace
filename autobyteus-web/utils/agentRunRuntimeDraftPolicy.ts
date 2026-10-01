/**
 * Antigravity always runs with auto-approve: its control is shown on and cannot be changed.
 * The server enforces this for every AGY run; this is the display and submit rule.
 */
export const isAutoApproveLockedForRuntime = (runtimeKind: string | null | undefined): boolean =>
  runtimeKind === 'antigravity_cli'

/** The auto-approve value to show and submit for a runtime: always on where it is locked. */
export const effectiveAutoExecuteTools = (runtimeKind: string | null | undefined, value: boolean): boolean =>
  isAutoApproveLockedForRuntime(runtimeKind) || value

/** New editable launch policy only; never apply to saved run hydration. */
export const autoExecuteForNewRuntimeSelection = (
  runtimeKind: string,
  previousValue: boolean,
): boolean => effectiveAutoExecuteTools(runtimeKind, previousValue)

export const withNewRuntimeOverridePolicy = <T extends { runtimeKind?: string; autoExecuteTools?: boolean }>(
  previous: T | null | undefined,
  next: T | null,
): T | null => {
  if (!next || !isAutoApproveLockedForRuntime(next.runtimeKind)
    || isAutoApproveLockedForRuntime(previous?.runtimeKind)) return next
  return { ...next, autoExecuteTools: true }
}
