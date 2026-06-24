import fs from "node:fs/promises";
import path from "node:path";
import type { SelfEvolutionTargetContext } from "../self-evolution-target-context-resolver.js";
import type { SelfEvolutionWorkTraceFile, SelfEvolutionWorkTraceManifest, SelfEvolutionWorkTraceSource } from "../../domain/work-traces.js";

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

export class SelfEvolutionWorkTraceStore {
  getWorkTraceRootPath(context: SelfEvolutionTargetContext): string {
    return path.join(context.memoryDir, "self_evolution", "work_traces");
  }

  getManifestPath(context: SelfEvolutionTargetContext): string {
    return path.join(this.getWorkTraceRootPath(context), WORK_TRACE_MANIFEST_FILE_NAME);
  }

  buildFileName(source: SelfEvolutionWorkTraceSource): string {
    if (source.kind === "active") {
      return "work_trace_active.md";
    }
    const index = source.index ?? 0;
    return `work_trace_${String(index).padStart(6, "0")}.md`;
  }

  async readManifest(context: SelfEvolutionTargetContext): Promise<SelfEvolutionWorkTraceManifest | null> {
    try {
      const raw = await fs.readFile(this.getManifestPath(context), "utf-8");
      return JSON.parse(raw) as SelfEvolutionWorkTraceManifest;
    } catch (error) {
      if (String(error).includes("ENOENT")) {
        return null;
      }
      throw error;
    }
  }

  async writeTraceFile(input: {
    context: SelfEvolutionTargetContext;
    source: SelfEvolutionWorkTraceSource;
    content: string;
    generatedAt: string;
  }): Promise<SelfEvolutionWorkTraceFile> {
    const fileName = this.buildFileName(input.source);
    const filePath = path.join(this.getWorkTraceRootPath(input.context), fileName);
    await atomicWrite(filePath, input.content);
    return {
      sourceId: input.source.sourceId,
      sourceKind: input.source.kind,
      sourceFingerprint: input.source.fingerprint,
      fileName,
      filePath,
      recordCount: input.source.recordCount,
      firstTimestamp: toIso(input.source.firstTimestamp),
      lastTimestamp: toIso(input.source.lastTimestamp),
      generatedAt: input.generatedAt,
    };
  }

  async writeManifest(input: {
    context: SelfEvolutionTargetContext;
    files: SelfEvolutionWorkTraceFile[];
    generatedAt: string;
  }): Promise<SelfEvolutionWorkTraceManifest> {
    const manifestPath = this.getManifestPath(input.context);
    const manifest: SelfEvolutionWorkTraceManifest = {
      schemaVersion: 1,
      target: input.context.target,
      generatedAt: input.generatedAt,
      workTraceRootPath: this.getWorkTraceRootPath(input.context),
      manifestPath,
      files: input.files,
    };
    await atomicWrite(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    return manifest;
  }
}
