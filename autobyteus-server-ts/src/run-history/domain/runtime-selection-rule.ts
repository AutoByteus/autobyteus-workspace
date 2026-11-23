import { isDeepStrictEqual } from "node:util";
import { SETTINGS_LAUNCH_SOURCE } from "../../agent-collaboration/domain/launch-configuration-source.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { RunContinuation } from "../../llm-management/domain/run-model-selection.js";
import type { PendingRuntimeSwitch, RunProviderBinding } from "../store/agent-run-metadata-types.js";
import type { ConfiguredAgentExecutionNode } from "./run-execution-tree-shared-records.js";

/**
 * The one rule of an agent runtime switch for every record that holds a binding (autobyteus-316 for a standalone run,
 * autobyteus-348 for Team members, Org members and delegated copies): what a settings save does to the binding
 * (`applyRuntimeSelection`) and what the activation's durable commit does to it (`commitRuntimeSwitch`). Pure: each
 * record kind adapts its own fields to a `RuntimeBindingState` and back, and finds its own records and writes them.
 * Since autobyteus-53 the save states only the continuation (`RuntimeSelection.continuation`, decided by
 * `RunModelSelectionService`); this rule applies it instead of inferring it from whether the agent runtime differs.
 */

/** A record's binding and its pending switch, whatever fields the record keeps them in. */
export type RuntimeBindingState = Readonly<{
  binding: RunProviderBinding;
  pendingRuntimeSwitch?: PendingRuntimeSwitch;
}>;

/** The agent runtime, model and model settings a record is saved with (already validated for that runtime), and how it continues. */
export type RuntimeSelection = Readonly<{
  runtimeKind: RuntimeKind;
  llmModelIdentifier: string;
  llmConfig: Readonly<Record<string, unknown>> | null;
  continuation: RunContinuation;
}>;

const withoutPending = (state: RuntimeBindingState): Omit<RuntimeBindingState, "pendingRuntimeSwitch"> => {
  const { pendingRuntimeSwitch: _pending, ...rest } = state;
  return rest;
};

/**
 * A settings save of a stopped record, applying the decided continuation (autobyteus-53 REQ-003/REQ-004):
 * - `same_session`: the session the record last ran on goes on — the pending switch's `from` while one is pending (the
 *   undo, or a re-edit that resumed it; the pending switch is cleared), otherwise the record's own binding (a plain
 *   model-only edit). The session's agent runtime, and its session ID, are kept; only the model and its settings change.
 *   The rule throws if `selection.runtimeKind` is not that session's own runtime: a save can continue only its own
 *   session, never invent one on another agent runtime (a wiring mistake must fail loudly, never silently).
 * - `hand_over`: a switch (same agent runtime or another). The new binding replaces the old with no session ID, and the
 *   first previous binding and switch ID are kept when a switch is already pending (the pending switch's `from`, e.g. AC-006).
 * `switchId` is the identity of a NEW switch; it is ignored when a switch is already pending (that one keeps its own).
 */
export const applyRuntimeSelection = (
  state: RuntimeBindingState,
  selection: RuntimeSelection,
  switchId: string,
): RuntimeBindingState => {
  const llmConfig = selection.llmConfig ? structuredClone(selection.llmConfig) : null;
  const pending = state.pendingRuntimeSwitch;
  if (selection.continuation === "same_session") {
    const session = pending ? pending.from : state.binding;
    if (selection.runtimeKind !== session.runtimeKind) {
      throw new Error("A session continues only on its own agent runtime.");
    }
    return {
      binding: {
        runtimeKind: session.runtimeKind,
        llmModelIdentifier: selection.llmModelIdentifier,
        llmConfig,
        platformAgentRunId: session.platformAgentRunId,
      },
    };
  }
  return {
    binding: {
      runtimeKind: selection.runtimeKind,
      llmModelIdentifier: selection.llmModelIdentifier,
      llmConfig,
      platformAgentRunId: null,
    },
    pendingRuntimeSwitch: pending ?? {
      switchId,
      from: {
        runtimeKind: state.binding.runtimeKind,
        llmModelIdentifier: state.binding.llmModelIdentifier,
        llmConfig: state.binding.llmConfig ?? null,
        platformAgentRunId: state.binding.platformAgentRunId,
      },
    },
  };
};

export type RuntimeSwitchConflictReason = "not_pending" | "switch_id_mismatch";

export type RuntimeSwitchCommitResult =
  | Readonly<{ kind: "committed"; state: RuntimeBindingState }>
  | Readonly<{ kind: "conflict"; reason: RuntimeSwitchConflictReason }>;

const conflictOf = (pending: PendingRuntimeSwitch | undefined, switchId: string): RuntimeSwitchConflictReason | null => {
  if (!pending) return "not_pending";
  return pending.switchId === switchId ? null : "switch_id_mismatch";
};

/**
 * The activation's durable commit on a binding: the pending switch must be the one the activation made (`switchId`), the
 * session ID becomes the new one (`null` for the native agent runtime, which has no provider session) and the pending
 * switch is removed, so the caller writes both in one write. A binding without that pending switch is a conflict, never a
 * silent no-op: a run must not be published with a binding that was never stored.
 */
export const commitRuntimeSwitch = (
  state: RuntimeBindingState,
  switchId: string,
  platformAgentRunId: string | null,
): RuntimeSwitchCommitResult => {
  const reason = conflictOf(state.pendingRuntimeSwitch, switchId);
  if (reason) return { kind: "conflict", reason };
  return { kind: "committed", state: { ...withoutPending(state), binding: { ...state.binding, platformAgentRunId } } };
};

export type RecordRuntimeSwitchCommitResult<T> =
  | Readonly<{ kind: "committed"; record: T }>
  | Readonly<{ kind: "conflict"; reason: RuntimeSwitchConflictReason }>;

/**
 * The same commit on a saved member record (a configured member of a Team or Org, a delegated copy's Agent or Team member):
 * all three keep the session ID and the pending switch as top-level fields, whatever fields hold the rest of the binding.
 * Each tree family only finds the record; this is the one step that changes it.
 */
export const commitRuntimeSwitchOnRecord = <T extends Readonly<{
  platformAgentRunId: string | null;
  pendingRuntimeSwitch?: PendingRuntimeSwitch;
}>>(record: T, switchId: string, platformAgentRunId: string | null): RecordRuntimeSwitchCommitResult<T> => {
  const reason = conflictOf(record.pendingRuntimeSwitch, switchId);
  if (reason) return { kind: "conflict", reason };
  const { pendingRuntimeSwitch: _pending, ...rest } = record;
  return { kind: "committed", record: { ...rest, platformAgentRunId } as unknown as T };
};

/**
 * A settings save on a configured member of a Team or Org (autobyteus-348): the shared rule over the node's own fields. The
 * node's `launchConfiguration` holds the selection (the NEW one while a switch is pending), `platformAgentRunId` the session,
 * `pendingRuntimeSwitch` the previous binding; tool approval and workspace never change. A save that changes the binding
 * records the member's source as the Settings edit (V-11).
 */
export const applySelectionToConfiguredMember = (
  member: ConfiguredAgentExecutionNode,
  selection: RuntimeSelection,
  switchId: string,
): ConfiguredAgentExecutionNode => {
  const launch = member.launchConfiguration;
  const before: RuntimeBindingState = {
    binding: { runtimeKind: launch.runtimeKind, llmModelIdentifier: launch.llmModelIdentifier, llmConfig: launch.llmConfig, platformAgentRunId: member.platformAgentRunId },
    ...(member.pendingRuntimeSwitch ? { pendingRuntimeSwitch: member.pendingRuntimeSwitch } : {}),
  };
  const next = applyRuntimeSelection(before, selection, switchId);
  const { pendingRuntimeSwitch: _pending, launchSource, ...rest } = member;
  return {
    ...rest,
    // An edit becomes the member's own launch, recorded as one (design V-11): never its team's origin again.
    ...(isDeepStrictEqual(next, before) ? (launchSource ? { launchSource } : {}) : { launchSource: SETTINGS_LAUNCH_SOURCE }),
    platformAgentRunId: next.binding.platformAgentRunId,
    launchConfiguration: Object.freeze({
      ...launch,
      runtimeKind: next.binding.runtimeKind,
      llmModelIdentifier: next.binding.llmModelIdentifier,
      llmConfig: next.binding.llmConfig,
    }),
    ...(next.pendingRuntimeSwitch ? { pendingRuntimeSwitch: next.pendingRuntimeSwitch } : {}),
  };
};
