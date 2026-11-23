import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { RunHandOver, RunModelValidationContext } from "../../llm-management/domain/run-model-selection.js";
import type { PendingRuntimeSwitch } from "../../run-history/store/agent-run-metadata-types.js";

/**
 * The context a stopped run's selection is validated in: the selection's own agent runtime, and the reference model —
 * the model the record's session last ran on (DEC-005, autobyteus-53) — as the "current" one only when that is also the
 * selection's runtime. The reference is the pending switch's `from` while one is pending (it has never run on the new
 * binding), otherwise the stored binding. Another agent runtime than the reference has no current model: the native
 * capacity rule compares against a current model and is skipped, and a fresh session is the only outcome it can give.
 * `handOver` is the record's own capability (`available`, `unavailable` or `no_session`; the caller states it, this
 * function does not decide it). The one owner of this rule: the standalone updater, the root manager's agent validation
 * and the Team and Org saves (autobyteus-348) use it, for a standalone run's metadata or a member's launch alike; a
 * missing workspace validates against the server's working folder, as the saves always did.
 */
export const selectionContextFor = (
  current: Readonly<{
    runtimeKind: RuntimeKind;
    llmModelIdentifier: string;
    workspaceRootPath: string | null;
    pendingRuntimeSwitch?: PendingRuntimeSwitch;
  }>,
  selection: Readonly<{ runtimeKind: RuntimeKind }>,
  handOver: RunHandOver,
): RunModelValidationContext => {
  const reference = current.pendingRuntimeSwitch
    ? { runtimeKind: current.pendingRuntimeSwitch.from.runtimeKind, llmModelIdentifier: current.pendingRuntimeSwitch.from.llmModelIdentifier }
    : { runtimeKind: current.runtimeKind, llmModelIdentifier: current.llmModelIdentifier };
  return {
    runtimeKind: selection.runtimeKind,
    currentModelIdentifier: selection.runtimeKind === reference.runtimeKind ? reference.llmModelIdentifier : null,
    workspaceRootPath: current.workspaceRootPath ?? process.cwd(),
    handOver,
  };
};
