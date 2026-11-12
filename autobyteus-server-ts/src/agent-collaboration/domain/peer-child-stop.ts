import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { RunModelOptions } from "../../llm-management/domain/run-model-selection.js";
import type { RunModelConfigUpdateOutcome } from "../../run-history/domain/run-model-config.js";

/**
 * A delegator's Settings and Stop on the runs it delegated to (design DS-8, SR-039). Each command goes to the child's
 * own run: a change is that run's ordinary stopped-run Save, a Stop its ordinary Stop.
 */

/** A delegated run's identity: exactly one of the two. */
export type DelegatedRunReference = Readonly<{ agentRunId: string }> | Readonly<{ teamRunId: string }>;

/** A launch choice: the agent runtime (its current one, the previous one for an undo, or another for a switch), the model and its settings. */
export type DelegatedLaunchSelectionValue = Readonly<{
  runtimeKind: RuntimeKind;
  llmModelIdentifier: string;
  llmConfig: Readonly<Record<string, unknown>> | null;
}>;

/** One row's change: an agent's own choice (`agentRunId`) or a delegated team's team-level one (`teamRunId`). */
export type DelegatedLaunchChange = Readonly<{
  agentRunId?: string | null;
  teamRunId?: string | null;
  selection: DelegatedLaunchSelectionValue;
}>;

/** The outcome vocabulary of model-setting Saves, plus a delegated run that is running (AR-001). */
export type DelegatedLaunchUpdateOutcome = RunModelConfigUpdateOutcome | "COPY_RUNNING";

export type DelegatedStopOutcome = "STOPPED" | "ALREADY_STOPPED" | "NOT_FOUND" | "ROOT_NOT_ACTIVE";

export type DelegatedStopResult = Readonly<{
  outcome: DelegatedStopOutcome;
  message: string;
  /** Kept for the API's shape: every delegated run is stopped by its identity, so none is left unattributed. */
  notStoppedUnattributed: number;
}>;

/** Model options of one editable row: an agent (`scope: "agent"`) or a delegated team's team level. */
export type DelegatedLaunchModelOptions = RunModelOptions & Readonly<{
  scope: "agent" | "team";
  agentRunId: string | null;
  teamRunId: string | null;
}>;
