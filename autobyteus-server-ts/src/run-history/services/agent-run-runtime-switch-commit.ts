import { isDeepStrictEqual } from "node:util";
import { applyRuntimeSelection, type RuntimeSelection } from "../domain/runtime-selection-rule.js";
import type { AgentRunMetadataStore } from "../store/agent-run-metadata-store.js";
import type { AgentRunMetadata } from "../store/agent-run-metadata-types.js";

export type AgentRunModelConfigCommitResult =
  | Readonly<{ kind: "committed" | "unchanged"; metadata: AgentRunMetadata }>
  | Readonly<{ kind: "not_found" | "archived" | "failed" | "indeterminate"; metadata: AgentRunMetadata | null }>;

/** The agent runtime, model and model settings a stopped run is saved with (already validated for that runtime). */
export type RunSelectionToCommit = RuntimeSelection;

/** The metadata a settings save of a stopped run writes: the shared rule (`applyRuntimeSelection`) over the metadata's own fields. */
export const buildRuntimeSwitchMetadata = (input: {
  metadata: AgentRunMetadata;
  selection: RunSelectionToCommit;
  /** The identity of a new switch; ignored when a switch is already pending (it keeps its own). */
  switchId: string;
}): AgentRunMetadata => {
  const { metadata } = input;
  const { pendingRuntimeSwitch: _pending, ...rest } = metadata;
  const next = applyRuntimeSelection(
    {
      binding: {
        runtimeKind: metadata.runtimeKind,
        llmModelIdentifier: metadata.llmModelIdentifier,
        llmConfig: metadata.llmConfig ?? null,
        platformAgentRunId: metadata.platformAgentRunId,
      },
      ...(metadata.pendingRuntimeSwitch ? { pendingRuntimeSwitch: metadata.pendingRuntimeSwitch } : {}),
    },
    input.selection,
    input.switchId,
  );
  return { ...rest, ...next.binding, ...(next.pendingRuntimeSwitch ? { pendingRuntimeSwitch: next.pendingRuntimeSwitch } : {}) };
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
