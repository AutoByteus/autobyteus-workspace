import fs from "node:fs/promises";
import path from "node:path";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { atomicWriteJsonFile } from "../../run-history/store/atomic-json-file-writer.js";
import type { SkillImprovementRunRecord } from "../domain/models.js";

export class SkillImprovementRunStore {
  private readonly runsRootDir: string;
  private readonly indexPath: string;

  constructor(memoryDir: string = appConfigProvider.config.getMemoryDir()) {
    this.runsRootDir = path.join(memoryDir, "skill_improvement", "improvement_runs");
    this.indexPath = path.join(memoryDir, "skill_improvement", "index.json");
  }

  async writeRecord(record: SkillImprovementRunRecord): Promise<void> {
    const recordPath = this.getRecordPath(record.improvementRunId);
    await fs.mkdir(path.dirname(recordPath), { recursive: true });
    await atomicWriteJsonFile(recordPath, record);
    await this.addToIndex(record);
  }

  async readRecord(improvementRunId: string): Promise<SkillImprovementRunRecord | null> {
    try {
      const raw = await fs.readFile(this.getRecordPath(improvementRunId), "utf-8");
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed as SkillImprovementRunRecord
        : null;
    } catch {
      return null;
    }
  }

  async listRecords(): Promise<SkillImprovementRunRecord[]> {
    let entries: string[] = [];
    try {
      entries = await fs.readdir(this.runsRootDir);
    } catch {
      return [];
    }
    const records = await Promise.all(entries.map((entry) => this.readRecord(entry)));
    return records.filter((record): record is SkillImprovementRunRecord => Boolean(record));
  }

  private getRecordPath(improvementRunId: string): string {
    const normalized = improvementRunId.trim();
    if (!normalized || normalized.includes("/") || normalized.includes("\\")) {
      throw new Error("improvementRunId must be a safe path segment.");
    }
    return path.join(this.runsRootDir, normalized, "record.json");
  }

  private async addToIndex(record: SkillImprovementRunRecord): Promise<void> {
    const index = await this.readIndex();
    index[record.improvementRunId] = {
      improvementRunId: record.improvementRunId,
      status: record.status,
      target: record.target,
      requestedAt: record.requestedAt,
      completedAt: record.completedAt ?? null,
      improverRunId: record.improverRunId ?? null,
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
