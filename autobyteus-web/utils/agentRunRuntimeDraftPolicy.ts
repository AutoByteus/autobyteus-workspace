/** New editable launch policy only; never apply to saved run hydration. */
export const autoExecuteForNewRuntimeSelection = (
  runtimeKind: string,
  previousValue: boolean,
): boolean => runtimeKind === 'antigravity_cli' ? true : previousValue

export const withNewRuntimeOverridePolicy = <T extends { runtimeKind?: string; autoExecuteTools?: boolean }>(
  previous: T | null | undefined,
  next: T | null,
): T | null => {
  if (!next || next.runtimeKind !== 'antigravity_cli' || previous?.runtimeKind === 'antigravity_cli') return next
  return { ...next, autoExecuteTools: true }
}
