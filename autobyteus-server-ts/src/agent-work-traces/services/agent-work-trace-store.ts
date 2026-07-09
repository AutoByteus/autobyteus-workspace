import fs from "node:fs/promises";
import path from "node:path";
import type {
  AgentWorkTraceFile,
  AgentWorkTraceManifest,
  AgentWorkTraceProjectionContext,
  AgentWorkTraceSource,
} from "../domain/work-traces.js";

export const WORK_TRACE_MANIFEST_FILE_NAME = "work_traces_manifest.json";

const toIso = (ts: number | null): string | null => {
  if (!ts || !Number.isFinite(ts)) return null;
  return new Date(ts > 10_000_000_000 ? ts : ts * 1000).toISOString();
};

const atomicWrite = async (filePath: string, content: string): Promise<void> => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmpPath, content, "utf-8");
  await fs.rename(tmpPath, filePath);
};

export class AgentWorkTraceStore {
  getWorkTraceRootPath(context: AgentWorkTraceProjectionContext): string {
    return path.join(context.memoryDir, "work_traces");
  }

  getManifestPath(context: AgentWorkTraceProjectionContext): string {
    return path.join(this.getWorkTraceRootPath(context), WORK_TRACE_MANIFEST_FILE_NAME);
  }

  buildFileName(source: AgentWorkTraceSource): string {
    if (source.kind === "active") {
      return "work_trace_active.md";
    }
    const index = source.index ?? 0;
    return `work_trace_${String(index).padStart(6, "0")}.md`;
  }

  async writeTraceFile(input: {
    context: AgentWorkTraceProjectionContext;
    source: AgentWorkTraceSource;
    content: string;
    generatedAt: string;
  }): Promise<AgentWorkTraceFile> {
    const fileName = this.buildFileName(input.source);
    const filePath = path.join(this.getWorkTraceRootPath(input.context), fileName);
    await atomicWrite(filePath, input.content);
    return {
      sourceId: input.source.sourceId,
      sourceKind: input.source.kind,
      sourceDisplayName: input.source.displayName,
      fileName,
      filePath,
      recordCount: input.source.recordCount,
      firstTimestamp: toIso(input.source.firstTimestamp),
      lastTimestamp: toIso(input.source.lastTimestamp),
      generatedAt: input.generatedAt,
    };
  }

  async writeManifest(input: {
    context: AgentWorkTraceProjectionContext;
    files: AgentWorkTraceFile[];
    generatedAt: string;
    targetDisplayName: string | null;
  }): Promise<AgentWorkTraceManifest> {
    const manifestPath = this.getManifestPath(input.context);
    const manifest: AgentWorkTraceManifest = {
      schemaVersion: 3,
      target: input.context.target,
      targetDisplayName: input.targetDisplayName,
      generatedAt: input.generatedAt,
      workTraceRootPath: this.getWorkTraceRootPath(input.context),
      manifestPath,
      files: input.files,
    };
    await atomicWrite(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    return manifest;
  }
}
