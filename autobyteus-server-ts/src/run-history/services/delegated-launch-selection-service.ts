import type {
  DelegatedLaunchModelOptions,
  DelegatedLaunchUpdateOutcome,
  DelegatedStopOutcome,
} from "../../agent-collaboration/collaborators/delegated-launch-selection-command.js";
import type {
  DelegatedHostSelectionValue,
  DelegatedLaunchChange,
  DelegatedRunReference,
} from "../../agent-collaboration/domain/delegated-launch-selection.js";
import type { AgentRunService } from "../../agent-execution/services/agent-run-service.js";
import type { AgentOrgRunManager } from "../../agent-org-execution/services/agent-org-run-manager.js";
import type { AgentTeamRunManager } from "../../agent-team-execution/services/agent-team-run-manager.js";
import type { TeamRunModelConfigPatch } from "../../agent-team-execution/services/team-run-model-config-mutator.js";
import type { AgentOrgRunModelConfigPatch } from "../../agent-org-execution/domain/agent-org-run-config.js";
import type { RunModelSelectionService, RunModelSelectionValidator } from "../../llm-management/services/run-model-selection-service.js";
import type { StandaloneAgentRunRootManager } from "../../standalone-agent-run-root/services/standalone-agent-run-root-manager.js";
import type { RunModelConfigFieldError } from "../domain/run-model-config.js";

export type DelegatedLaunchRootKind = "AGENT" | "AGENT_TEAM" | "AGENT_ORG";

export type DelegatedStopServiceResult = Readonly<{
  success: boolean;
  outcome: DelegatedStopOutcome | "INTERNAL_ERROR";
  message: string;
  notStoppedUnattributed: number;
}>;

export type DelegatedLaunchServiceResult = Readonly<{
  success: boolean;
  outcome: DelegatedLaunchUpdateOutcome;
  message: string;
  fieldErrors: readonly RunModelConfigFieldError[];
}>;

/**
 * The stopped root's own settings saved together with delegated choices (AR-004): configured
 * scopes of a Team or Org, or the Agent root's host model.
 */
export type StoppedRootConfiguredPatches =
  | Readonly<{ kind: "team"; patches: readonly TeamRunModelConfigPatch[] }>
  | Readonly<{ kind: "org"; patches: readonly AgentOrgRunModelConfigPatch[] }>
  | Readonly<{ kind: "agent"; selection: DelegatedHostSelectionValue }>;

const stopResult = (outcome: DelegatedStopServiceResult["outcome"], message: string, notStoppedUnattributed = 0): DelegatedStopServiceResult =>
  Object.freeze({ success: outcome === "STOPPED" || outcome === "ALREADY_STOPPED", outcome, message, notStoppedUnattributed });

const updateResult = (outcome: DelegatedLaunchUpdateOutcome, message: string, fieldErrors: readonly RunModelConfigFieldError[] = []): DelegatedLaunchServiceResult =>
  Object.freeze({ success: outcome === "UPDATED" || outcome === "UNCHANGED", outcome, message, fieldErrors: Object.freeze([...fieldErrors]) });

const errorMessage = (error: unknown): string => error instanceof Error ? error.message : String(error);

/**
 * API entry for the user Stop and model choice of delegated copies (DS-001,
 * DS-002). It finds the root by kind and ID and routes: a live root runs the command itself; a
 * stopped root's manager saves the stored tree, together with the root's own settings (AR-004).
 * It never mutates a tree or touches a handle.
 */
export class DelegatedLaunchSelectionService {
  constructor(private readonly dependencies: Readonly<{
    teams: Pick<AgentTeamRunManager, "getManagedTeamRun" | "updateStoppedRunLaunchChanges" | "delegatedLaunchModelOptions">;
    orgs: Pick<AgentOrgRunManager, "getActive" | "updateStoppedRunConfig" | "delegatedLaunchModelOptions">;
    agents: Pick<StandaloneAgentRunRootManager, "getActive" | "hasRoot" | "updateStoppedDelegatedLaunchSelections" | "delegatedLaunchModelOptions">;
    agentRuns: Pick<AgentRunService, "updateStoppedSelection">;
    validator: RunModelSelectionValidator & Pick<RunModelSelectionService, "listOptionsMany">;
  }>) {}

  async stop(input: Readonly<{ rootKind: DelegatedLaunchRootKind; rootRunId: string; target: DelegatedRunReference }>): Promise<DelegatedStopServiceResult> {
    const root = this.liveRoot(input.rootKind, input.rootRunId);
    if (!root) return stopResult("ROOT_NOT_ACTIVE", "This run is not running; its copies are already stopped.");
    try {
      const result = await root.stopDelegatedExecution(input.target);
      return stopResult(result.outcome, result.message, result.notStoppedUnattributed);
    } catch (error) {
      return stopResult("INTERNAL_ERROR", `The copy could not be stopped: ${errorMessage(error)}`);
    }
  }

  async update(input: Readonly<{
    rootKind: DelegatedLaunchRootKind;
    rootRunId: string;
    changes: readonly DelegatedLaunchChange[];
    configured?: StoppedRootConfiguredPatches | null;
  }>): Promise<DelegatedLaunchServiceResult> {
    const root = this.liveRoot(input.rootKind, input.rootRunId);
    try {
      if (root) {
        if (hasConfiguredPatches(input.configured)) {
          return updateResult("RUN_ACTIVE", "The run is running: only its stopped copies' models can change. Stop the run to change its own settings.");
        }
        const result = await root.updateDelegatedLaunchSelections(input.changes, this.dependencies.validator);
        return updateResult(result.outcome, result.message, result.fieldErrors);
      }
      return await this.updateStopped(input);
    } catch (error) {
      return updateResult("INTERNAL_ERROR", `The model change was not saved: ${errorMessage(error)}`);
    }
  }

  modelOptions(rootKind: DelegatedLaunchRootKind, rootRunId: string): Promise<readonly DelegatedLaunchModelOptions[]> {
    const options = this.dependencies.validator;
    switch (rootKind) {
      case "AGENT_TEAM": return this.dependencies.teams.delegatedLaunchModelOptions(rootRunId, options);
      case "AGENT_ORG": return this.dependencies.orgs.delegatedLaunchModelOptions(rootRunId, options);
      case "AGENT": return this.dependencies.agents.delegatedLaunchModelOptions(rootRunId, options);
    }
  }

  private liveRoot(rootKind: DelegatedLaunchRootKind, rootRunId: string) {
    const id = rootRunId.trim();
    switch (rootKind) {
      case "AGENT_TEAM": return this.dependencies.teams.getManagedTeamRun(id);
      case "AGENT_ORG": return this.dependencies.orgs.getActive(id);
      case "AGENT": return this.dependencies.agents.getActive(id);
    }
  }

  private async updateStopped(input: Parameters<DelegatedLaunchSelectionService["update"]>[0]): Promise<DelegatedLaunchServiceResult> {
    const configured = input.configured ?? null;
    if (configured && configured.kind !== expectedConfiguredKind(input.rootKind)) {
      return updateResult("VALIDATION_FAILED", "The run's own settings do not match its kind.");
    }
    switch (input.rootKind) {
      case "AGENT_TEAM": {
        const result = await this.dependencies.teams.updateStoppedRunLaunchChanges({
          teamRunId: input.rootRunId,
          configuredPatches: configured?.kind === "team" ? configured.patches : [],
          delegatedChanges: input.changes,
        });
        return updateResult(result.outcome, result.message, result.fieldErrors);
      }
      case "AGENT_ORG": {
        const result = await this.dependencies.orgs.updateStoppedRunConfig({
          orgRunId: input.rootRunId,
          modelPatches: configured?.kind === "org" ? configured.patches : [],
          teamWorkspacePatches: [],
          delegatedChanges: input.changes,
        });
        return updateResult(result.outcome, result.message, result.fieldErrors);
      }
      case "AGENT": {
        const hostSelection = configured?.kind === "agent" ? configured.selection : null;
        const { result } = await this.dependencies.agents.updateStoppedDelegatedLaunchSelections({
          hostRunId: input.rootRunId, changes: input.changes, hostSelection, validator: this.dependencies.validator,
        });
        if (!hostSelection || (result.outcome !== "UPDATED" && result.outcome !== "UNCHANGED")) {
          return updateResult(result.outcome, result.message, result.fieldErrors);
        }
        // The host's selection (agent runtime, model) is in its own run metadata (a separate file), saved after the validated tree.
        const host = await this.dependencies.agentRuns.updateStoppedSelection({
          agentRunId: input.rootRunId,
          runtimeKind: hostSelection.runtimeKind,
          llmModelIdentifier: hostSelection.llmModelIdentifier,
          llmConfig: hostSelection.llmConfig,
        });
        if (host.success) {
          const outcome = result.outcome === "UNCHANGED" && host.outcome === "UNCHANGED" ? "UNCHANGED" : "UPDATED";
          return updateResult(outcome, outcome === "UNCHANGED" ? "These model settings are already saved." : "Saved. The new models are used when the run resumes.");
        }
        return updateResult(host.outcome, result.outcome === "UPDATED"
          ? `The copies' models were saved, but the agent's own model was not: ${host.message}`
          : host.message, host.fieldErrors);
      }
    }
  }
}

const expectedConfiguredKind = (rootKind: DelegatedLaunchRootKind): StoppedRootConfiguredPatches["kind"] =>
  rootKind === "AGENT_TEAM" ? "team" : rootKind === "AGENT_ORG" ? "org" : "agent";

const hasConfiguredPatches = (configured: StoppedRootConfiguredPatches | null | undefined): boolean =>
  configured ? (configured.kind === "agent" || configured.patches.length > 0) : false;
