import type { JournalEntry } from "../../agent-work-journal/reading/journal-entry-reader.js";
import type { JournalChunk } from "../domain/memory-search-models.js";

/** Most characters of one chunk (DEC-002; report § 5). */
export const JOURNAL_CHUNK_MAX_CHARACTERS = 2_000;

type Piece = { lineStart: number; lineEnd: number; day: string | null; text: string };

/** An entry longer than the limit is split by its lines (a single longer line is cut). */
const entryPieces = (entry: JournalEntry): Piece[] => {
  if (entry.text.length <= JOURNAL_CHUNK_MAX_CHARACTERS) return [{ lineStart: entry.lineStart, lineEnd: entry.lineEnd, day: entry.day, text: entry.text }];
  const pieces: Piece[] = [];
  let open: Piece | null = null;
  entry.text.split("\n").forEach((line, index) => {
    const lineNumber = entry.lineStart + index;
    const text = line.slice(0, JOURNAL_CHUNK_MAX_CHARACTERS);
    if (open && open.text.length + 1 + text.length > JOURNAL_CHUNK_MAX_CHARACTERS) {
      pieces.push(open);
      open = null;
    }
    if (!open) open = { lineStart: lineNumber, lineEnd: lineNumber, day: entry.day, text };
    else {
      open.text += `\n${text}`;
      open.lineEnd = lineNumber;
    }
  });
  if (open) pieces.push(open);
  return pieces;
};

/**
 * Groups a journal file's entries into chunks of whole entries, at most 2,000 characters each and of one
 * day, in file order. Each chunk keeps its line range and its day.
 */
export const chunkJournalEntries = (entries: readonly JournalEntry[]): JournalChunk[] => {
  const chunks: JournalChunk[] = [];
  let open: Piece | null = null;
  for (const piece of entries.flatMap(entryPieces)) {
    // A chunk holds one day, so its pointer's day is exact.
    if (open && (open.text.length + 1 + piece.text.length > JOURNAL_CHUNK_MAX_CHARACTERS || open.day !== piece.day)) {
      chunks.push(open);
      open = null;
    }
    if (!open) open = { ...piece };
    else {
      open.text += `\n${piece.text}`;
      open.lineEnd = piece.lineEnd;
    }
  }
  if (open) chunks.push(open);
  return chunks;
};
