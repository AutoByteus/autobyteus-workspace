import { isDeepStrictEqual } from "node:util";
import { applyRuntimeSelection, type RuntimeSelection } from "../domain/runtime-selection-rule.js";
import { SETTINGS_LAUNCH_SOURCE, type LaunchConfigurationSource } from "../../agent-collaboration/domain/launch-configuration-source.js";
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
  /**
   * The source a changing commit records (autobyteus-646 R-19): a person's Save is `settings` (the default); an automatic
   * switch names who chose its launch.
   */
  launchSource?: LaunchConfigurationSource;
}): AgentRunMetadata => {
  const { metadata } = input;
  const { pendingRuntimeSwitch: _pending, launchSource, ...rest } = metadata;
  const before = {
    binding: {
      runtimeKind: metadata.runtimeKind,
      llmModelIdentifier: metadata.llmModelIdentifier,
      llmConfig: metadata.llmConfig ?? null,
      platformAgentRunId: metadata.platformAgentRunId,
    },
    ...(metadata.pendingRuntimeSwitch ? { pendingRuntimeSwitch: metadata.pendingRuntimeSwitch } : {}),
  };
  const next = applyRuntimeSelection(before, input.selection, input.switchId);
  return {
    ...rest,
    // An edit becomes the run's own launch, recorded as one (design V-11): the source it had described the launch it replaces.
    ...(isDeepStrictEqual(next, before) ? (launchSource ? { launchSource } : {}) : { launchSource: input.launchSource ?? SETTINGS_LAUNCH_SOURCE }),
    ...next.binding,
    ...(next.pendingRuntimeSwitch ? { pendingRuntimeSwitch: next.pendingRuntimeSwitch } : {}),
  };
};

export const commitAgentRunRuntimeSwitch = async (input: {
  metadataStore: Pick<AgentRunMetadataStore, "readMetadata" | "writeMetadata">;
  runId: string;
  cataloged: boolean;
  archived: boolean;
  selection: RunSelectionToCommit;
  switchId: string;
  launchSource?: LaunchConfigurationSource;
}): Promise<AgentRunModelConfigCommitResult> => {
  const metadata = await input.metadataStore.readMetadata(input.runId);
  if (!metadata || !input.cataloged) return { kind: "not_found", metadata };
  if (input.archived) return { kind: "archived", metadata };
  const next = buildRuntimeSwitchMetadata({ metadata, selection: input.selection, switchId: input.switchId,
    ...(input.launchSource ? { launchSource: input.launchSource } : {}) });
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
