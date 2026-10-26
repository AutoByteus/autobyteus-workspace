import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { JournalCard, JournalCardPart, JournalChunk, MemoryRun } from "../domain/memory-search-models.js";
import { toIndexText } from "../index/memory-text-normalizer.js";

/** A journal file the index holds: its content hash (to tell a change) and the days it covers. */
export type StoredJournalFile = Readonly<{ fileId: number; journalFile: string; contentSha256: string }>;

export type StoredCard = Readonly<{ id: string; runKey: string; journalFile: string; text: string; parts: readonly JournalCardPart[] }>;

/** A chunk the text index found, best first (BM25). */
export type TextCandidate = Readonly<{
  runKey: string;
  journalFile: string;
  lineStart: number;
  lineEnd: number;
  day: string | null;
}>;

const SCHEMA_VERSION = "1";
const SCHEMA = `
CREATE TABLE IF NOT EXISTS runs (run_key TEXT PRIMARY KEY, record TEXT NOT NULL, raw_fingerprint TEXT);
CREATE TABLE IF NOT EXISTS files (
  file_id INTEGER PRIMARY KEY, run_key TEXT NOT NULL, journal_file TEXT NOT NULL, content_sha256 TEXT NOT NULL,
  card_text TEXT NOT NULL, card_parts TEXT NOT NULL, UNIQUE (run_key, journal_file));
CREATE TABLE IF NOT EXISTS chunks (chunk_id INTEGER PRIMARY KEY, file_id INTEGER NOT NULL, line_start INTEGER NOT NULL, line_end INTEGER NOT NULL, day TEXT);
CREATE INDEX IF NOT EXISTS chunks_by_file ON chunks (file_id);
CREATE VIRTUAL TABLE IF NOT EXISTS chunk_text USING fts5(body, content='', contentless_delete=1, tokenize='unicode61');
CREATE VIRTUAL TABLE IF NOT EXISTS chunk_vocab USING fts5vocab(chunk_text, 'row');
CREATE TABLE IF NOT EXISTS state (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`;

/** A card's identity in the meaning index: its journal file's path relative to the memory folder. */
export const cardIdOf = (runKey: string, journalFile: string): string => `${runKey}/work_journal/${journalFile}`;

/**
 * `<appData>/memory-search/memory-search.sqlite` (derived, rebuildable): the runs the index knows, their
 * journal files with content hashes and cards, the chunk locations, a contentless FTS5 text index (no copy
 * of journal text) and the pipeline's state. A file that cannot be opened is deleted and created again; the
 * index then needs building. Outside the memory folder, so Memory Sync never copies it (AE-18).
 */
export class MemorySearchStore {
  private db: DatabaseSync | null = null;

  constructor(private readonly filePath: string) {}

  upsertRun(run: MemoryRun): void {
    this.open().prepare("INSERT INTO runs (run_key, record) VALUES (?, ?) ON CONFLICT (run_key) DO UPDATE SET record = excluded.record")
      .run(run.runKey, JSON.stringify(run));
  }

  listRuns(): Array<{ run: MemoryRun; rawFingerprint: string | null }> {
    const rows = this.open().prepare("SELECT record, raw_fingerprint FROM runs").all() as Array<{ record: string; raw_fingerprint: string | null }>;
    return rows.map((row) => ({ run: JSON.parse(row.record) as MemoryRun, rawFingerprint: row.raw_fingerprint }));
  }

  setRawFingerprint(runKey: string, fingerprint: string): void {
    this.open().prepare("UPDATE runs SET raw_fingerprint = ? WHERE run_key = ?").run(fingerprint, runKey);
  }

  removeRun(runKey: string): void {
    this.transaction((db) => {
      for (const file of this.journalFiles(runKey)) this.deleteFileRows(db, file.fileId);
      db.prepare("DELETE FROM runs WHERE run_key = ?").run(runKey);
    });
  }

  journalFiles(runKey: string): StoredJournalFile[] {
    const rows = this.open().prepare("SELECT file_id, journal_file, content_sha256 FROM files WHERE run_key = ?").all(runKey) as
      Array<{ file_id: number; journal_file: string; content_sha256: string }>;
    return rows.map((row) => ({ fileId: row.file_id, journalFile: row.journal_file, contentSha256: row.content_sha256 }));
  }

  /** Replaces one journal file's chunks and card in one transaction. */
  replaceJournalFile(input: { runKey: string; journalFile: string; contentSha256: string; chunks: readonly JournalChunk[]; card: JournalCard }): void {
    this.transaction((db) => {
      const existing = db.prepare("SELECT file_id FROM files WHERE run_key = ? AND journal_file = ?").get(input.runKey, input.journalFile) as { file_id: number } | undefined;
      if (existing) this.deleteChunks(db, existing.file_id);
      const fileId = existing?.file_id ?? Number(db.prepare(
        "INSERT INTO files (run_key, journal_file, content_sha256, card_text, card_parts) VALUES (?, ?, '', '', '[]')",
      ).run(input.runKey, input.journalFile).lastInsertRowid);
      db.prepare("UPDATE files SET content_sha256 = ?, card_text = ?, card_parts = ? WHERE file_id = ?")
        .run(input.contentSha256, input.card.text, JSON.stringify(input.card.parts), fileId);
      const insertChunk = db.prepare("INSERT INTO chunks (file_id, line_start, line_end, day) VALUES (?, ?, ?, ?)");
      const insertText = db.prepare("INSERT INTO chunk_text (rowid, body) VALUES (?, ?)");
      for (const chunk of input.chunks) {
        const chunkId = insertChunk.run(fileId, chunk.lineStart, chunk.lineEnd, chunk.day).lastInsertRowid;
        insertText.run(chunkId, toIndexText(chunk.text));
      }
    });
  }

  removeJournalFile(runKey: string, journalFile: string): void {
    const file = this.journalFiles(runKey).find((candidate) => candidate.journalFile === journalFile);
    if (file) this.transaction((db) => this.deleteFileRows(db, file.fileId));
  }

  /** Every card, for the meaning index (the complete set, always). */
  allCards(): StoredCard[] {
    const rows = this.open().prepare("SELECT run_key, journal_file, card_text, card_parts FROM files WHERE card_text <> ''").all() as
      Array<{ run_key: string; journal_file: string; card_text: string; card_parts: string }>;
    return rows.map((row) => ({
      id: cardIdOf(row.run_key, row.journal_file), runKey: row.run_key, journalFile: row.journal_file,
      text: row.card_text, parts: JSON.parse(row.card_parts) as JournalCardPart[],
    }));
  }

  card(runKey: string, journalFile: string): StoredCard | null {
    const row = this.open().prepare("SELECT card_text, card_parts FROM files WHERE run_key = ? AND journal_file = ?").get(runKey, journalFile) as
      { card_text: string; card_parts: string } | undefined;
    return row ? { id: cardIdOf(runKey, journalFile), runKey, journalFile, text: row.card_text, parts: JSON.parse(row.card_parts) as JournalCardPart[] } : null;
  }

  /** Chunks matching the FTS5 query, best first (BM25), at most `limit`. */
  textCandidates(ftsQuery: string, limit: number): TextCandidate[] {
    if (!ftsQuery) return [];
    const rows = this.open().prepare(`
      SELECT f.run_key, f.journal_file, c.line_start, c.line_end, c.day
      FROM chunk_text JOIN chunks c ON c.chunk_id = chunk_text.rowid JOIN files f ON f.file_id = c.file_id
      WHERE chunk_text MATCH ? ORDER BY bm25(chunk_text) LIMIT ?`).all(ftsQuery, limit) as
      Array<{ run_key: string; journal_file: string; line_start: number; line_end: number; day: string | null }>;
    return rows.map((row) => ({ runKey: row.run_key, journalFile: row.journal_file, lineStart: row.line_start, lineEnd: row.line_end, day: row.day }));
  }

  /** The days of a run's chunks: its first and latest. */
  runDays(runKey: string): { firstDay: string | null; latestDay: string | null } {
    const row = this.open().prepare(`SELECT MIN(c.day) AS first, MAX(c.day) AS latest FROM chunks c JOIN files f ON f.file_id = c.file_id WHERE f.run_key = ?`)
      .get(runKey) as { first: string | null; latest: string | null };
    return { firstDay: row.first, latestDay: row.latest };
  }

  /** How many chunks hold each token (the text index's own vocabulary; absent tokens are left out), and the chunk count. */
  tokenChunkCounts(tokens: readonly string[]): { counts: Map<string, number>; chunks: number } {
    const db = this.open();
    const distinct = [...new Set(tokens)];
    const rows = distinct.length
      ? db.prepare(`SELECT term, doc FROM chunk_vocab WHERE term IN (${distinct.map(() => "?").join(", ")})`).all(...distinct) as Array<{ term: string; doc: number }>
      : [];
    const chunks = Number((db.prepare("SELECT COUNT(*) AS n FROM chunks").get() as { n: number }).n);
    return { counts: new Map(rows.map((row) => [row.term, Number(row.doc)])), chunks };
  }

  counts(): { runs: number; journalFiles: number; chunks: number } {
    const count = (table: string): number => Number((this.open().prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n);
    return { runs: count("runs"), journalFiles: count("files"), chunks: count("chunks") };
  }

  getState(key: string): string | null {
    const row = this.open().prepare("SELECT value FROM state WHERE key = ?").get(key) as { value: string } | undefined;
    return row?.value ?? null;
  }

  setState(key: string, value: string | null): void {
    if (value === null) this.open().prepare("DELETE FROM state WHERE key = ?").run(key);
    else this.open().prepare("INSERT INTO state (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value").run(key, value);
  }

  /** Rebuild: drops everything the index holds. */
  clear(): void {
    this.close();
    this.deleteFiles();
    this.open();
  }

  close(): void {
    this.db?.close();
    this.db = null;
  }

  private open(): DatabaseSync {
    if (this.db) return this.db;
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    try {
      this.db = this.openChecked();
    } catch (error) {
      console.warn("MEMORY_SEARCH_STORE_UNREADABLE", { file: this.filePath, reason: error instanceof Error ? error.message : String(error) });
      this.deleteFiles();
      this.db = this.openChecked();
    }
    return this.db;
  }

  private openChecked(): DatabaseSync {
    const db = new DatabaseSync(this.filePath);
    try {
      db.exec("PRAGMA journal_mode = WAL");
      db.exec(SCHEMA);
      const version = db.prepare("SELECT value FROM state WHERE key = 'schema'").get() as { value: string } | undefined;
      if (version && version.value !== SCHEMA_VERSION) throw new Error(`unexpected schema ${version.value}`);
      if (!version) db.prepare("INSERT INTO state (key, value) VALUES ('schema', ?)").run(SCHEMA_VERSION);
      return db;
    } catch (error) {
      db.close();
      throw error;
    }
  }

  private deleteFiles(): void {
    for (const suffix of ["", "-wal", "-shm"]) fs.rmSync(this.filePath + suffix, { force: true });
  }

  private deleteChunks(db: DatabaseSync, fileId: number): void {
    db.prepare("DELETE FROM chunk_text WHERE rowid IN (SELECT chunk_id FROM chunks WHERE file_id = ?)").run(fileId);
    db.prepare("DELETE FROM chunks WHERE file_id = ?").run(fileId);
  }

  private deleteFileRows(db: DatabaseSync, fileId: number): void {
    this.deleteChunks(db, fileId);
    db.prepare("DELETE FROM files WHERE file_id = ?").run(fileId);
  }

  private transaction(work: (db: DatabaseSync) => void): void {
    const db = this.open();
    db.exec("BEGIN");
    try {
      work(db);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
}
