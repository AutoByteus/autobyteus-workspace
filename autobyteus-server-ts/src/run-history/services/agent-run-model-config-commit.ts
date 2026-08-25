import { isDeepStrictEqual } from "node:util";
import type { AgentRunMetadataStore } from "../store/agent-run-metadata-store.js";
import type { AgentRunMetadata } from "../store/agent-run-metadata-types.js";

export type AgentRunModelConfigCommitResult =
  | Readonly<{ kind: "committed" | "unchanged"; metadata: AgentRunMetadata }>
  | Readonly<{ kind: "not_found" | "archived" | "failed" | "indeterminate"; metadata: AgentRunMetadata | null }>;

export const commitAgentRunModelConfig = async (input: {
  metadataStore: Pick<AgentRunMetadataStore, "readMetadata" | "writeMetadata">;
  runId: string;
  cataloged: boolean;
  archived: boolean;
  llmConfig: Readonly<Record<string, unknown>> | null;
}): Promise<AgentRunModelConfigCommitResult> => {
  const metadata = await input.metadataStore.readMetadata(input.runId);
  if (!metadata || !input.cataloged) return { kind: "not_found", metadata };
  if (input.archived) return { kind: "archived", metadata };
  const nextLlmConfig = input.llmConfig ? structuredClone(input.llmConfig) : null;
  if (isDeepStrictEqual(metadata.llmConfig ?? null, nextLlmConfig)) {
    return { kind: "unchanged", metadata };
  }
  const nextMetadata: AgentRunMetadata = {
    ...metadata,
    llmConfig: nextLlmConfig,
  };
  try {
    await input.metadataStore.writeMetadata(input.runId, nextMetadata);
    const reread = await input.metadataStore.readMetadata(input.runId);
    if (!reread || !isDeepStrictEqual(reread.llmConfig ?? null, nextLlmConfig)) {
      return { kind: "failed", metadata };
    }
    return { kind: "committed", metadata: reread };
  } catch {
    const reread = await input.metadataStore.readMetadata(input.runId);
    if (reread && isDeepStrictEqual(reread.llmConfig ?? null, nextLlmConfig)) {
      return { kind: "committed", metadata: reread };
    }
    return {
      kind: reread ? "failed" : "indeterminate",
      metadata: reread ?? metadata,
    };
  }
};
