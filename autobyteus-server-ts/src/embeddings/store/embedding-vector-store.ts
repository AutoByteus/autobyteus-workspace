import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

export type StoredVector = { fingerprint: string; vector: Float32Array };
export type VectorRow = StoredVector & { id: string };

const TABLE = "embedding_vectors";
const COLUMNS = ["collection", "item_id", "model_id", "fingerprint", "vector"];
const CREATE = `CREATE TABLE IF NOT EXISTS ${TABLE} (collection TEXT NOT NULL, item_id TEXT NOT NULL, model_id TEXT NOT NULL,
  fingerprint TEXT NOT NULL, vector BLOB NOT NULL, PRIMARY KEY (collection, item_id))`;

const toBlob = (vector: Float32Array): Uint8Array => new Uint8Array(vector.buffer, vector.byteOffset, vector.byteLength);
const fromBlob = (blob: Uint8Array): Float32Array => {
  // Copy into an aligned buffer: a BLOB view may start at any byte offset.
  const bytes = Uint8Array.from(blob);
  return new Float32Array(bytes.buffer, 0, bytes.byteLength / 4);
};

/**
 * The derived vector file `<appData>/embeddings/embeddings.sqlite`: vectors by collection, item and model, with the
 * fingerprint of the text they were made from. It is a disposable cache: a file that cannot be opened, or whose table
 * is not the current shape, is renamed aside (`.unreadable-<time>`, logged) and recreated. No Task text is stored.
 */
export class EmbeddingVectorStore {
  private db: DatabaseSync | null = null;

  constructor(private readonly filePath: string) {}

  /** The active model's vectors of one collection. */
  read(collection: string, modelId: string): Map<string, StoredVector> {
    const rows = this.open().prepare(`SELECT item_id, fingerprint, vector FROM ${TABLE} WHERE collection = ? AND model_id = ?`)
      .all(collection, modelId) as Array<{ item_id: string; fingerprint: string; vector: Uint8Array }>;
    return new Map(rows.map((row) => [row.item_id, { fingerprint: row.fingerprint, vector: fromBlob(row.vector) }]));
  }

  upsert(collection: string, modelId: string, rows: readonly VectorRow[]): void {
    const db = this.open();
    const statement = db.prepare(`INSERT INTO ${TABLE} (collection, item_id, model_id, fingerprint, vector) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT (collection, item_id) DO UPDATE SET model_id = excluded.model_id, fingerprint = excluded.fingerprint, vector = excluded.vector`);
    this.transaction(db, () => { for (const row of rows) statement.run(collection, row.id, modelId, row.fingerprint, toBlob(row.vector)); });
  }

  /** Removes items; a store that was never created has nothing to remove and stays uncreated. */
  remove(collection: string, ids: readonly string[]): void {
    const db = this.openExisting();
    if (!db || !ids.length) return;
    const statement = db.prepare(`DELETE FROM ${TABLE} WHERE collection = ? AND item_id = ?`);
    this.transaction(db, () => { for (const id of ids) statement.run(collection, id); });
  }

  dropCollection(collection: string): void {
    this.openExisting()?.prepare(`DELETE FROM ${TABLE} WHERE collection = ?`).run(collection);
  }

  /** After a model switch completes: vectors of other models are never read again. */
  deleteOtherModels(modelId: string): void {
    this.openExisting()?.prepare(`DELETE FROM ${TABLE} WHERE model_id <> ?`).run(modelId);
  }

  close(): void {
    this.db?.close();
    this.db = null;
  }

  private openExisting(): DatabaseSync | null {
    return this.db ?? (fs.existsSync(this.filePath) ? this.open() : null);
  }

  private open(): DatabaseSync {
    if (this.db) return this.db;
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    try {
      this.db = this.openChecked();
    } catch (error) {
      this.setAside(error);
      this.db = this.openChecked();
    }
    return this.db;
  }

  private openChecked(): DatabaseSync {
    const db = new DatabaseSync(this.filePath);
    try {
      db.exec("PRAGMA journal_mode = WAL");
      const columns = (db.prepare(`PRAGMA table_info(${TABLE})`).all() as Array<{ name: string }>).map((column) => column.name);
      if (columns.length && columns.join(",") !== COLUMNS.join(",")) throw new Error(`unexpected ${TABLE} columns: ${columns.join(", ")}`);
      db.exec(CREATE);
      return db;
    } catch (error) {
      db.close();
      throw error;
    }
  }

  private setAside(reason: unknown): void {
    const aside = `${this.filePath}.unreadable-${Date.now()}`;
    console.warn("EMBEDDING_STORE_UNREADABLE", { file: this.filePath, movedTo: aside, reason: reason instanceof Error ? reason.message : String(reason) });
    for (const suffix of ["", "-wal", "-shm"]) {
      if (fs.existsSync(this.filePath + suffix)) fs.renameSync(this.filePath + suffix, aside + suffix);
    }
  }

  private transaction(db: DatabaseSync, work: () => void): void {
    db.exec("BEGIN");
    try {
      work();
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
}
