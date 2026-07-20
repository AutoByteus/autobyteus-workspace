import fs from "node:fs";
import path from "node:path";
import {
  EPISODIC_MEMORY_FILE_NAME,
  RAW_TRACES_ACTIVE_MEMORY_FILE_NAME,
  SEMANTIC_MEMORY_FILE_NAME,
  WORKING_CONTEXT_SNAPSHOT_FILE_NAME,
} from "autobyteus-ts/memory/store/memory-file-names.js";
import { RunMemoryFileStore } from "autobyteus-ts/memory/store/run-memory-file-store.js";
import { RAW_TRACES_MANIFEST_FILE_NAME } from "autobyteus-ts/memory/store/raw-trace-archive-manifest.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

export type FileInfo = {
  exists: true;
  mtime: number;
};

export type ActiveRawTraceSnapshot = {
  records: Array<Record<string, unknown>>;
  device: string | null;
  inode: string | null;
  manifestGeneration: string | null;
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

  listRunDirs(): string[] {
    const agentsDir = this.getRunRootDir();
    if (!fs.existsSync(agentsDir)) {
      return [];
    }
    return fs
      .readdirSync(agentsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  }

  getFileInfo(filePath: string): FileInfo | null {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const stat = fs.statSync(filePath);
    return { exists: true, mtime: stat.mtimeMs / 1000 };
  }

  readJson(filePath: string): Record<string, unknown> | null {
    if (!fs.existsSync(filePath)) {
      if (this.warnOnMissingFiles) {
        logger.warn(`Memory file missing: ${filePath}`);
      }
      return null;
    }
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return null;
    } catch (error) {
      logger.warn(`Failed to decode JSON file ${filePath}: ${String(error)}`);
      return null;
    }
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

  readWorkingContextSnapshot(runId: string): Record<string, unknown> | null {
    const filePath = path.join(this.getRunDir(runId), WORKING_CONTEXT_SNAPSHOT_FILE_NAME);
    return this.readJson(filePath);
  }

  readRawTracesActive(runId: string, limit?: number): Array<Record<string, unknown>> {
    const filePath = path.join(this.getRunDir(runId), RAW_TRACES_ACTIVE_MEMORY_FILE_NAME);
    return this.readJsonl(filePath, limit);
  }

  readRawTracesActiveSnapshot(runId: string): ActiveRawTraceSnapshot {
    const filePath = path.join(this.getRunDir(runId), RAW_TRACES_ACTIVE_MEMORY_FILE_NAME);
    if (!fs.existsSync(filePath)) {
      return { records: [], device: null, inode: null, manifestGeneration: this.readRawTraceManifestGeneration(runId) };
    }
    const fd = fs.openSync(filePath, "r");
    try {
      const stat = fs.fstatSync(fd);
      const raw = fs.readFileSync(fd, "utf8");
      const records: Array<Record<string, unknown>> = [];
      for (const line of raw.split(/\r?\n/)) {
        if (!line.trim()) continue;
        try {
          const record = JSON.parse(line);
          if (record && typeof record === "object" && !Array.isArray(record)) {
            records.push(record as Record<string, unknown>);
          }
        } catch (error) {
          logger.warn(`Skipping malformed JSONL line in ${filePath}: ${String(error)}`);
        }
      }
      return {
        records,
        device: Number.isFinite(stat.dev) ? String(stat.dev) : null,
        inode: Number.isFinite(stat.ino) ? String(stat.ino) : null,
        manifestGeneration: this.readRawTraceManifestGeneration(runId),
      };
    } finally {
      fs.closeSync(fd);
    }
  }

  private readRawTraceManifestGeneration(runId: string): string | null {
    const manifest = this.readJson(path.join(this.getRunDir(runId), RAW_TRACES_MANIFEST_FILE_NAME));
    if (!manifest || !Array.isArray(manifest.segments)) return null;
    const completed = manifest.segments.filter((segment): segment is Record<string, unknown> => (
      Boolean(segment) && typeof segment === "object" && !Array.isArray(segment)
      && (segment as Record<string, unknown>).status === "complete"
    ));
    const latest = completed.at(-1);
    if (!latest) return null;
    const index = typeof latest.index === "number" ? latest.index : "";
    const boundary = typeof latest.boundary_key === "string" ? latest.boundary_key : "";
    return `${index}:${boundary}`;
  }

  readRawTracesArchive(runId: string, limit?: number): Array<Record<string, unknown>> {
    const records = new RunMemoryFileStore(this.getRunDir(runId)).readCompleteArchiveRawTraceDicts();
    return limit && limit > 0 ? records.slice(-limit) : records;
  }

  getRawTraceArchiveInfo(runId: string): FileInfo | null {
    return new RunMemoryFileStore(this.getRunDir(runId)).getRawTraceArchiveRevisionInfo();
  }

  readRawTraceCorpus(runId: string, limit?: number): Array<Record<string, unknown>> {
    return new RunMemoryFileStore(this.getRunDir(runId)).readCompleteRawTraceCorpusDicts(limit);
  }

  readEpisodic(runId: string, limit?: number): Array<Record<string, unknown>> {
    const filePath = path.join(this.getRunDir(runId), EPISODIC_MEMORY_FILE_NAME);
    return this.readJsonl(filePath, limit);
  }

  readSemantic(runId: string, limit?: number): Array<Record<string, unknown>> {
    const filePath = path.join(this.getRunDir(runId), SEMANTIC_MEMORY_FILE_NAME);
    return this.readJsonl(filePath, limit);
  }
}
