import crypto from "node:crypto";
import type { AgentWorkTraceFile, AgentWorkTracePackage, AgentWorkTraceProjectionContext } from "../domain/work-traces.js";
import { AgentWorkTraceRenderer } from "./agent-work-trace-renderer.js";
import { AgentWorkTraceSourceReader } from "./agent-work-trace-source-reader.js";
import { AgentWorkTraceStore } from "./agent-work-trace-store.js";

const normalizeTargetDisplayName = (value: string | null | undefined): string | null => {
  const normalized = value?.trim().replace(/\s+/g, " ") ?? "";
  return normalized.length > 0 ? normalized : null;
};

const sha256 = (value: string): string =>
  crypto.createHash("sha256").update(value).digest("hex");

export class AgentWorkTraceProjectionService {
  constructor(private readonly deps: {
    sourceReader?: AgentWorkTraceSourceReader;
    renderer?: AgentWorkTraceRenderer;
    store?: AgentWorkTraceStore;
  } = {}) {}

  async ensureCurrent(context: AgentWorkTraceProjectionContext): Promise<AgentWorkTracePackage> {
    const generatedAt = new Date().toISOString();
    const targetDisplayName = normalizeTargetDisplayName(context.targetDisplayName);
    const sources = await this.sourceReader.listSources(context);
    const files: AgentWorkTraceFile[] = [];
    const renderedEvidence: Array<{ sourceId: string; contentHash: string }> = [];

    for (const source of sources) {
      const content = this.renderer.renderSource(source);
      files.push(await this.store.writeTraceFile({ context, source, content, generatedAt }));
      renderedEvidence.push({
        sourceId: source.sourceId,
        contentHash: sha256(content),
      });
    }

    const manifest = await this.store.writeManifest({
      context,
      files,
      generatedAt,
      targetDisplayName,
    });
    const summaryHash = sha256(JSON.stringify({
      target: context.target,
      files: renderedEvidence,
    }));

    return {
      target: context.target,
      targetDisplayName,
      workTraceRootPath: manifest.workTraceRootPath,
      manifestPath: manifest.manifestPath,
      manifest,
      summaryHash,
    };
  }

  private get sourceReader(): AgentWorkTraceSourceReader {
    return this.deps.sourceReader ?? new AgentWorkTraceSourceReader();
  }

  private get renderer(): AgentWorkTraceRenderer {
    return this.deps.renderer ?? new AgentWorkTraceRenderer();
  }

  private get store(): AgentWorkTraceStore {
    return this.deps.store ?? new AgentWorkTraceStore();
  }
}
