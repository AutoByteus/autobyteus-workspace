/** What changed between the tool names a run saw and the names it has (or will have) now. */
export type ToolListDiff = Readonly<{
  added: readonly string[];
  removed: readonly string[];
}>;

/** The added and removed names, each sorted; null when the two lists hold the same names. */
export const diffToolNames = (
  seen: readonly string[],
  current: readonly string[],
): ToolListDiff | null => {
  const seenSet = new Set(seen);
  const currentSet = new Set(current);
  const added = [...currentSet].filter((name) => !seenSet.has(name)).sort();
  const removed = [...seenSet].filter((name) => !currentSet.has(name)).sort();
  if (added.length === 0 && removed.length === 0) return null;
  return Object.freeze({ added: Object.freeze(added), removed: Object.freeze(removed) });
};
