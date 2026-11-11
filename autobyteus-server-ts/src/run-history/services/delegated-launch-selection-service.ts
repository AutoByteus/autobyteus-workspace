import type {
  DelegatedLaunchChange,
  DelegatedLaunchModelOptions,
  DelegatedLaunchSelectionValue,
  DelegatedLaunchUpdateOutcome,
  DelegatedRunReference,
  DelegatedStopOutcome,
} from "../../agent-collaboration/domain/delegated-launch-selection.js";
import { createRootExecutionIdentity, type RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { AgentRunService } from "../../agent-execution/services/agent-run-service.js";
import type { AgentOrgRunManager } from "../../agent-org-execution/services/agent-org-run-manager.js";
import type { AgentTeamRunManager } from "../../agent-team-execution/services/agent-team-run-manager.js";
import type { TeamRunService } from "../../agent-team-execution/services/team-run-service.js";
import type { TeamRunSelectionPatch } from "../../agent-team-execution/services/team-run-selection-mutator.js";
import type { AgentOrgRunSelectionPatch } from "../../agent-org-execution/domain/agent-org-run-config.js";
import type { StandaloneAgentRunRootManager } from "../../standalone-agent-run-root/services/standalone-agent-run-root-manager.js";
import type { RunModelConfigFieldError } from "../domain/run-model-config.js";
import type { DelegatedChildLaunches, OwnSaveResult } from "./delegated-child-launches.js";

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
 * The delegator's own settings saved in the same Save (AR-004): configured scopes of a Team or Org, or an Agent run's
 * own model.
 */
export type StoppedRootConfiguredPatches =
  | Readonly<{ kind: "team"; patches: readonly TeamRunSelectionPatch[] }>
  | Readonly<{ kind: "org"; patches: readonly AgentOrgRunSelectionPatch[] }>
  | Readonly<{ kind: "agent"; selection: DelegatedLaunchSelectionValue }>;

const stopResult = (outcome: DelegatedStopServiceResult["outcome"], message: string, notStoppedUnattributed = 0): DelegatedStopServiceResult =>
  Object.freeze({ success: outcome === "STOPPED" || outcome === "ALREADY_STOPPED", outcome, message, notStoppedUnattributed });

const updateResult = (outcome: DelegatedLaunchUpdateOutcome, message: string, fieldErrors: readonly RunModelConfigFieldError[] = []): DelegatedLaunchServiceResult =>
  Object.freeze({ success: outcome === "UPDATED" || outcome === "UNCHANGED", outcome, message, fieldErrors: Object.freeze([...fieldErrors]) });

const errorMessage = (error: unknown): string => error instanceof Error ? error.message : String(error);

/**
 * API entry for a delegator's Settings and Stop on the runs it delegated to (design DS-8, SR-039). A child row's Stop is
 * that run's ordinary Stop; a peer child's goes to its node through the delegator. A Save checks every run it names first
 * (each child stopped, every patch valid; the delegator's own patches need it stopped), then saves the delegator's own
 * settings, then each child's own, in row order (`DelegatedChildLaunches`). It never writes one run's file for another.
 */
export class DelegatedLaunchSelectionService {
  constructor(private readonly dependencies: Readonly<{
    teams: Pick<AgentTeamRunManager, "getManagedTeamRun" | "checkStoppedSelections" | "updateStoppedSelections">;
    orgs: Pick<AgentOrgRunManager, "getActive" | "checkStoppedRunConfig" | "updateStoppedRunConfig">;
    agents: Pick<StandaloneAgentRunRootManager, "getActive">;
    agentRuns: Pick<AgentRunService, "checkStoppedSelection" | "updateStoppedSelection" | "terminateAgentRun">;
    teamRuns: Pick<TeamRunService, "terminateTeamRun">;
    children: DelegatedChildLaunches;
  }>) {}

  async stop(input: Readonly<{ rootKind: DelegatedLaunchRootKind; rootRunId: string; target: DelegatedRunReference }>): Promise<DelegatedStopServiceResult> {
    const child = this.dependencies.children.localChild(identityOf(input.rootKind, input.rootRunId), input.target);
    if (!child) return stopResult("NOT_FOUND", "This run did not delegate to that run.");
    try {
      if (child.nodeId !== undefined) {
        const root = this.liveRoot(input.rootKind, input.rootRunId);
        if (!root) return stopResult("ROOT_NOT_ACTIVE", "This run is not running; a run on another node is stopped from a running run.");
        const result = await root.stopDelegatedExecution(input.target);
        return stopResult(result.outcome, result.message, result.notStoppedUnattributed);
      }
      const stopped = "agentRunId" in input.target
        ? (await this.dependencies.agentRuns.terminateAgentRun(input.target.agentRunId)).success
        : await this.dependencies.teamRuns.terminateTeamRun(input.target.teamRunId);
      return stopped ? stopResult("STOPPED", `${child.recipientAddress} stopped.`) : stopResult("ALREADY_STOPPED", `${child.recipientAddress} is not running.`);
    } catch (error) {
      return stopResult("INTERNAL_ERROR", `The run could not be stopped: ${errorMessage(error)}`);
    }
  }

  async update(input: Readonly<{
    rootKind: DelegatedLaunchRootKind;
    rootRunId: string;
    changes: readonly DelegatedLaunchChange[];
    configured?: StoppedRootConfiguredPatches | null;
  }>): Promise<DelegatedLaunchServiceResult> {
    const configured = hasConfiguredPatches(input.configured) ? input.configured! : null;
    if (configured && configured.kind !== expectedConfiguredKind(input.rootKind)) {
      return updateResult("VALIDATION_FAILED", "The run's own settings do not match its kind.");
    }
    try {
      if (configured && this.liveRoot(input.rootKind, input.rootRunId)) {
        return updateResult("RUN_ACTIVE", "The run is running: only the stopped runs it delegated to can change. Stop the run to change its own settings.");
      }
      const plan = await this.dependencies.children.plan(identityOf(input.rootKind, input.rootRunId), input.changes);
      if (plan.kind === "refused") return updateResult(plan.refusal.outcome, plan.refusal.message, plan.refusal.fieldErrors);
      const own = configured ? await this.ownSave(input.rootRunId, configured, true) : null;
      if (own) return updateResult(own.outcome, own.message, own.fieldErrors);
      const saved: string[] = [];
      let changed = false;
      if (configured) {
        const result = (await this.ownSave(input.rootRunId, configured, false))!;
        if (!result.success) return updateResult(result.outcome, result.message, result.fieldErrors);
        changed = result.outcome === "UPDATED";
        saved.push("this run");
      }
      const applied = await this.dependencies.children.apply(plan.saves, saved);
      if (!applied.ok) return updateResult(applied.refusal.outcome, applied.refusal.message, applied.refusal.fieldErrors);
      return changed || applied.changed
        ? updateResult("UPDATED", "Saved. The new models are used when each run resumes.")
        : updateResult("UNCHANGED", "These model settings are already saved.");
    } catch (error) {
      return updateResult("INTERNAL_ERROR", `The model change was not saved: ${errorMessage(error)}`);
    }
  }

  modelOptions(rootKind: DelegatedLaunchRootKind, rootRunId: string): Promise<readonly DelegatedLaunchModelOptions[]> {
    return this.dependencies.children.modelOptions(identityOf(rootKind, rootRunId));
  }

  private liveRoot(rootKind: DelegatedLaunchRootKind, rootRunId: string) {
    const id = rootRunId.trim();
    switch (rootKind) {
      case "AGENT_TEAM": return this.dependencies.teams.getManagedTeamRun(id);
      case "AGENT_ORG": return this.dependencies.orgs.getActive(id);
      case "AGENT": return this.dependencies.agents.getActive(id);
    }
  }

  /** The delegator's own Save (`check`: without writing; the refusal or `null`). */
  private async ownSave(rootRunId: string, configured: StoppedRootConfiguredPatches, check: boolean): Promise<OwnSaveResult | null> {
    switch (configured.kind) {
      case "team": {
        const input = { teamRunId: rootRunId, selectionPatches: configured.patches };
        return check ? this.dependencies.teams.checkStoppedSelections(input) : this.dependencies.teams.updateStoppedSelections(input);
      }
      case "org": {
        const input = { orgRunId: rootRunId, selectionPatches: configured.patches, teamWorkspacePatches: [] };
        return check ? this.dependencies.orgs.checkStoppedRunConfig(input) : this.dependencies.orgs.updateStoppedRunConfig(input);
      }
      case "agent": {
        const input = { agentRunId: rootRunId, ...configured.selection };
        return check ? this.dependencies.agentRuns.checkStoppedSelection(input) : this.dependencies.agentRuns.updateStoppedSelection(input);
      }
    }
  }
}

const identityOf = (rootKind: DelegatedLaunchRootKind, rootRunId: string): RootExecutionIdentity => createRootExecutionIdentity({
  rootSubjectKind: rootKind === "AGENT_TEAM" ? "agent_team" : rootKind === "AGENT_ORG" ? "agent_org" : "agent", rootRunId: rootRunId.trim() });

const expectedConfiguredKind = (rootKind: DelegatedLaunchRootKind): StoppedRootConfiguredPatches["kind"] =>
  rootKind === "AGENT_TEAM" ? "team" : rootKind === "AGENT_ORG" ? "org" : "agent";

const hasConfiguredPatches = (configured: StoppedRootConfiguredPatches | null | undefined): boolean =>
  configured ? (configured.kind === "agent" || configured.patches.length > 0) : false;
