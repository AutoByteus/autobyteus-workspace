import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { logger } from '../logger';
import type { NodeAutoUpdateEntries, NodeAutoUpdateEntry } from '../../shared/nodeAutoUpdateTypes';

const NODE_AUTO_UPDATES_FILE_NAME = 'node-auto-updates.json';
const OUTCOMES = new Set(['PENDING', 'AUTO_UPDATED', 'AUTO_FAILED']);

function toEntry(value: unknown): NodeAutoUpdateEntry | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.version !== 'string' || !candidate.version) return null;
  if (typeof candidate.requestedAt !== 'string' || typeof candidate.outcome !== 'string' || !OUTCOMES.has(candidate.outcome)) return null;
  return {
    version: candidate.version,
    requestedAt: candidate.requestedAt,
    outcome: candidate.outcome as NodeAutoUpdateEntry['outcome'],
    reason: typeof candidate.reason === 'string' ? candidate.reason : null,
    read: candidate.read === true,
  };
}

/**
 * The desktop's record of automatic node updates, one entry per node entry ID (autobyteus-356, DS-003). Tolerant on
 * read (a missing or invalid file is empty; an invalid entry is dropped) and atomic on write (DESIGN rule 7).
 */
export class NodeAutoUpdateRecord {
  private entries: NodeAutoUpdateEntries;

  constructor(private readonly userDataPath: string) {
    this.entries = this.load();
  }

  get(entryId: string): NodeAutoUpdateEntry | null {
    return this.entries[entryId] ?? null;
  }

  all(): NodeAutoUpdateEntries {
    return { ...this.entries };
  }

  set(entryId: string, entry: NodeAutoUpdateEntry): void {
    this.entries = { ...this.entries, [entryId]: entry };
    this.save();
  }

  /** The user saw the node's outcome. False when there is nothing unread to mark. */
  markRead(entryId: string): boolean {
    const entry = this.entries[entryId];
    if (!entry || entry.read || entry.outcome === 'PENDING') return false;
    this.set(entryId, { ...entry, read: true });
    return true;
  }

  /** Drops the entries of nodes that are no longer registered. True when something was dropped. */
  retain(entryIds: ReadonlySet<string>): boolean {
    const kept = Object.fromEntries(Object.entries(this.entries).filter(([entryId]) => entryIds.has(entryId)));
    if (Object.keys(kept).length === Object.keys(this.entries).length) return false;
    this.entries = kept;
    this.save();
    return true;
  }

  private get filePath(): string {
    return path.join(this.userDataPath, NODE_AUTO_UPDATES_FILE_NAME);
  }

  private load(): NodeAutoUpdateEntries {
    let raw: string;
    try {
      raw = fs.readFileSync(this.filePath, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        logger.warn('[node-auto-update] The node auto-update record is unreadable; starting without it.', error);
      }
      return {};
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      logger.warn('[node-auto-update] The node auto-update record is not valid JSON; starting without it.', error);
      return {};
    }
    const stored = (parsed as { entries?: unknown } | null)?.entries;
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) {
      logger.warn('[node-auto-update] The node auto-update record has an unknown shape; starting without it.');
      return {};
    }
    const entries: NodeAutoUpdateEntries = {};
    for (const [entryId, value] of Object.entries(stored as Record<string, unknown>)) {
      const entry = toEntry(value);
      if (entry) entries[entryId] = entry;
    }
    return entries;
  }

  private save(): void {
    const temporary = `${this.filePath}.${randomUUID()}.tmp`;
    try {
      fs.writeFileSync(temporary, `${JSON.stringify({ entries: this.entries }, null, 2)}\n`, 'utf8');
      fs.renameSync(temporary, this.filePath);
    } catch (error) {
      fs.rmSync(temporary, { force: true });
      logger.error('[node-auto-update] Failed to save the node auto-update record.', error);
    }
  }
}
