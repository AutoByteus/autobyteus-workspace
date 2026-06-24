import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { RAW_TRACES_MEMORY_FILE_NAME } from "autobyteus-ts/memory/store/memory-file-names.js";
import { RAW_TRACES_ARCHIVE_DIR_NAME, type RawTraceArchiveSegmentEntry } from "autobyteus-ts/memory/store/raw-trace-archive-manifest.js";
import { RunMemoryFileStore } from "autobyteus-ts/memory/store/run-memory-file-store.js";
import type { MemoryTraceEvent } from "../domain/models.js";
import type { SelfEvolutionWorkTraceSource } from "../../self-evolution/domain/work-traces.js";
import type { SelfEvolutionTargetContext } from "../../self-evolution/services/self-evolution-target-context-resolver.js";

const asNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;

const toTraceEvent = (trace: Record<string, unknown>): MemoryTraceEvent => ({
  id: asString(trace.id),
  traceType: asString(trace.trace_type) ?? "",
  sourceEvent: asString(trace.source_event),
  content: typeof trace.content === "string" ? trace.content : null,
  toolName: asString(trace.tool_name),
  toolCallId: asString(trace.tool_call_id),
  toolArgs: asRecord(trace.tool_args),
  toolResult: trace.tool_result ?? null,
  toolError: typeof trace.tool_error === "string" ? trace.tool_error : null,
  media: asRecord(trace.media) as Record<string, string[]> | null,
  turnId: asString(trace.turn_id) ?? "",
  seq: asNumber(trace.seq) ?? 0,
  ts: asNumber(trace.ts) ?? 0,
});

const traceTs = (record: MemoryTraceEvent): number | null =>
  Number.isFinite(record.ts) && record.ts > 0 ? record.ts : null;

const sortRecords = (records: MemoryTraceEvent[]): MemoryTraceEvent[] =>
  [...records].sort((a, b) => {
    const tsDiff = (traceTs(a) ?? 0) - (traceTs(b) ?? 0);
    if (tsDiff !== 0) return tsDiff;
    const turnDiff = a.turnId.localeCompare(b.turnId);
    if (turnDiff !== 0) return turnDiff;
    if (a.seq !== b.seq) return a.seq - b.seq;
    return (a.id ?? "").localeCompare(b.id ?? "");
  });

const readJsonl = async (filePath: string): Promise<Record<string, unknown>[]> => {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return raw.split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .flatMap((line) => {
        try {
          const parsed = JSON.parse(line) as unknown;
          return asRecord(parsed) ? [parsed as Record<string, unknown>] : [];
        } catch {
          return [];
        }
      });
  } catch (error) {
    if (String(error).includes("ENOENT")) {
      return [];
    }
    throw error;
  }
};

const fingerprint = (sourcePath: string, records: MemoryTraceEvent[]): string => {
  const hash = crypto.createHash("sha256");
  hash.update(sourcePath);
  hash.update("\n");
  for (const record of records) {
    hash.update(JSON.stringify(record));
    hash.update("\n");
  }
  return hash.digest("hex");
};

export class RawTraceWorkTraceSourceReader {
  async listSources(context: SelfEvolutionTargetContext): Promise<SelfEvolutionWorkTraceSource[]> {
    const runStore = new RunMemoryFileStore(context.memoryDir);
    const manifest = runStore.readRawTraceArchiveManifest();
    const archiveSources = await Promise.all(
      manifest.segments
        .filter((segment) => segment.status === "complete")
        .sort((a, b) => a.index - b.index)
        .map((segment) => this.readArchiveSource(context.memoryDir, segment)),
    );
    const active = await this.readActiveSource(context.memoryDir);
    return active ? [...archiveSources, active] : archiveSources;
  }

  private async readArchiveSource(
    memoryDir: string,
    segment: RawTraceArchiveSegmentEntry,
  ): Promise<SelfEvolutionWorkTraceSource> {
    const sourcePath = this.resolveSegmentPath(memoryDir, segment.file_name);
    const records = sortRecords((await readJsonl(sourcePath)).map(toTraceEvent));
    return this.buildSource({
      kind: "archive_segment",
      sourceId: `archive:${segment.index}`,
      displayName: `archive ${String(segment.index).padStart(6, "0")}`,
      sourcePath,
      index: segment.index,
      records,
    });
  }

  private async readActiveSource(memoryDir: string): Promise<SelfEvolutionWorkTraceSource | null> {
    const sourcePath = path.join(memoryDir, RAW_TRACES_MEMORY_FILE_NAME);
    const records = sortRecords((await readJsonl(sourcePath)).map(toTraceEvent));
    try {
      await fs.stat(sourcePath);
    } catch (error) {
      if (String(error).includes("ENOENT")) {
        return null;
      }
      throw error;
    }
    return this.buildSource({
      kind: "active",
      sourceId: "active",
      displayName: "active raw traces",
      sourcePath,
      index: null,
      records,
    });
  }

  private buildSource(input: {
    kind: SelfEvolutionWorkTraceSource["kind"];
    sourceId: string;
    displayName: string;
    sourcePath: string;
    index: number | null;
    records: MemoryTraceEvent[];
  }): SelfEvolutionWorkTraceSource {
    return {
      kind: input.kind,
      sourceId: input.sourceId,
      displayName: input.displayName,
      sourcePath: input.sourcePath,
      index: input.index,
      fingerprint: fingerprint(input.sourcePath, input.records),
      recordCount: input.records.length,
      firstTimestamp: input.records.length ? traceTs(input.records[0]!) : null,
      lastTimestamp: input.records.length ? traceTs(input.records[input.records.length - 1]!) : null,
      records: input.records,
    };
  }

  private resolveSegmentPath(memoryDir: string, fileName: string): string {
    const normalized = fileName.trim();
    const relativePath = normalized.includes("/") || normalized.includes("\\") || /^raw_traces_\d{6}\.jsonl$/.test(normalized)
      ? normalized
      : path.join(RAW_TRACES_ARCHIVE_DIR_NAME, normalized);
    const root = path.resolve(memoryDir);
    const resolved = path.resolve(root, relativePath);
    if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
      throw new Error(`Invalid raw trace archive segment path: ${fileName}`);
    }
    return resolved;
  }
}
