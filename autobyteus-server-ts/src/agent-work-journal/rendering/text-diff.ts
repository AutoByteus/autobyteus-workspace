import { splitLines } from "./output-shortener.js";

/** Diff lines (` ` unchanged, `-` removed, `+` added) and the change size of an edit. */
export type TextDiff = Readonly<{ lines: string[]; added: number; removed: number }>;

/** Above this many old × new middle lines, the middle is shown as removed then added. */
const MAX_LCS_CELLS = 1_000_000;

const lcsDiff = (oldLines: readonly string[], newLines: readonly string[]): string[] => {
  const rows = oldLines.length;
  const cols = newLines.length;
  if (rows * cols > MAX_LCS_CELLS) {
    return [...oldLines.map((line) => `-${line}`), ...newLines.map((line) => `+${line}`)];
  }
  const table: number[][] = Array.from({ length: rows + 1 }, () => new Array<number>(cols + 1).fill(0));
  for (let row = rows - 1; row >= 0; row -= 1) {
    for (let col = cols - 1; col >= 0; col -= 1) {
      table[row]![col] = oldLines[row] === newLines[col]
        ? table[row + 1]![col + 1]! + 1
        : Math.max(table[row + 1]![col]!, table[row]![col + 1]!);
    }
  }
  const lines: string[] = [];
  let row = 0;
  let col = 0;
  while (row < rows && col < cols) {
    if (oldLines[row] === newLines[col]) {
      lines.push(` ${oldLines[row]}`);
      row += 1;
      col += 1;
    } else if (table[row + 1]![col]! >= table[row]![col + 1]!) {
      lines.push(`-${oldLines[row]}`);
      row += 1;
    } else {
      lines.push(`+${newLines[col]}`);
      col += 1;
    }
  }
  for (; row < rows; row += 1) lines.push(`-${oldLines[row]}`);
  for (; col < cols; col += 1) lines.push(`+${newLines[col]}`);
  return lines;
};

/** A line diff of an edit's old and new text; unchanged lines of the snippet stay as context. */
export const diffTexts = (oldText: string, newText: string): TextDiff => {
  const oldLines = splitLines(oldText);
  const newLines = splitLines(newText);
  let prefix = 0;
  while (prefix < oldLines.length && prefix < newLines.length && oldLines[prefix] === newLines[prefix]) prefix += 1;
  let suffix = 0;
  while (
    suffix < oldLines.length - prefix && suffix < newLines.length - prefix &&
    oldLines[oldLines.length - 1 - suffix] === newLines[newLines.length - 1 - suffix]
  ) suffix += 1;
  const lines = [
    ...oldLines.slice(0, prefix).map((line) => ` ${line}`),
    ...lcsDiff(oldLines.slice(prefix, oldLines.length - suffix), newLines.slice(prefix, newLines.length - suffix)),
    ...oldLines.slice(oldLines.length - suffix).map((line) => ` ${line}`),
  ];
  return {
    lines,
    added: lines.filter((line) => line.startsWith("+")).length,
    removed: lines.filter((line) => line.startsWith("-")).length,
  };
};

export type PatchDiff = TextDiff & Readonly<{ hasHunks: boolean }>;

/**
 * A recorded unified patch (Codex and AutoByteus `edit_file`). File headers and the first hunk
 * header are not shown; later hunk headers become `…`.
 */
export const readPatch = (patch: string): PatchDiff => {
  const lines: string[] = [];
  let added = 0;
  let removed = 0;
  let hunks = 0;
  for (const line of splitLines(patch)) {
    if (line.startsWith("@@")) {
      hunks += 1;
      if (hunks > 1) lines.push("…");
      continue;
    }
    // File headers come only before the first hunk; inside a hunk `--- x` removes the line `-- x`.
    if (hunks === 0 && (line.startsWith("+++ ") || line.startsWith("--- "))) continue;
    if (line.startsWith("+")) added += 1;
    else if (line.startsWith("-")) removed += 1;
    lines.push(line);
  }
  return { lines, added, removed, hasHunks: hunks > 0 };
};
