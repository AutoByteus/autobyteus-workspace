/**
 * Contract §4 command equivalents: universal commands (`grep`, `find`, `ls`, `cat`, `sed -n`,
 * `head`, `tail`, `curl`) built from a built-in's recorded arguments, plus the one common
 * layout for numbered file lines (`cat -n`). Shared by every runtime translation.
 */

const BARE_WORD = /^[A-Za-z0-9_@%+=:,./~-]+$/;

/** A path or word: bare when safe, otherwise single-quoted. */
export const shellWord = (value: string): string =>
  BARE_WORD.test(value) ? value : `'${value.replace(/'/g, "'\\''")}'`;

/**
 * A pattern or option value, double-quoted as it would be typed: `"`, `$` and backtick are
 * escaped, and a backslash only where the shell would otherwise read it as an escape.
 */
export const shellQuoted = (value: string): string => {
  let quoted = "";
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index]!;
    const next = value[index + 1];
    if (char === "\"" || char === "$" || char === "`") quoted += `\\${char}`;
    else if (char === "\\" && (next === undefined || "\"$`\\".includes(next))) quoted += "\\\\";
    else quoted += char;
  }
  return `"${quoted}"`;
};

export const asText = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value : null;

export const asInteger = (value: unknown): number | null => {
  const number = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  return Number.isInteger(number) ? number : null;
};

export const isTrue = (value: unknown): boolean => value === true || value === "true";

/** A line range of a file; `to` null means "to the end". */
export type LineRange = Readonly<{ from: number; to: number | null }>;

const sedRange = (range: LineRange): string => `'${range.from},${range.to === null ? "$" : range.to}p'`;

/** `cat -n <path> | sed -n 'a,bp'` when numbered, `sed -n 'a,bp' <path>` or `cat <path>` otherwise. */
export const catCommand = (path: string, numbered: boolean, range: LineRange | null): string => {
  const file = shellWord(path);
  if (numbered) return range ? `cat -n ${file} | sed -n ${sedRange(range)}` : `cat -n ${file}`;
  return range ? `sed -n ${sedRange(range)} ${file}` : `cat ${file}`;
};

/** Claude-style `offset`/`limit` (1-based first line and line count) as a range. */
export const offsetLimitRange = (offset: unknown, limit: unknown): LineRange | null => {
  const from = asInteger(offset);
  const count = asInteger(limit);
  if (from !== null && count !== null) return { from, to: from + count - 1 };
  if (from !== null) return { from, to: null };
  if (count !== null) return { from: 1, to: count };
  return null;
};

/** Start/end line arguments as a range. */
export const startEndRange = (start: unknown, end: unknown): LineRange | null => {
  const from = asInteger(start);
  const to = asInteger(end);
  if (from === null && to === null) return null;
  return { from: from ?? 1, to };
};

const CLAUDE_NUMBERED = /^\s*(\d+)\t(.*)$/;
const AUTOBYTEUS_NUMBERED = /^(\d+):(?: (.*))?$/;

/** The `cat -n` layout: the number right-aligned in 6 columns, then a tab. */
const catNumberedLine = (number: string, text: string): string => `${number.padStart(6)}\t${text}`;

/**
 * Rewrites recorded numbered lines (`12\t…` or `12: …`) into the `cat -n` layout. Returns null
 * when the lines are not numbered.
 */
export const toCatNumberedLines = (lines: readonly string[]): string[] | null => {
  const content = lines.filter((line) => line.length > 0);
  if (!content.length) return null;
  for (const pattern of [CLAUDE_NUMBERED, AUTOBYTEUS_NUMBERED]) {
    if (content.every((line) => pattern.test(line))) {
      return lines.map((line) => {
        const match = pattern.exec(line);
        return match ? catNumberedLine(match[1]!, match[2] ?? "") : line;
      });
    }
  }
  return null;
};

/** Converts only the numbered lines and keeps any other line as recorded. */
export const toCatNumberedLinesLoose = (lines: readonly string[]): string[] => lines.map((line) => {
  const match = CLAUDE_NUMBERED.exec(line) ?? AUTOBYTEUS_NUMBERED.exec(line);
  return match ? catNumberedLine(match[1]!, match[2] ?? "") : line;
});

const globOption = (glob: string): string => glob.startsWith("!")
  ? `--exclude=${shellQuoted(glob.slice(1))}`
  : `--include=${shellQuoted(glob)}`;

/** Includes given as a list, or as one comma/space separated text. */
export const globList = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  const text = asText(value);
  return text ? text.split(/[,\s]+/).filter(Boolean) : [];
};

/**
 * Claude `Grep` / Grok `grep` (ripgrep options) as `grep`. `defaultMode` is the mode used when
 * `output_mode` is absent: files for Claude, content for Grok.
 */
export const ripgrepCommand = (args: Readonly<Record<string, unknown>>, defaultMode: "files_with_matches" | "content"): string => {
  const mode = asText(args.output_mode) ?? defaultMode;
  const modeFlag = mode === "content" ? (args["-n"] === false ? "" : "n") : mode === "count" ? "c" : "l";
  const options = [`-r${modeFlag}E`];
  if (isTrue(args["-i"])) options.push("-i");
  for (const key of ["-A", "-B", "-C"] as const) {
    const value = asInteger(args[key]);
    if (value !== null) options.push(`${key} ${value}`);
  }
  if (isTrue(args["-o"])) options.push("-o");
  const type = asText(args.type);
  if (type) options.push(`--include=${shellQuoted(`*.${type}`)}`);
  // A ripgrep `glob` text is one glob (`*.{ts,vue}` has a comma inside it), never a list.
  const globs = Array.isArray(args.glob) ? globList(args.glob) : [asText(args.glob)].filter((glob): glob is string => glob !== null);
  for (const glob of globs) options.push(globOption(glob));
  const pattern = typeof args.pattern === "string" ? args.pattern : "";
  let command = `grep ${options.join(" ")} ${shellQuoted(pattern)} ${shellWord(asText(args.path) ?? ".")}`;
  const offset = asInteger(args.offset);
  if (offset !== null && offset > 0) command += ` | tail -n +${offset + 1}`;
  const headLimit = asInteger(args.head_limit);
  if (headLimit !== null && headLimit > 0) command += ` | head -n ${headLimit}`;
  if (isTrue(args.multiline)) command += " (multiline)";
  return command;
};

export const curlCommand = (url: string | null): string => url ? `curl ${shellWord(url)}` : "curl (URL not recorded)";
