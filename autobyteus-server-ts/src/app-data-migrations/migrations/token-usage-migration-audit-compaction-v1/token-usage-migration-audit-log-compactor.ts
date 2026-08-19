import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  APP_DATA_MIGRATION_SUMMARY_BYTE_LIMIT_LABEL,
  MAX_APP_DATA_MIGRATION_SUMMARY_BYTES,
} from "../../repositories/app-data-migration-summary-projection.js";
import type { TerminalMigrationAuditRecord } from "./token-usage-migration-audit-compaction-repository.js";

export type AuditLogCompactionResult =
  | { kind: "MISSING" | "ALREADY_BOUNDED" | "COMPACTED" }
  | { kind: "WARNING"; reason: "UNOWNED_PATH" | "NOT_REGULAR" | "UNREWRITABLE" };

export interface TokenUsageMigrationAuditLogCompactorLike {
  compact(record: TerminalMigrationAuditRecord): Promise<AuditLogCompactionResult>;
}

type FileSystem = Pick<typeof fs, "lstat" | "realpath" | "writeFile" | "rename" | "rm">;

const isInside = (root: string, candidate: string): boolean => {
  const relative = path.relative(root, candidate);
  return relative !== "" && !relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative);
};

const canonicalLog = (record: TerminalMigrationAuditRecord): string => {
  const summary = record.summary!;
  return [
    `migrationId=${record.migrationId}`,
    `displayName=${record.displayName}`,
    `status=${record.status}`,
    `attempts=${record.attempts}`,
    `startedAt=${record.startedAt?.toISOString() ?? ""}`,
    `completedAt=${record.completedAt?.toISOString() ?? ""}`,
    `errorState=${record.errorMessage === null ? "absent" : "present"}`,
    `statusSummary=${JSON.stringify(summary.counts)}`,
    `detailsOmitted=${summary.detailCount}`,
    `reason=historical audit detail exceeded ${APP_DATA_MIGRATION_SUMMARY_BYTE_LIMIT_LABEL} bytes`,
    "",
  ].join("\n");
};

export class TokenUsageMigrationAuditLogCompactor
implements TokenUsageMigrationAuditLogCompactorLike {
  constructor(
    private readonly logsRoot: string,
    private readonly fileSystem: FileSystem = fs,
  ) {}

  async compact(record: TerminalMigrationAuditRecord): Promise<AuditLogCompactionResult> {
    if (!record.logPath) return { kind: "MISSING" };
    const lexicalRoot = path.resolve(this.logsRoot);
    const lexicalCandidate = path.resolve(record.logPath);
    if (!isInside(lexicalRoot, lexicalCandidate)) return { kind: "WARNING", reason: "UNOWNED_PATH" };

    let candidate: string;
    try {
      const [realRoot, realCandidate] = await Promise.all([
        this.fileSystem.realpath(lexicalRoot),
        this.fileSystem.realpath(lexicalCandidate),
      ]);
      if (!isInside(realRoot, realCandidate)) return { kind: "WARNING", reason: "UNOWNED_PATH" };
      candidate = realCandidate;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return { kind: "MISSING" };
      return { kind: "WARNING", reason: "UNREWRITABLE" };
    }

    let stats;
    try {
      stats = await this.fileSystem.lstat(candidate);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return { kind: "MISSING" };
      return { kind: "WARNING", reason: "UNREWRITABLE" };
    }
    if (!stats.isFile()) return { kind: "WARNING", reason: "NOT_REGULAR" };
    if (stats.size <= MAX_APP_DATA_MIGRATION_SUMMARY_BYTES) return { kind: "ALREADY_BOUNDED" };

    const content = canonicalLog(record);
    if (Buffer.byteLength(content, "utf8") > MAX_APP_DATA_MIGRATION_SUMMARY_BYTES) {
      return { kind: "WARNING", reason: "UNREWRITABLE" };
    }
    const temporary = `${candidate}.compacting-${process.pid}-${randomUUID()}`;
    try {
      await this.fileSystem.writeFile(temporary, content, "utf8");
      await this.fileSystem.rename(temporary, candidate);
      return { kind: "COMPACTED" };
    } catch {
      await this.fileSystem.rm(temporary, { force: true }).catch(() => undefined);
      return { kind: "WARNING", reason: "UNREWRITABLE" };
    }
  }
}
