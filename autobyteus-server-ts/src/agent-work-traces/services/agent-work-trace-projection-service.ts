import crypto from "node:crypto";
import type { AgentWorkTraceFile, AgentWorkTracePackage, AgentWorkTraceProjectionContext } from "../domain/work-traces.js";
import { AgentWorkTraceRenderer } from "./agent-work-trace-renderer.js";
import type { AgentWorkTraceToolProjection } from "./agent-work-trace-renderer.js";
import { AgentWorkTraceSourceReader } from "./agent-work-trace-source-reader.js";
import { AgentWorkTraceStore } from "./agent-work-trace-store.js";
import { buildToolInteractions } from "autobyteus-ts/memory/tool-interaction-builder.js";
import { toolCallIdentityKey } from "autobyteus-ts/memory/models/tool-call-identity.js";
import type { MemoryTraceEvent } from "../../agent-memory/domain/models.js";
import type { AgentWorkTraceSource } from "../domain/work-traces.js";

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
    const toolProjections = this.buildToolProjections(sources);
    const files: AgentWorkTraceFile[] = [];
    const renderedEvidence: Array<{ sourceId: string; contentHash: string }> = [];

    for (const source of sources) {
      const content = this.renderer.renderSource(source, toolProjections.get(source.sourceId));
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

  private buildToolProjections(sources: AgentWorkTraceSource[]): Map<string, AgentWorkTraceToolProjection> {
    const recordsById = new Map<string, MemoryTraceEvent>();
    const sourceIdByTraceId = new Map<string, string>();
    for (const source of sources) {
      for (const record of source.records) {
        if (!record.id || (recordsById.has(record.id) && source.kind !== "active")) continue;
        recordsById.set(record.id, record);
        sourceIdByTraceId.set(record.id, source.sourceId);
      }
    }
    const corpus = [...recordsById.values()].sort((left, right) =>
      left.ts - right.ts || left.turnId.localeCompare(right.turnId) || left.seq - right.seq ||
      (left.id ?? "").localeCompare(right.id ?? ""),
    );
    const interactionByIdentity = new Map(buildToolInteractions(corpus).map((interaction) => [
      toolCallIdentityKey({ turnId: interaction.turnId!, toolCallId: interaction.toolCallId }),
      interaction,
    ]));
    const includedKeysBySource = new Map(sources.map((source) => [source.sourceId, new Set<string>()]));
    for (const [key, interaction] of interactionByIdentity) {
      const anchorId = interaction.anchorRawTraceId;
      const sourceId = anchorId ? sourceIdByTraceId.get(anchorId) : null;
      if (sourceId) includedKeysBySource.get(sourceId)?.add(key);
    }
    return new Map(sources.map((source) => [source.sourceId, {
      interactionByIdentity,
      traceById: recordsById,
      includedToolIdentityKeys: includedKeysBySource.get(source.sourceId)!,
    }]));
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
