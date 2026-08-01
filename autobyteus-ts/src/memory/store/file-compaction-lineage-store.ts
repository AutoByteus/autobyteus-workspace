import fs from 'node:fs';
import path from 'node:path';

import {
  normalizeCompactionLineageRecord,
  type CompactionLineageRecord,
} from '../lineage/compaction-lineage-record.js';
import {
  sameCompactionLineageScope,
  type CompactionLineageScope,
} from '../lineage/compaction-lineage-scope.js';
import type { CompactionLineageStore } from '../lineage/compaction-lineage-store.js';
import type { MemoryArtifactRef } from '../lineage/memory-origin-resolution.js';
import { COMPACTION_LINEAGE_FILE_NAME } from './memory-file-names.js';

const readJsonl = (filePath: string): unknown[] => {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, 'utf-8')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
};

export class FileCompactionLineageStore implements CompactionLineageStore {
  constructor(
    private readonly runDir: string,
    private readonly scope: CompactionLineageScope,
  ) {}

  appendNext(
    expectedPreviousCompactionId: string | null,
    record: CompactionLineageRecord,
  ): void {
    const normalized = normalizeCompactionLineageRecord(record);
    this.assertScope(normalized.scope);
    const records = this.list();
    if (records.some(({ compactionId }) => compactionId === normalized.compactionId)) {
      throw new Error(`Compaction lineage '${normalized.compactionId}' already exists.`);
    }
    const observedPreviousCompactionId = records.at(-1)?.compactionId ?? null;
    if (observedPreviousCompactionId !== expectedPreviousCompactionId) {
      throw new Error('Compaction lineage head changed before append.');
    }
    if (normalized.previousCompactionId !== expectedPreviousCompactionId) {
      throw new Error('Compaction lineage record predecessor does not match the expected head.');
    }
    fs.mkdirSync(this.runDir, { recursive: true });
    fs.appendFileSync(
      path.join(this.runDir, COMPACTION_LINEAGE_FILE_NAME),
      `${JSON.stringify(normalized)}\n`,
      'utf-8',
    );
  }

  list(): CompactionLineageRecord[] {
    const records = readJsonl(path.join(this.runDir, COMPACTION_LINEAGE_FILE_NAME))
      .map(normalizeCompactionLineageRecord);
    records.forEach((record) => this.assertScope(record.scope));
    const ids = records.map(({ compactionId }) => compactionId);
    if (new Set(ids).size !== ids.length) {
      throw new Error('Compaction lineage contains duplicate compaction IDs.');
    }
    records.forEach((record, index) => {
      const expectedPreviousCompactionId = index === 0
        ? null
        : records[index - 1]!.compactionId;
      if (record.previousCompactionId !== expectedPreviousCompactionId) {
        throw new Error(
          `Compaction lineage '${record.compactionId}' does not continue the successful-record chain.`,
        );
      }
    });
    return records;
  }

  readHead(): CompactionLineageRecord | null {
    return this.list().at(-1) ?? null;
  }

  getByCompactionId(compactionId: string): CompactionLineageRecord | null {
    const normalized = compactionId.trim();
    return this.list().find((record) => record.compactionId === normalized) ?? null;
  }

  findProducingRecord(artifact: MemoryArtifactRef): CompactionLineageRecord | null {
    const id = artifact.id.trim();
    if (!id) throw new Error('Memory artifact ID must be non-empty.');
    const matches = this.list().filter((record) =>
      (artifact.kind === 'episode' ? record.episodeIds : record.semanticIds).includes(id));
    if (matches.length > 1) {
      throw new Error(`${artifact.kind} '${id}' is listed by multiple compaction records.`);
    }
    return matches[0] ?? null;
  }

  private assertScope(scope: CompactionLineageScope): void {
    if (!sameCompactionLineageScope(scope, this.scope)) {
      throw new Error('Compaction lineage record scope does not match its run-local store.');
    }
  }
}
