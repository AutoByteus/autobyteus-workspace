import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { RunModelValidationContext } from "../../llm-management/domain/run-model-selection.js";
import type { PendingRuntimeSwitch } from "../../run-history/store/agent-run-metadata-types.js";

/**
 * The context a stopped run's selection is validated in: the selection's own agent runtime, and the stored model as the
 * "current" one only when that is the run's runtime and no switch is pending. Another agent runtime has no current model, and
 * while a switch is pending the stored model is the pending one, which has never run: the selection is a fresh one (the native
 * capacity rule compares against a current model and is skipped). The one owner of this rule: the standalone updater, the root
 * manager's host validation and the Team and Org saves (autobyteus-348) use it, for a standalone run's metadata or a member's
 * launch alike; a missing workspace validates against the server's working folder, as the saves always did.
 */
export const selectionContextFor = (
  current: Readonly<{
    runtimeKind: RuntimeKind;
    llmModelIdentifier: string;
    workspaceRootPath: string | null;
    pendingRuntimeSwitch?: PendingRuntimeSwitch;
  }>,
  selection: Readonly<{ runtimeKind: RuntimeKind }>,
): RunModelValidationContext => ({
  runtimeKind: selection.runtimeKind,
  currentModelIdentifier: selection.runtimeKind === current.runtimeKind && !current.pendingRuntimeSwitch
    ? current.llmModelIdentifier
    : null,
  workspaceRootPath: current.workspaceRootPath ?? process.cwd(),
});
