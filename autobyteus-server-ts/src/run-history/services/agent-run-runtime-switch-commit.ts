import { isDeepStrictEqual } from "node:util";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { AgentRunMetadataStore } from "../store/agent-run-metadata-store.js";
import type { AgentRunMetadata } from "../store/agent-run-metadata-types.js";

export type AgentRunModelConfigCommitResult =
  | Readonly<{ kind: "committed" | "unchanged"; metadata: AgentRunMetadata }>
  | Readonly<{ kind: "not_found" | "archived" | "failed" | "indeterminate"; metadata: AgentRunMetadata | null }>;

/** The agent runtime, model and model settings a stopped run is saved with (already validated for that runtime). */
export type RunSelectionToCommit = Readonly<{
  runtimeKind: RuntimeKind;
  llmModelIdentifier: string;
  llmConfig: Readonly<Record<string, unknown>> | null;
}>;

const bindingOf = (metadata: AgentRunMetadata) => ({
  runtimeKind: metadata.runtimeKind,
  llmModelIdentifier: metadata.llmModelIdentifier,
  llmConfig: metadata.llmConfig ?? null,
  platformAgentRunId: metadata.platformAgentRunId,
});

/**
 * The metadata a settings save of a stopped run writes (the one place the shape of a switch is decided):
 * - the previous agent runtime again while a switch is pending: the undo. The original session ID comes back, the pending
 *   switch is cleared, and the model and settings chosen in this save are kept;
 * - the run's current agent runtime: a model-only edit (a pending switch stays);
 * - another agent runtime: a switch. The new binding replaces the old with no session ID, and the first previous binding
 *   and switch ID are kept when a switch is already pending.
 */
export const buildRuntimeSwitchMetadata = (input: {
  metadata: AgentRunMetadata;
  selection: RunSelectionToCommit;
  /** The identity of a new switch; ignored when a switch is already pending (it keeps its own). */
  switchId: string;
}): AgentRunMetadata => {
  const { metadata, selection } = input;
  const llmConfig = selection.llmConfig ? structuredClone(selection.llmConfig) : null;
  const { pendingRuntimeSwitch: pending, ...rest } = metadata;
  if (pending && selection.runtimeKind === pending.from.runtimeKind) {
    return { ...rest, runtimeKind: pending.from.runtimeKind, llmModelIdentifier: selection.llmModelIdentifier, llmConfig,
      platformAgentRunId: pending.from.platformAgentRunId };
  }
  if (selection.runtimeKind === metadata.runtimeKind) {
    return { ...metadata, llmModelIdentifier: selection.llmModelIdentifier, llmConfig };
  }
  return {
    ...rest,
    runtimeKind: selection.runtimeKind,
    llmModelIdentifier: selection.llmModelIdentifier,
    llmConfig,
    platformAgentRunId: null,
    pendingRuntimeSwitch: pending ?? { switchId: input.switchId, from: bindingOf(metadata) },
  };
};

export const commitAgentRunRuntimeSwitch = async (input: {
  metadataStore: Pick<AgentRunMetadataStore, "readMetadata" | "writeMetadata">;
  runId: string;
  cataloged: boolean;
  archived: boolean;
  selection: RunSelectionToCommit;
  switchId: string;
}): Promise<AgentRunModelConfigCommitResult> => {
  const metadata = await input.metadataStore.readMetadata(input.runId);
  if (!metadata || !input.cataloged) return { kind: "not_found", metadata };
  if (input.archived) return { kind: "archived", metadata };
  const next = buildRuntimeSwitchMetadata({ metadata, selection: input.selection, switchId: input.switchId });
  if (isDeepStrictEqual(next, metadata)) return { kind: "unchanged", metadata };
  const matches = (stored: AgentRunMetadata | null): boolean => stored !== null && isDeepStrictEqual(stored, next);
  try {
    await input.metadataStore.writeMetadata(input.runId, next);
    const reread = await input.metadataStore.readMetadata(input.runId);
    if (!reread) return { kind: "indeterminate", metadata };
    return matches(reread) ? { kind: "committed", metadata: reread } : { kind: "failed", metadata: reread };
  } catch {
    const reread = await input.metadataStore.readMetadata(input.runId).catch(() => null);
    if (matches(reread)) return { kind: "committed", metadata: reread! };
    return { kind: reread ? "failed" : "indeterminate", metadata: reread ?? metadata };
  }
};
