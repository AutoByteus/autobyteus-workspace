import fs from 'node:fs';
import path from 'node:path';

import { MemoryType, MemoryItem } from '../models/memory-types.js';
import { RawTraceItem } from '../models/raw-trace-item.js';
import { SYSTEM_INSTRUCTION_TRACE_TYPE } from '../models/system-instruction-trace.js';
import {
  EPISODIC_MEMORY_FILE_NAME,
  RAW_TRACES_ACTIVE_MEMORY_FILE_NAME,
  SEMANTIC_MEMORY_FILE_NAME,

} from './memory-file-names.js';
import { jsonlLogEndsCleanly, repairJsonlDamagedEnd } from './jsonl-log-file.js';
import type { RawTraceArchiveSegmentEntry } from './raw-trace-archive-manifest.js';
import { RawTraceArchiveManager } from './raw-trace-archive-manager.js';

export class RunMemoryFileStore {
  readonly runDir: string;
  private readonly archiveManager: RawTraceArchiveManager;
  /** JSONL files of this instance whose end is known to be clean; appends to them need no further check. */
  private readonly verifiedEndPaths = new Set<string>();

  constructor(runDir: string) {
    this.runDir = runDir;
    this.archiveManager = new RawTraceArchiveManager(this.runDir);
  }

  getFilePath(memoryType: MemoryType): string {
    if (memoryType === MemoryType.RAW_TRACE) {
      return path.join(this.runDir, RAW_TRACES_ACTIVE_MEMORY_FILE_NAME);
    }
    if (memoryType === MemoryType.EPISODIC) {
      return path.join(this.runDir, EPISODIC_MEMORY_FILE_NAME);
    }
    if (memoryType === MemoryType.SEMANTIC) {
      return path.join(this.runDir, SEMANTIC_MEMORY_FILE_NAME);
    }
    throw new Error(`Unknown memory type: ${memoryType}`);
  }

  add(items: Iterable<MemoryItem>): void {
    for (const item of items) {
      this.appendJsonlRecord(this.getFilePath(item.memoryType), item.toDict());
    }
  }

  appendRawTrace(item: RawTraceItem): void {
    this.add([item]);
  }

  /** Reads a file for use: its damaged end, if any, is cut first. */
  readMemoryDicts(memoryType: MemoryType, limit?: number): Record<string, unknown>[] {
    const filePath = this.getFilePath(memoryType);
    const records = repairJsonlDamagedEnd(filePath);
    this.verifiedEndPaths.add(filePath);
    return typeof limit === 'number' ? records.slice(-limit) : records;
  }

  listTurnRawTracesOrdered(limit?: number): RawTraceItem[] {
    const records = this.readMemoryDicts(MemoryType.RAW_TRACE)
      .filter((record) => record.trace_type !== SYSTEM_INSTRUCTION_TRACE_TYPE);
    const selected = typeof limit === 'number' ? records.slice(-limit) : records;
    return selected.map((record) => RawTraceItem.fromDict(record));
  }

  readCompleteArchiveRawTraceDicts(): Record<string, unknown>[] {
    return this.archiveManager.readCompleteArchiveRawTraceDicts();
  }

  listCompleteRawTraceArchiveSegments(): RawTraceArchiveSegmentEntry[] {
    return this.archiveManager.listCompleteSegments();
  }

  getCompleteRawTraceArchiveSegmentPathByFileName(fileName: string): string | null {
    return this.archiveManager.getCompleteSegmentPathByFileName(fileName);
  }

  readCompleteRawTraceArchiveSegmentDictsByFileName(fileName: string): Record<string, unknown>[] | null {
    return this.archiveManager.readCompleteSegmentRawTraceDictsByFileName(fileName);
  }

  /** An appended record is always a line of its own: the first append to a file per instance cuts a damaged end. */
  private appendJsonlRecord(filePath: string, record: Record<string, unknown>): void {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    if (!this.verifiedEndPaths.has(filePath)) {
      if (!jsonlLogEndsCleanly(filePath)) repairJsonlDamagedEnd(filePath);
      this.verifiedEndPaths.add(filePath);
    }
    fs.appendFileSync(filePath, `${JSON.stringify(record)}\n`, 'utf-8');
  }
}
