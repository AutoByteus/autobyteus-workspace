import crypto from "node:crypto";
import { RawTraceWorkTraceSourceReader } from "../../../agent-memory/services/raw-trace-work-trace-source-reader.js";
import type { SelfEvolutionTargetContext } from "../self-evolution-target-context-resolver.js";
import type { SelfEvolutionWorkTraceFile, SelfEvolutionWorkTracePackage } from "../../domain/work-traces.js";
import { SelfEvolutionWorkTraceRenderer } from "./self-evolution-work-trace-renderer.js";
import { SelfEvolutionWorkTraceStore } from "./self-evolution-work-trace-store.js";

export class SelfEvolutionWorkTraceProjectionService {
  constructor(private readonly deps: {
    sourceReader?: RawTraceWorkTraceSourceReader;
    renderer?: SelfEvolutionWorkTraceRenderer;
    store?: SelfEvolutionWorkTraceStore;
  } = {}) {}

  async ensureCurrent(context: SelfEvolutionTargetContext): Promise<SelfEvolutionWorkTracePackage> {
    const generatedAt = new Date().toISOString();
    const existing = await this.store.readManifest(context);
    const existingBySource = new Map(
      (existing?.files ?? []).map((file) => [file.sourceId, file]),
    );
    const sources = await this.sourceReader.listSources(context);
    const files: SelfEvolutionWorkTraceFile[] = [];

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

  private get sourceReader(): RawTraceWorkTraceSourceReader {
    return this.deps.sourceReader ?? new RawTraceWorkTraceSourceReader();
  }

  private get renderer(): SelfEvolutionWorkTraceRenderer {
    return this.deps.renderer ?? new SelfEvolutionWorkTraceRenderer();
  }

  private get store(): SelfEvolutionWorkTraceStore {
    return this.deps.store ?? new SelfEvolutionWorkTraceStore();
  }
}
