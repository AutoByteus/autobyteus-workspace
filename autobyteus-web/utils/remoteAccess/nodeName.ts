/** What the phone page calls a node it knows no name for: never its address (autobyteus-433). */
export const UNNAMED_NODE_NAME = 'AutoByteus node';

/** A node's name on the phone page: the first non-blank candidate, in the caller's order, else "AutoByteus node". */
export const nodeNameOrDefault = (...names: Array<string | null | undefined>): string => {
  for (const name of names) {
    const trimmed = name?.trim();
    if (trimmed) return trimmed;
  }
  return UNNAMED_NODE_NAME;
};
