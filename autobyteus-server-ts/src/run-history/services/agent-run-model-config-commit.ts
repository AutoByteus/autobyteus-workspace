import { computeAgentRunModelConfigRevision } from "../domain/run-model-config-revision.js";
import type { AgentRunMetadataStore } from "../store/agent-run-metadata-store.js";
import type { AgentRunMetadata } from "../store/agent-run-metadata-types.js";

export type AgentRunModelConfigCommitResult =
  | Readonly<{ kind: "committed" | "unchanged"; metadata: AgentRunMetadata; configurationRevision: string }>
  | Readonly<{ kind: "not_found" | "archived" | "stale" | "failed" | "indeterminate"; metadata: AgentRunMetadata | null; configurationRevision: string | null }>;

export const commitAgentRunModelConfig = async (input: {
  metadataStore: Pick<AgentRunMetadataStore, "readMetadata" | "writeMetadata">;
  runId: string;
  cataloged: boolean;
  archived: boolean;
  expectedConfigurationRevision: string;
  llmConfig: Readonly<Record<string, unknown>> | null;
}): Promise<AgentRunModelConfigCommitResult> => {
  const metadata = await input.metadataStore.readMetadata(input.runId);
  if (!metadata || !input.cataloged) {
    return {
      kind: "not_found",
      metadata,
      configurationRevision: metadata ? computeAgentRunModelConfigRevision(metadata) : null,
    };
  }
  const currentRevision = computeAgentRunModelConfigRevision(metadata);
  if (input.archived) return { kind: "archived", metadata, configurationRevision: currentRevision };
  if (currentRevision !== input.expectedConfigurationRevision) {
    return { kind: "stale", metadata, configurationRevision: currentRevision };
  }
  const nextMetadata: AgentRunMetadata = {
    ...metadata,
    llmConfig: input.llmConfig ? structuredClone(input.llmConfig) : null,
  };
  const nextRevision = computeAgentRunModelConfigRevision(nextMetadata);
  if (nextRevision === currentRevision) {
    return { kind: "unchanged", metadata, configurationRevision: currentRevision };
  }
  try {
    await input.metadataStore.writeMetadata(input.runId, nextMetadata);
    const reread = await input.metadataStore.readMetadata(input.runId);
    if (!reread || computeAgentRunModelConfigRevision(reread) !== nextRevision) {
      return { kind: "failed", metadata, configurationRevision: currentRevision };
    }
    return { kind: "committed", metadata: reread, configurationRevision: nextRevision };
  } catch {
    const reread = await input.metadataStore.readMetadata(input.runId);
    const rereadRevision = reread ? computeAgentRunModelConfigRevision(reread) : null;
    if (reread && rereadRevision === nextRevision) {
      return { kind: "committed", metadata: reread, configurationRevision: nextRevision };
    }
    return {
      kind: reread ? "failed" : "indeterminate",
      metadata: reread ?? metadata,
      configurationRevision: rereadRevision ?? currentRevision,
    };
  }
};
