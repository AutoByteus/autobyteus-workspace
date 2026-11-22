import type { ContainedIn } from "../../agent-collaboration/domain/contained-in.js";
import { getAgentTeamAddressBasename } from "../../agent-collaboration/domain/agent-team-address.js";
import type { AgentRunService } from "../../agent-execution/services/agent-run-service.js";
import type { TeamRunService } from "../../agent-team-execution/services/team-run-service.js";
import type { AgentLaunchConfiguration } from "../../agent-team-execution/domain/team-run-config.js";
import type { TeamRunApplicationBinding } from "../../run-history/domain/run-execution-tree-shared-records.js";
import type { TeamRunHistoryService } from "../../run-history/services/team-run-history-service.js";
import type { AgentOrgUnit } from "../domain/agent-org-container-file.js";
import type { PlannedAgentUnit, PlannedTeamUnit } from "./agent-org-container-plan.js";

/** What a unit is created with: its container back-link and, for an application's Org, the Org's binding (contract §11). */
export type UnitCreationContext = Readonly<{ containedIn: ContainedIn; applicationBinding: TeamRunApplicationBinding | null }>;

/**
 * The container's narrow port to its units' own run services (DS-001, DS-003): a unit is an ordinary Team or agent run,
 * created, stopped and (after a failed Org creation) discarded by its own service; the container keeps only references.
 */
export type AgentOrgUnitRuns = Readonly<{
  /** A Team unit: a Team run of the Team definition with the launch page's settings and `containedIn`; its run ID. */
  createTeamUnit(unit: PlannedTeamUnit, context: UnitCreationContext): Promise<string>;
  /** An agent unit: an agent run prepared (Offline until its first work) at its Org address with `containedIn`; its run ID. */
  createAgentUnit(unit: PlannedAgentUnit, context: UnitCreationContext): Promise<string>;
  /** Stops a unit's run when it runs; `true` when it is stopped (or was not running). */
  stopUnit(unit: AgentOrgUnit): Promise<boolean>;
  /** Removes a unit made by an Org creation that did not finish (best effort). */
  discardUnit(unit: AgentOrgUnit): Promise<void>;
}>;

const launchInput = (launch: AgentLaunchConfiguration) => ({
  runtimeKind: launch.runtimeKind,
  llmModelIdentifier: launch.llmModelIdentifier,
  llmConfig: launch.llmConfig === null ? null : structuredClone(launch.llmConfig) as Record<string, unknown>,
  autoExecuteTools: launch.autoExecuteTools,
  workspaceRootPath: launch.workspaceRootPath,
});

/** The unit-run port over the ordinary run services (the composition root builds it). */
export const createAgentOrgUnitRuns = (services: Readonly<{
  teamRuns: Pick<TeamRunService, "createTeamRun" | "terminateTeamRun" | "getManagedTeamRun">;
  agentRuns: Pick<AgentRunService, "prepareAgentRun" | "terminateAgentRun" | "cancelPreparedAgentRun">;
  teamHistory: Pick<TeamRunHistoryService, "deleteStoredTeamRun">;
}>): AgentOrgUnitRuns => Object.freeze({
  createTeamUnit: async (unit, context) => (await services.teamRuns.createTeamRun({
    teamDefinitionId: unit.teamDefinitionId,
    teamConfigs: [{ teamAddress: "/", ...launchInput(unit.defaultLaunchConfiguration) }],
    memberConfigs: unit.members.map((member) => ({ memberAddress: member.address, agentDefinitionId: member.agentDefinitionId,
      ...launchInput(member.launchConfiguration) })),
    applicationBinding: context.applicationBinding,
    containedIn: context.containedIn,
  })).teamRunId,
  createAgentUnit: async (unit, context) => {
    const launch = unit.launchConfiguration;
    if (!launch.workspaceRootPath) throw new Error(`The Org agent at ${unit.address} has no workspace.`);
    return (await services.agentRuns.prepareAgentRun({
      agentDefinitionId: unit.agentDefinitionId,
      ...launchInput(launch),
      workspaceRootPath: launch.workspaceRootPath,
      address: unit.address,
      containedIn: context.containedIn,
      // The application ownership today's Org run gives each agent (contract §11).
      applicationBinding: context.applicationBinding ? { ...context.applicationBinding,
        displayName: getAgentTeamAddressBasename(unit.address) ?? null } : null,
    })).runId;
  },
  stopUnit: async (unit) => {
    if (unit.kind === "agent_team") return !services.teamRuns.getManagedTeamRun(unit.runId) || services.teamRuns.terminateTeamRun(unit.runId);
    const result = await services.agentRuns.terminateAgentRun(unit.runId);
    return result.success || result.route === "not_found";
  },
  discardUnit: async (unit) => {
    if (unit.kind === "agent_team") {
      await services.teamRuns.terminateTeamRun(unit.runId).catch(() => false);
      await services.teamHistory.deleteStoredTeamRun(unit.runId).catch(() => undefined);
      return;
    }
    await services.agentRuns.cancelPreparedAgentRun(unit.runId).catch(() => undefined);
  },
});
