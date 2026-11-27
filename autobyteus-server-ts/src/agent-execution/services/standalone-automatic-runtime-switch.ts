import { randomUUID } from "node:crypto";
import type { RunContinuation, RunModelSelection } from "../../llm-management/domain/run-model-selection.js";
import type { RunModelSelectionValidationResult, RunModelSelectionValidator } from "../../llm-management/services/run-model-selection-service.js";
import type { AgentRunHistoryCatalogService } from "../../run-history/services/agent-run-history-catalog-service.js";
import type { AgentRunMetadataService } from "../../run-history/services/agent-run-metadata-service.js";
import type { AgentRunMetadata, RuntimeSwitchCause } from "../../run-history/store/agent-run-metadata-types.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { AgentRunManager } from "./agent-run-manager.js";
import { selectionContextFor } from "./stopped-run-selection-context.js";

/** An automatic runtime switch of a standalone run (autobyteus-646 R-11): from the failed launch to the chosen one. */
export type AutomaticRuntimeSwitchInput = Readonly<{
  agentRunId: string;
  /** The launch that failed (the event's runtime and model): the switch acts only while the run is still on it (R-12). */
  from: Readonly<{ runtimeKind: string; llmModelIdentifier: string }>;
  launch: Readonly<{ runtimeKind: RuntimeKind; llmModelIdentifier: string }>;
  cause: RuntimeSwitchCause;
}>;

/** The switch's own outcomes and texts (for C-2 `switch_failed` and the log); never a person's Settings texts. */
export type AutomaticRuntimeSwitchResult =
  | Readonly<{ kind: "switched"; metadata: AgentRunMetadata }>
  | Readonly<{ kind: "already_switched" }>
  | Readonly<{ kind: "refused"; reason: string }>;

type Planned = Readonly<{ kind: "planned"; selection: RunModelSelection; continuation: RunContinuation }>;

/** Why a fresh selection can't run now, in the switch's own words (both roots' automatic switch). */
export const automaticSwitchRefusal = (llmModelIdentifier: string, result: RunModelSelectionValidationResult): string =>
  `${llmModelIdentifier} can't run now: ${validationReason(result)}`;

const validationReason = (result: RunModelSelectionValidationResult): string => {
  switch (result.kind) {
    case "model_unavailable": return "its runtime does not offer it";
    case "model_list_unavailable": return "its runtime's model list could not be read";
    case "invalid": return result.errors.map((error) => error.message).join("; ") || "its settings are invalid";
    default: return result.kind;
  }
};

/**
 * The automatic switch of a standalone Agent run (autobyteus-646 R-11), not the person's Settings Save: its own checks
 * and texts, then the commit primitive (`commitRunRuntimeSwitch`) writing the new launch with its pending switch and
 * cause. Run by the standalone lifecycle in the run's transition lane. Every run the node runs may switch this way, a
 * run another node delegated here included (CM-10: its node owns it); `canSwitchRuntime` is the person's Settings rule.
 */
export class StandaloneAutomaticRuntimeSwitch {
  constructor(private readonly deps: Readonly<{
    agentRunManager: Pick<AgentRunManager, "getActiveRun">;
    metadataService: Pick<AgentRunMetadataService, "readMetadataState">;
    historyCatalogService: Pick<AgentRunHistoryCatalogService, "getCatalogRow" | "commitRunRuntimeSwitch">;
    modelSelectionValidator: Pick<RunModelSelectionValidator, "validate">;
  }>) {}

  /** The checks without writing: `already_switched`, a refusal, or null when it would switch. */
  async check(input: AutomaticRuntimeSwitchInput): Promise<Exclude<AutomaticRuntimeSwitchResult, { kind: "switched" }> | null> {
    const planned = await this.plan(input);
    return planned.kind === "planned" ? null : planned;
  }

  /** The checks, then the commit; the run's agent must be stopped by now. */
  async commit(input: AutomaticRuntimeSwitchInput): Promise<AutomaticRuntimeSwitchResult> {
    if (this.deps.agentRunManager.getActiveRun(input.agentRunId)) return { kind: "refused", reason: "its agent is still running" };
    const planned = await this.plan(input);
    if (planned.kind !== "planned") return planned;
    const committed = await this.deps.historyCatalogService.commitRunRuntimeSwitch({
      runId: input.agentRunId,
      selection: { runtimeKind: input.launch.runtimeKind, ...planned.selection, continuation: planned.continuation, cause: input.cause },
      switchId: randomUUID(),
    });
    switch (committed.kind) {
      case "committed": return { kind: "switched", metadata: committed.metadata };
      case "unchanged": return { kind: "refused", reason: "the new launch is the run's current one" };
      case "archived": return { kind: "refused", reason: "the run was archived" };
      case "not_found": return { kind: "refused", reason: "the run's record was not found" };
      default: return { kind: "refused", reason: `the switch could not be saved (${committed.kind})` };
    }
  }

  private async plan(input: AutomaticRuntimeSwitchInput): Promise<Planned | Exclude<AutomaticRuntimeSwitchResult, { kind: "switched" }>> {
    const state = await this.deps.metadataService.readMetadataState(input.agentRunId);
    const metadata = state.kind === "present" ? state.metadata : null;
    if (!metadata) return { kind: "refused", reason: "the run's record was not found" };
    // R-12: the run's own state says whether this event still applies.
    if (metadata.pendingRuntimeSwitch || metadata.runtimeKind !== input.from.runtimeKind
      || metadata.llmModelIdentifier !== input.from.llmModelIdentifier) return { kind: "already_switched" };
    const row = await this.deps.historyCatalogService.getCatalogRow(input.agentRunId);
    if (!row) return { kind: "refused", reason: "the run's record was not found" };
    if (row.archivedAt) return { kind: "refused", reason: "the run was archived" };
    // A fresh selection on the new launch with its model's default settings; a started run hands over its session.
    const validation = await this.deps.modelSelectionValidator.validate({
      context: selectionContextFor(metadata, { runtimeKind: input.launch.runtimeKind }, metadata.startedAt ? "available" : "no_session"),
      selection: { llmModelIdentifier: input.launch.llmModelIdentifier, llmConfig: null },
    });
    if (validation.kind !== "valid") return { kind: "refused", reason: automaticSwitchRefusal(input.launch.llmModelIdentifier, validation) };
    return { kind: "planned", selection: validation.selection, continuation: validation.continuation };
  }
}
