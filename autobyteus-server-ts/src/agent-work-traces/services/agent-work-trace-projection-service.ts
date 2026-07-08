import crypto from "node:crypto";
import type { AgentWorkTraceFile, AgentWorkTracePackage, AgentWorkTraceProjectionContext } from "../domain/work-traces.js";
import { AgentWorkTraceRenderer } from "./agent-work-trace-renderer.js";
import { AgentWorkTraceSourceReader } from "./agent-work-trace-source-reader.js";
import { AgentWorkTraceStore } from "./agent-work-trace-store.js";

export class AgentWorkTraceProjectionService {
  constructor(private readonly deps: {
    sourceReader?: AgentWorkTraceSourceReader;
    renderer?: AgentWorkTraceRenderer;
    store?: AgentWorkTraceStore;
  } = {}) {}

  async ensureCurrent(context: AgentWorkTraceProjectionContext): Promise<AgentWorkTracePackage> {
    const generatedAt = new Date().toISOString();
    const existing = await this.store.readManifest(context);
    const existingBySource = new Map(
      (existing?.files ?? []).map((file) => [file.sourceId, file]),
    );
    const sources = await this.sourceReader.listSources(context);
    const files: AgentWorkTraceFile[] = [];

    for (const source of sources) {
      const prior = existingBySource.get(source.sourceId);
      if (source.kind === "archive_segment" && prior?.sourceFingerprint === source.fingerprint) {
        files.push(prior);
        continue;
      }
      const content = this.renderer.renderSource(source);
      files.push(await this.store.writeTraceFile({ context, source, content, generatedAt }));
    }

    const manifest = await this.store.writeManifest({ context, files, generatedAt });
    const summaryHash = crypto.createHash("sha256")
      .update(JSON.stringify({
        target: context.target,
        files: manifest.files.map((file) => ({
          sourceId: file.sourceId,
          fingerprint: file.sourceFingerprint,
          recordCount: file.recordCount,
        })),
      }))
      .digest("hex");

    return {
      target: context.target,
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
