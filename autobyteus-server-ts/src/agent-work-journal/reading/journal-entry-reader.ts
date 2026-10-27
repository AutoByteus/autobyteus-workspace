/**
 * Reads a Work Journal file's entries (contract §2–§10 of the renderer): the one parser of the journal
 * format outside rendering. An entry starts at `[HH:MM:SS] ` (or `[--:--:--] ` when no time was
 * recorded) and ends before the next entry or day marker; a `[YYYY-MM-DD]` line marks a change of day.
 * The file's first day comes from the header's time range.
 */

/**
 * What an entry records: a `request` (the user's or a teammate's message), a `reply` (the agent's
 * text), an `action` (a tool call or result), a `notice` (a system notice), or a `note` (a fixed
 * line such as an interrupted turn, or a record type the renderer shows as is).
 */
export type JournalEntryKind = "request" | "reply" | "action" | "notice" | "note";

export type JournalEntry = Readonly<{
  kind: JournalEntryKind;
  /** 1-based line numbers in the file, inclusive. */
  lineStart: number;
  lineEnd: number;
  /** `YYYY-MM-DD` (UTC), or null when the file records no time. */
  day: string | null;
  /** The entry's head without its time: `User: …`, `Command: …`, `Agent:` and so on. */
  head: string;
  /** The entry's lines as written, time and indentation included. */
  text: string;
}>;

export type JournalReading = Readonly<{
  entries: readonly JournalEntry[];
  lineCount: number;
  /** Each day the file covers, with its first line (the first entry's line for the first day). */
  days: ReadonlyArray<Readonly<{ day: string; line: number }>>;
}>;

const ENTRY_START = /^\[(?:\d\d:\d\d:\d\d|--:--:--)\] /;
const DAY_MARKER = /^\[(\d{4}-\d\d-\d\d)\]$/;
/** `… · 2026-08-25 10:00 – 11:00 UTC · …` or `… · 2026-08-25 10:00 – 2026-08-26 01:00 UTC · …` */
const HEADER_FIRST_DAY = / · (\d{4}-\d\d-\d\d) \d\d:\d\d – /;

const kindOf = (head: string): JournalEntryKind => {
  if (head === "User:" || head.startsWith("User: ") || head.startsWith("Message from ")) return "request";
  if (head === "Agent:" || head.startsWith("Agent: ")) return "reply";
  if (head === "Notice:" || head.startsWith("Notice: ")) return "notice";
  if (head.startsWith("Turn interrupted") || head.startsWith("Record (")) return "note";
  return "action";
};

/** Splits a journal file into lines without the final empty line a trailing newline leaves. */
export const journalLines = (markdown: string): string[] => {
  const lines = markdown.split("\n");
  if (lines.length && lines[lines.length - 1] === "") lines.pop();
  return lines;
};

export const readJournalEntries = (markdown: string): JournalReading => {
  const lines = journalLines(markdown);
  let day = HEADER_FIRST_DAY.exec(lines[1] ?? "")?.[1] ?? null;
  const entries: JournalEntry[] = [];
  const days: Array<{ day: string; line: number }> = [];
  let open: { lineStart: number; lineEnd: number; day: string | null; head: string } | null = null;

  const close = (): void => {
    if (!open) return;
    entries.push({
      kind: kindOf(open.head),
      lineStart: open.lineStart,
      lineEnd: open.lineEnd,
      day: open.day,
      head: open.head,
      text: lines.slice(open.lineStart - 1, open.lineEnd).join("\n"),
    });
    open = null;
  };

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const marker = DAY_MARKER.exec(line);
    if (marker) {
      close();
      day = marker[1]!;
      days.push({ day, line: lineNumber });
      return;
    }
    if (ENTRY_START.test(line)) {
      close();
      if (day && !days.length) days.push({ day, line: lineNumber });
      open = { lineStart: lineNumber, lineEnd: lineNumber, day, head: line.slice(11) };
      return;
    }
    // A detail line of the open entry; blank lines between entries never extend it.
    if (open && line.trim()) open.lineEnd = lineNumber;
  });
  close();
  return { entries, lineCount: lines.length, days };
};
