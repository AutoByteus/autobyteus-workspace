/** The one output contract shared by the cached summary request and the transcript fallback. */
export const COMPACTION_SUMMARY_HEADINGS = [
  'Task and constraints',
  'Requests and instructions received',
  'Decisions and findings',
  'Unverified points and open conflicts',
  'Files created or changed',
  'Completed work',
  'Current state',
  'Open work and next steps',
  'Essential references',
] as const;

export class CompactionSummaryValidationError extends Error {
  readonly code = 'invalid_summary';
  constructor(message: string) { super(message); this.name = 'CompactionSummaryValidationError'; }
}

const open = '<compaction_summary>';
const close = '</compaction_summary>';
/**
 * A section is recorded as empty when its first line starts with `(none)` or `(none` followed by
 * a space or dash, e.g. `(none) — read-only investigation` or `(none — read-only investigation)` (SR-012).
 */
const EMPTY_SECTION = /^\(none(\)|[\s\u2013\u2014-])/i;
const fail = (message: string): never => { throw new CompactionSummaryValidationError(message); };

export const validateCompactionSummaryBody = (content: string): string => {
  if (typeof content !== 'string') fail('Summary body must be a string.');
  const body = content.trim();
  if (!body) fail('Summary body is empty.');
  if (body.includes(open) || body.includes(close)) fail('Summary body must not contain envelope markers.');
  const headings = [...body.matchAll(/^## ([^\r\n]+)\r?$/gm)];
  if (headings.length !== COMPACTION_SUMMARY_HEADINGS.length ||
      headings.some((heading, i) => heading[1] !== COMPACTION_SUMMARY_HEADINGS[i])) {
    fail(`Summary requires the ${COMPACTION_SUMMARY_HEADINGS.length} exact headings in the approved order.`);
  }
  if (body.slice(0, headings[0]!.index).trim()) fail('Summary must begin with its first heading.');
  headings.forEach((heading, i) => {
    const section = body.slice(heading.index! + heading[0].length, headings[i + 1]?.index ?? body.length).trim();
    if (!EMPTY_SECTION.test(section.split(/\r?\n/, 1)[0]!) && !/^\s*[-*+]\s+\S/m.test(section)) {
      fail(`Summary section '${heading[1]}' requires specific bullets or (none).`);
    }
  });
  return body;
};

/**
 * Extracts and validates the summary of a provider reply (cached or transcript path): the inner
 * body of exactly one `<compaction_summary>` block, or, when the reply has neither marker, the
 * whole reply as the body (SR-011). Partial or repeated markers fail.
 */
export const parseCompactionSummary = (content: string): string => {
  if (typeof content === 'string' && !content.includes(open) && !content.includes(close)) {
    return validateCompactionSummaryBody(content);
  }
  if (typeof content !== 'string' || content.split(open).length !== 2 || content.split(close).length !== 2) {
    fail('Expected exactly one complete compaction_summary block.');
  }
  const start = content.indexOf(open) + open.length;
  const end = content.indexOf(close);
  if (end < start) fail('Summary markers are out of order.');
  return validateCompactionSummaryBody(content.slice(start, end));
};
