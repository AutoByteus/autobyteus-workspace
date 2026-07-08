import crypto from "node:crypto";
import path from "node:path";
import type { MemoryTraceEvent } from "../../agent-memory/domain/models.js";
import { MemoryFileStore } from "../../agent-memory/store/memory-file-store.js";
import { RawTraceFileSourceService } from "../../agent-memory/services/raw-trace-file-source-service.js";
import type { RawTraceFileSource } from "../../agent-memory/services/raw-trace-file-source-service.js";
import type { AgentWorkTraceProjectionContext, AgentWorkTraceSource } from "../domain/work-traces.js";

const traceTs = (record: MemoryTraceEvent): number | null =>
  Number.isFinite(record.ts) && record.ts > 0 ? record.ts : null;

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

export class AgentWorkTraceSourceReader {
  async listSources(context: AgentWorkTraceProjectionContext): Promise<AgentWorkTraceSource[]> {
    const runId = path.basename(context.memoryDir);
    const service = this.createRawTraceFileSourceService(context);
    return service
      .listFiles(runId, "chronological")
      .map((file) => this.buildSourceForFile(file, service.readSource(runId, file).records));
  }

  private createRawTraceFileSourceService(context: AgentWorkTraceProjectionContext): RawTraceFileSourceService {
    return new RawTraceFileSourceService(
      new MemoryFileStore(path.dirname(context.memoryDir), {
        runRootSubdir: "",
        warnOnMissingFiles: false,
      }),
    );
  }

  private buildSourceForFile(
    file: RawTraceFileSource,
    records: MemoryTraceEvent[],
  ): AgentWorkTraceSource {
    const index = file.kind === "segment" ? file.segmentIndex ?? null : null;
    return this.buildSource({
      kind: file.kind === "segment" ? "archive_segment" : "active",
      sourceId: file.kind === "segment" && index !== null ? `archive:${index}` : "active",
      displayName: file.kind === "segment" && index !== null
        ? `archive ${String(index).padStart(6, "0")}`
        : "active raw traces",
      sourcePath: file.filePath,
      index,
      records,
    });
  }

  private buildSource(input: {
    kind: AgentWorkTraceSource["kind"];
    sourceId: string;
    displayName: string;
    sourcePath: string;
    index: number | null;
    records: MemoryTraceEvent[];
  }): AgentWorkTraceSource {
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
}
