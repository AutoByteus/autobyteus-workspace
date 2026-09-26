export const COMPACTION_SUMMARY_HEADINGS = [
  'Goal and constraints', 'Decisions and findings', 'Completed work',
  'Current state', 'Open work and next steps', 'Essential references',
] as const;

export class CompactionSummaryValidationError extends Error {
  readonly code = 'invalid_summary';
  constructor(message: string) { super(message); this.name = 'CompactionSummaryValidationError'; }
}

export const parseCompactionSummary = (content: string): string => {
  const open = '<compaction_summary>';
  const close = '</compaction_summary>';
  const fail = (message: string): never => { throw new CompactionSummaryValidationError(message); };
  if (content.split(open).length !== 2 || content.split(close).length !== 2) {
    fail('Expected exactly one complete compaction_summary block.');
  }
  const start = content.indexOf(open) + open.length;
  const end = content.indexOf(close);
  if (end < start) fail('Summary markers are out of order.');
  const body = content.slice(start, end).trim();
  if (!body) fail('Summary body is empty.');
  const headings = [...body.matchAll(/^## ([^\r\n]+)\r?$/gm)];
  if (headings.length !== COMPACTION_SUMMARY_HEADINGS.length ||
      headings.some((heading, i) => heading[1] !== COMPACTION_SUMMARY_HEADINGS[i])) {
    fail('Summary requires the six exact headings in the approved order.');
  }
  if (body.slice(0, headings[0]!.index).trim()) fail('Summary must begin with its first heading.');
  headings.forEach((heading, i) => {
    const section = body.slice(heading.index! + heading[0].length, headings[i + 1]?.index ?? body.length).trim();
    if (section !== '(none)' && !/^\s*[-*+]\s+\S/m.test(section)) {
      fail(`Summary section '${heading[1]}' requires specific bullets or (none).`);
    }
  });
  return body;
};
