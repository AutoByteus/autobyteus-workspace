/**
 * Contract §7: visible shortening. Short content is shown in full; long content keeps its start
 * (and, for output, its end) and marks the cut with the omitted size and a link to the raw record.
 */
export type WorkJournalLimits = Readonly<{
  /** Output longer than head + tail lines shows the first and last lines. */
  outputHeadLines: number;
  outputTailLines: number;
  diffLines: number;
  writeContentLines: number;
  argumentLines: number;
  /** A single line longer than this is cut. */
  lineChars: number;
}>;

export const DEFAULT_WORK_JOURNAL_LIMITS: WorkJournalLimits = Object.freeze({
  outputHeadLines: 20,
  outputTailLines: 20,
  diffLines: 40,
  writeContentLines: 20,
  argumentLines: 40,
  lineChars: 400,
});

/** Builds the link text of an omission marker, e.g. `[raw#rt_1](../raw_traces_active.jsonl#rt_1)`. */
export type RawRecordLink = () => string;

export const normalizeLineEndings = (text: string): string => text.replace(/\r\n/g, "\n");

/** Lines of a text; one trailing newline does not make an extra empty line. */
export const splitLines = (text: string): string[] => {
  const normalized = normalizeLineEndings(text);
  if (normalized.length === 0) return [];
  const lines = normalized.split("\n");
  if (lines.length > 1 && lines[lines.length - 1] === "") lines.pop();
  return lines;
};

/** Cuts one line longer than the limit, counting characters (not UTF-16 units). */
export const cutLongLine = (line: string, maxChars: number): string => {
  const characters = Array.from(line);
  if (characters.length <= maxChars) return line;
  return `${characters.slice(0, maxChars).join("")}…[+${characters.length - maxChars} chars]`;
};

/** Output (§7): in full up to head + tail lines, otherwise the first and last lines around a marker. */
export const shortenOutput = (lines: readonly string[], limits: WorkJournalLimits, link: RawRecordLink): string[] => {
  const cut = lines.map((line) => cutLongLine(line, limits.lineChars));
  if (cut.length <= limits.outputHeadLines + limits.outputTailLines) return cut;
  const omitted = cut.length - limits.outputHeadLines - limits.outputTailLines;
  return [
    ...cut.slice(0, limits.outputHeadLines),
    `…[${omitted} lines omitted; full output: ${link()}]`,
    ...cut.slice(cut.length - limits.outputTailLines),
  ];
};

/** Diffs, written content and long arguments (§7): the first lines, then a marker. */
export const shortenHead = (
  lines: readonly string[],
  maxLines: number,
  limits: WorkJournalLimits,
  link: RawRecordLink,
  unit: "diff lines" | "lines",
): string[] => {
  const cut = lines.map((line) => cutLongLine(line, limits.lineChars));
  if (cut.length <= maxLines) return cut;
  return [...cut.slice(0, maxLines), `…[${cut.length - maxLines} more ${unit}: ${link()}]`];
};
