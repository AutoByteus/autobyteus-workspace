import { isDeepStrictEqual } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";
import {
  NativeWorkingContextSnapshotV5Converter,
  type NativeSnapshotConversionOmissions,
  type NativeSnapshotReferenceFact,
} from "autobyteus-ts/memory/migration/native-working-context-snapshot-v5-converter.js";
import { RunMemoryFileStore } from "autobyteus-ts/memory/store/run-memory-file-store.js";
import {
  COMPACTION_LINEAGE_FILE_NAME,
  EPISODIC_MEMORY_FILE_NAME,
  SEMANTIC_MEMORY_FILE_NAME,
} from "autobyteus-ts/memory/store/memory-file-names.js";
import { WorkingContextSnapshotStore } from "autobyteus-ts/memory/store/working-context-snapshot-store.js";
import { WorkingContextSnapshotSerializer } from "autobyteus-ts/memory/working-context-snapshot-serializer.js";
import {
  RuntimeMemoryLocationClassifier,
  type RuntimeMemoryLocation,
} from "../../agent-memory/services/runtime-memory-location-classifier.js";
import { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type {
  AppDataMigrationDefinition,
  AppDataMigrationExecutionResult,
  AppDataMigrationItemDetail,
  AppDataMigrationSummary,
} from "../domain/app-data-migration-types.js";

const MIGRATION_ID = "20260731_migrate_native_working_context_snapshots_v5";
const OBSOLETE_FILE_NAMES = [
  EPISODIC_MEMORY_FILE_NAME,
  SEMANTIC_MEMORY_FILE_NAME,
  "compacted_memory_manifest.json",
] as const;

const isNotFound = (error: unknown): boolean =>
  (error as NodeJS.ErrnoException | null)?.code === "ENOENT";

const pathExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    if (isNotFound(error)) return false;
    throw error;
  }
};

const buildSummary = (details: AppDataMigrationItemDetail[]): AppDataMigrationSummary => ({
  scannedCount: details.length,
  migratedCount: details.filter(({ status }) => status === "MIGRATED").length,
  skippedCount: details.filter(({ status }) => status === "SKIPPED").length,
  failedCount: details.filter(({ status }) => status === "FAILED").length,
  details,
});

export class MigrateNativeWorkingContextSnapshotsV5Migration
  implements AppDataMigrationDefinition {
  readonly id = MIGRATION_ID;
  readonly displayName = "Migrate native WorkingContext snapshots to strict v5";
  readonly description =
    "Converts exact native pre-lineage snapshots to strict v5 while preserving raw evidence and current-lineage locations.";
  readonly requiredOnStartup = true;

  private readonly classifier: RuntimeMemoryLocationClassifier;
  private readonly converter = new NativeWorkingContextSnapshotV5Converter();

  constructor(private readonly memoryDir: string) {
    this.classifier = new RuntimeMemoryLocationClassifier(memoryDir);
  }

  async execute(): Promise<AppDataMigrationExecutionResult> {
    const classification = await this.classifier.classify();
    const details: AppDataMigrationItemDetail[] = classification.diagnostics.map((diagnostic) => ({
      itemId: diagnostic.itemId,
      filePath: diagnostic.filePath,
      status: diagnostic.status,
      message: diagnostic.message,
    }));
    let completedWithOmissions = false;

    for (const location of classification.locations) {
      if (location.runtimeKind !== RuntimeKind.AUTOBYTEUS) continue;
      const result = await this.migrateLocation(location);
      details.push(result.detail);
      completedWithOmissions ||= result.completedWithOmissions;
    }

    const summary = buildSummary(details);
    const status = summary.failedCount > 0
      ? "FAILED"
      : completedWithOmissions
        ? "SUCCEEDED_WITH_WARNINGS"
        : "SUCCEEDED";
    return {
      status,
      summary,
      errorMessage: summary.failedCount > 0
        ? `${summary.failedCount} native snapshot migration item${summary.failedCount === 1 ? "" : "s"} failed.`
        : null,
    };
  }

  private async migrateLocation(location: RuntimeMemoryLocation): Promise<{
    detail: AppDataMigrationItemDetail;
    completedWithOmissions: boolean;
  }> {
    const snapshotPath = location.workingContextSnapshotPath;
    if (!(await pathExists(snapshotPath))) {
      return {
        detail: {
          itemId: location.itemId,
          filePath: snapshotPath,
          status: "SKIPPED",
          message: "Native run has no WorkingContext snapshot; no state was changed.",
        },
        completedWithOmissions: false,
      };
    }

    const lineagePath = path.join(location.memoryDir, COMPACTION_LINEAGE_FILE_NAME);
    if (await this.hasNonemptyLineage(lineagePath)) {
      return {
        detail: {
          itemId: location.itemId,
          filePath: snapshotPath,
          status: "SKIPPED",
          message: "Nonempty compaction lineage is present; the complete location was left untouched.",
        },
        completedWithOmissions: false,
      };
    }

    const sourceBytes = await fs.readFile(snapshotPath);
    const conversion = this.converter.convert({
      expectedSnapshotAgentId: location.snapshotAgentId,
      sourceBytes,
      eligibleActiveReferenceFacts: this.loadActiveReferenceFacts(location.memoryDir),
    });
    if (conversion.kind === "identity_rejected") {
      return {
        detail: {
          itemId: location.itemId,
          filePath: snapshotPath,
          status: "FAILED",
          message: `Snapshot identity was rejected (${conversion.reasonCode}); no state was changed.`,
        },
        completedWithOmissions: false,
      };
    }

    const payload = WorkingContextSnapshotSerializer.serialize(conversion.workingContext, {
      agent_id: location.snapshotAgentId,
    });
    if (!WorkingContextSnapshotSerializer.validate(payload)) {
      throw new Error(`Strict-v5 candidate validation failed for '${location.itemId}'.`);
    }
    const retainSourceBytes = conversion.mode === "converted"
      && this.isEquivalentStrictV5(sourceBytes, payload);
    const obsoletePresent = await this.hasObsoleteFiles(location.memoryDir);
    if (!retainSourceBytes) {
      new WorkingContextSnapshotStore(location.memoryDir, location.snapshotAgentId, {
        agentRootSubdir: "",
      }).write(location.snapshotAgentId, payload);
    }
    await this.removeObsoleteFiles(location.memoryDir);

    if (retainSourceBytes && !obsoletePresent) {
      return {
        detail: {
          itemId: location.itemId,
          filePath: snapshotPath,
          status: "SKIPPED",
          message: "Snapshot is already strict v5, naturally source-backed, and fully cleaned.",
        },
        completedWithOmissions: false,
      };
    }
    return {
      detail: {
        itemId: location.itemId,
        filePath: snapshotPath,
        status: "MIGRATED",
        message: retainSourceBytes
          ? "Retained strict-v5 snapshot bytes and removed obsolete derived-memory files."
          : this.conversionMessage(conversion.mode, conversion.omissions),
      },
      completedWithOmissions: conversion.mode === "converted_with_omissions",
    };
  }

  private loadActiveReferenceFacts(memoryDir: string): NativeSnapshotReferenceFact[] {
    return new RunMemoryFileStore(memoryDir).listRawTracesOrdered().map((trace) => ({
      id: trace.id,
      turnId: trace.turnId,
      seq: trace.seq,
      traceType: trace.traceType,
      sourceEvent: trace.sourceEvent,
      content: trace.content,
      media: trace.media ? {
        images: trace.media.images ? [...trace.media.images] : undefined,
        audio: trace.media.audio ? [...trace.media.audio] : undefined,
        video: trace.media.video ? [...trace.media.video] : undefined,
      } : null,
      toolName: trace.toolName,
      toolCallId: trace.toolCallId,
      toolArgs: trace.toolArgs ? { ...trace.toolArgs } : null,
      toolResult: trace.toolResult,
      toolError: trace.toolError,
      correlationId: trace.correlationId,
    }));
  }

  private async hasNonemptyLineage(filePath: string): Promise<boolean> {
    try {
      return (await fs.readFile(filePath)).byteLength > 0;
    } catch (error) {
      if (isNotFound(error)) return false;
      throw error;
    }
  }

  private isEquivalentStrictV5(
    sourceBytes: Uint8Array,
    candidate: Record<string, unknown>,
  ): boolean {
    try {
      const source = JSON.parse(new TextDecoder().decode(sourceBytes)) as Record<string, unknown>;
      if (!WorkingContextSnapshotSerializer.validate(source)) return false;
      const normalizedCandidate = JSON.parse(JSON.stringify(candidate));
      return isDeepStrictEqual(source, normalizedCandidate);
    } catch {
      return false;
    }
  }

  private async hasObsoleteFiles(memoryDir: string): Promise<boolean> {
    for (const fileName of OBSOLETE_FILE_NAMES) {
      if (await pathExists(path.join(memoryDir, fileName))) return true;
    }
    return false;
  }

  private async removeObsoleteFiles(memoryDir: string): Promise<void> {
    for (const fileName of OBSOLETE_FILE_NAMES) {
      try {
        await fs.unlink(path.join(memoryDir, fileName));
      } catch (error) {
        if (!isNotFound(error)) throw error;
      }
    }
  }

  private conversionMessage(
    mode: "converted" | "converted_with_omissions",
    omissions: NativeSnapshotConversionOmissions,
  ): string {
    return mode === "converted"
      ? "Converted native WorkingContext snapshot to strict v5 and removed obsolete derived-memory files."
      : `Converted native WorkingContext snapshot to strict v5 with omissions ${JSON.stringify(omissions)}.`;
  }
}

export const MIGRATE_NATIVE_WORKING_CONTEXT_SNAPSHOTS_V5_MIGRATION_ID = MIGRATION_ID;
