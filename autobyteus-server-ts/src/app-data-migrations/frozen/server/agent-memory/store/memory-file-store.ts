import fs from "node:fs";
import path from "node:path";
import { RAW_TRACES_ACTIVE_MEMORY_FILE_NAME } from "../../../autobyteus-ts/memory/store/memory-file-names.js";
import { RunMemoryFileStore } from "../../../autobyteus-ts/memory/store/run-memory-file-store.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

export class MemoryFileStore {
  private baseDir: string;
  private readonly runRootSubdir: string;
  private readonly warnOnMissingFiles: boolean;

  constructor(
    baseDir: string,
    options: { runRootSubdir?: string; warnOnMissingFiles?: boolean } = {},
  ) {
    this.baseDir = baseDir;
    this.runRootSubdir = options.runRootSubdir ?? "agents";
    this.warnOnMissingFiles = options.warnOnMissingFiles ?? true;
  }

  private getRunRootDir(): string {
    if (!this.runRootSubdir) {
      return this.baseDir;
    }
    return path.join(this.baseDir, this.runRootSubdir);
  }

  getRunDir(runId: string): string {
    return path.join(this.getRunRootDir(), runId);
  }

  readJsonl(
    filePath: string,
    limit?: number,
    options: { warnIfMissing?: boolean } = {},
  ): Array<Record<string, unknown>> {
    if (!fs.existsSync(filePath)) {
      if (this.warnOnMissingFiles && options.warnIfMissing !== false) {
        logger.warn(`Memory file missing: ${filePath}`);
      }
      return [];
    }
    const raw = fs.readFileSync(filePath, "utf-8");
    let lines = raw.split(/\r?\n/);
    if (limit && limit > 0 && lines.length > limit) {
      lines = lines.slice(-limit);
    }
    const records: Array<Record<string, unknown>> = [];
    for (const line of lines) {
      if (!line.trim()) {
        continue;
      }
      try {
        const record = JSON.parse(line);
        if (record && typeof record === "object" && !Array.isArray(record)) {
          records.push(record as Record<string, unknown>);
        }
      } catch (error) {
        logger.warn(`Skipping malformed JSONL line in ${filePath}: ${String(error)}`);
      }
    }
    return records;
  }

  readRawTracesActive(runId: string, limit?: number): Array<Record<string, unknown>> {
    const filePath = path.join(this.getRunDir(runId), RAW_TRACES_ACTIVE_MEMORY_FILE_NAME);
    return this.readJsonl(filePath, limit);
  }

  readRawTracesArchive(runId: string, limit?: number): Array<Record<string, unknown>> {
    const records = new RunMemoryFileStore(this.getRunDir(runId)).readCompleteArchiveRawTraceDicts();
    return limit && limit > 0 ? records.slice(-limit) : records;
  }
}
