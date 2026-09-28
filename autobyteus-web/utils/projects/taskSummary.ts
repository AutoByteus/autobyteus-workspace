/** A Task's summary: the first non-empty line of its description, trimmed. Never stored. */
export const taskSummary = (description: string): string =>
  description.split(/\r?\n/).map((line) => line.trim()).find((line) => line.length > 0) ?? ''
