import fs from "node:fs/promises";
import path from "node:path";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { atomicWriteJsonFile } from "../../run-history/store/atomic-json-file-writer.js";
import type { SelfEvolutionRunRecord } from "../domain/models.js";

export class SelfEvolutionRunStore {
  private readonly runsRootDir: string;
  private readonly indexPath: string;

  constructor(memoryDir: string = appConfigProvider.config.getMemoryDir()) {
    this.runsRootDir = path.join(memoryDir, "self_evolution", "evolution_runs");
    this.indexPath = path.join(memoryDir, "self_evolution", "index.json");
  }

  async writeRecord(record: SelfEvolutionRunRecord): Promise<void> {
    const recordPath = this.getRecordPath(record.evolutionRunId);
    await fs.mkdir(path.dirname(recordPath), { recursive: true });
    await atomicWriteJsonFile(recordPath, record);
    await this.addToIndex(record);
  }

  async readRecord(evolutionRunId: string): Promise<SelfEvolutionRunRecord | null> {
    try {
      const raw = await fs.readFile(this.getRecordPath(evolutionRunId), "utf-8");
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed as SelfEvolutionRunRecord
        : null;
    } catch {
      return null;
    }
  }

  async listRecords(): Promise<SelfEvolutionRunRecord[]> {
    let entries: string[] = [];
    try {
      entries = await fs.readdir(this.runsRootDir);
    } catch {
      return [];
    }
    const records = await Promise.all(entries.map((entry) => this.readRecord(entry)));
    return records.filter((record): record is SelfEvolutionRunRecord => Boolean(record));
  }

  private getRecordPath(evolutionRunId: string): string {
    const normalized = evolutionRunId.trim();
    if (!normalized || normalized.includes("/") || normalized.includes("\\")) {
      throw new Error("evolutionRunId must be a safe path segment.");
    }
    return path.join(this.runsRootDir, normalized, "record.json");
  }

  private async addToIndex(record: SelfEvolutionRunRecord): Promise<void> {
    const index = await this.readIndex();
    index[record.evolutionRunId] = {
      evolutionRunId: record.evolutionRunId,
      status: record.status,
      target: record.target,
      requestedAt: record.requestedAt,
      completedAt: record.completedAt ?? null,
      evolverRunId: record.evolverRunId ?? null,
    };
    await fs.mkdir(path.dirname(this.indexPath), { recursive: true });
    await atomicWriteJsonFile(this.indexPath, index);
  }

  private async readIndex(): Promise<Record<string, unknown>> {
    try {
      const raw = await fs.readFile(this.indexPath, "utf-8");
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed as Record<string, unknown>
        : {};
    } catch {
      return {};
    }
  }
}
