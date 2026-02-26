import fs from "node:fs";
import path from "node:path";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

export type FileInfo = {
  exists: true;
  mtime: number;
};

export class MemoryFileStore {
  private baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
  }

  getRunDir(runId: string): string {
    return path.join(this.baseDir, "agents", runId);
  }

  listRunDirs(): string[] {
    const agentsDir = path.join(this.baseDir, "agents");
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
      logger.warn(`Memory file missing: ${filePath}`);
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

  readJsonl(filePath: string, limit?: number): Array<Record<string, unknown>> {
    if (!fs.existsSync(filePath)) {
      logger.warn(`Memory file missing: ${filePath}`);
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
    const filePath = path.join(this.getRunDir(runId), "working_context_snapshot.json");
    return this.readJson(filePath);
  }

  readRawTracesActive(runId: string, limit?: number): Array<Record<string, unknown>> {
    const filePath = path.join(this.getRunDir(runId), "raw_traces.jsonl");
    return this.readJsonl(filePath, limit);
  }

  readRawTracesArchive(runId: string, limit?: number): Array<Record<string, unknown>> {
    const filePath = path.join(this.getRunDir(runId), "raw_traces_archive.jsonl");
    return this.readJsonl(filePath, limit);
  }

  readEpisodic(runId: string, limit?: number): Array<Record<string, unknown>> {
    const filePath = path.join(this.getRunDir(runId), "episodic.jsonl");
    return this.readJsonl(filePath, limit);
  }

  readSemantic(runId: string, limit?: number): Array<Record<string, unknown>> {
    const filePath = path.join(this.getRunDir(runId), "semantic.jsonl");
    return this.readJsonl(filePath, limit);
  }
}
