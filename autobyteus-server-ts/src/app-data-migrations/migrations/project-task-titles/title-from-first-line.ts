/**
 * The title `project-task-titles` gives a Project Task saved before Tasks had titles (autobyteus-260, REQ-005): its
 * description's first non-empty line, trimmed; a line longer than 200 characters becomes its first 199 characters
 * plus "…", never ending on half of a surrogate pair. The cut applies only to these derived titles: a title written
 * by an agent or the user has no limit. Frozen with the migration so its plan stays the same for the same input;
 * current runtime code never imports it.
 */
export const DERIVED_TITLE_MAX_CHARS = 200;

const isHighSurrogate = (code: number): boolean => code >= 0xd800 && code <= 0xdbff;

/** The derived title, or null when the description has no non-empty line. */
export const titleFromFirstLine = (description: string): string | null => {
  const line = description.split("\n").map((candidate) => candidate.trim()).find((candidate) => candidate.length > 0);
  if (line === undefined) return null;
  if (line.length <= DERIVED_TITLE_MAX_CHARS) return line;
  const cut = line.slice(0, DERIVED_TITLE_MAX_CHARS - 1);
  return `${isHighSurrogate(cut.charCodeAt(cut.length - 1)) ? cut.slice(0, -1) : cut}…`;
};
