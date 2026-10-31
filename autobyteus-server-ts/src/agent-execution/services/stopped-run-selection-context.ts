import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { RunModelValidationContext } from "../../llm-management/domain/run-model-selection.js";
import type { AgentRunMetadata } from "../../run-history/store/agent-run-metadata-types.js";

/**
 * The context a stopped run's selection is validated in: the selection's own agent runtime, and the stored model as the
 * "current" one only when that is the run's runtime. Another agent runtime has no current model, so the selection is a fresh
 * one (the native capacity rule compares against a current model and is skipped). The one owner of this rule: the updater and
 * the root manager's host validation use it.
 */
export const selectionContextFor = (
  metadata: Pick<AgentRunMetadata, "runtimeKind" | "llmModelIdentifier" | "workspaceRootPath">,
  selection: Readonly<{ runtimeKind: RuntimeKind }>,
): RunModelValidationContext => ({
  runtimeKind: selection.runtimeKind,
  currentModelIdentifier: selection.runtimeKind === metadata.runtimeKind ? metadata.llmModelIdentifier : null,
  workspaceRootPath: metadata.workspaceRootPath,
});
