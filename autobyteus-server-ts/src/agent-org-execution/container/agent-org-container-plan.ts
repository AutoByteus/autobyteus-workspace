import {
  createAgentTeamAddress,
  isAgentTeamAddressAncestor,
  type AgentTeamAddress,
} from "../../agent-collaboration/domain/agent-team-address.js";
import { CollaborationHandoffCompiler, type OrgHandoffCompilation } from "../../agent-collaboration/definition/collaboration-handoff-compiler.js";
import type { CollaborationHandoff } from "../../agent-collaboration/domain/collaboration-handoff.js";
import type { ResolvedAgentOrgDefinition } from "../../agent-collaboration/definition/resolved-collaboration-topology.js";
import type { AgentLaunchConfiguration } from "../../agent-team-execution/domain/team-run-config.js";
import type { ResolvedAgentOrgLaunchPlan } from "../services/agent-org-run-planner.js";

/** A Team unit to create: its Org address, definition and launch, and each member in team space with its launch. */
export type PlannedTeamUnit = Readonly<{
  kind: "agent_team";
  address: AgentTeamAddress;
  teamDefinitionId: string;
  defaultLaunchConfiguration: AgentLaunchConfiguration;
  members: readonly Readonly<{ address: AgentTeamAddress; agentDefinitionId: string; launchConfiguration: AgentLaunchConfiguration }>[];
}>;

/** An agent unit to create: its Org address, definition and launch. */
export type PlannedAgentUnit = Readonly<{
  kind: "agent";
  address: AgentTeamAddress;
  agentDefinitionId: string;
  launchConfiguration: AgentLaunchConfiguration;
}>;

export type PlannedOrgUnit = PlannedTeamUnit | PlannedAgentUnit;

export type AgentOrgContainerPlan = Readonly<{
  units: readonly PlannedOrgUnit[];
  /** The Org-level rules (contract §2): the compiled Org rules that are not wholly inside one Team, in Org addresses. */
  orgRules: readonly CollaborationHandoff[];
}>;

/** An Org address in a Team unit's own space (contract §3): the Team's address stripped (`/set/x` → `/x`). */
export const teamSpaceAddressOf = (teamAddress: AgentTeamAddress, orgAddress: AgentTeamAddress): AgentTeamAddress => {
  if (!isAgentTeamAddressAncestor(teamAddress, orgAddress)) throw new Error(`'${orgAddress}' is not inside the Team at '${teamAddress}'.`);
  return createAgentTeamAddress(orgAddress.slice(teamAddress.length).split("/").filter(Boolean));
};

/** Whether `address` is the Team's own address or lies inside it. */
const insideTeam = (teamAddress: string, address: string): boolean =>
  address === teamAddress || address.startsWith(`${teamAddress}/`);

/**
 * The Org-level rules among compiled Org rules: a rule wholly inside one mounted Team (its `from` and `to` both in that
 * Team) is that Team's own rule and lives in its Team file; every other rule stays with the container (contract §2, §9).
 */
export const orgLevelRules = (handoffs: readonly CollaborationHandoff[], teamAddresses: readonly string[]): CollaborationHandoff[] =>
  handoffs.filter((handoff) => !teamAddresses.some((team) => insideTeam(team, handoff.from) && insideTeam(team, handoff.to)));

/**
 * What creating an Org container makes (DS-001), pure: each mounted Team becomes a Team unit (its members in team space,
 * each with the launch the launch page resolved), each direct agent an agent unit, and the container keeps the Org-level
 * rules. Unit run IDs are allocated when the units are created, by their run services. A launch compiles the Org rules
 * strictly; a running Org following its definition keeps a rule naming a member that left its Team (`running_org`, F-5).
 */
export const planAgentOrgContainer = (input: Readonly<{ topology: ResolvedAgentOrgDefinition; launch: ResolvedAgentOrgLaunchPlan["launch"];
  compilation?: OrgHandoffCompilation }>): AgentOrgContainerPlan => {
  const units: PlannedOrgUnit[] = input.topology.members.map((member): PlannedOrgUnit => {
    const address = createAgentTeamAddress(member.absolutePath);
    if (member.kind === "agent") {
      return Object.freeze({ kind: "agent", address, agentDefinitionId: member.agentDefinitionId,
        launchConfiguration: required(input.launch.agents.get(address), address) });
    }
    return Object.freeze({
      kind: "agent_team", address, teamDefinitionId: member.teamDefinitionId,
      defaultLaunchConfiguration: required(input.launch.teams.get(address), address),
      members: Object.freeze(member.team.members.map((agent) => {
        const orgAddress = createAgentTeamAddress(agent.absolutePath);
        return Object.freeze({ address: teamSpaceAddressOf(address, orgAddress), agentDefinitionId: agent.agentDefinitionId,
          launchConfiguration: required(input.launch.agents.get(orgAddress), orgAddress) });
      })),
    });
  });
  const teamAddresses = units.filter((unit) => unit.kind === "agent_team").map((unit) => unit.address);
  return Object.freeze({
    units: Object.freeze(units),
    orgRules: Object.freeze(orgLevelRules(new CollaborationHandoffCompiler().compileOrg(input.topology, input.compilation), teamAddresses)),
  });
};

const required = (launch: AgentLaunchConfiguration | undefined, address: string): AgentLaunchConfiguration => {
  if (!launch) throw new Error(`The Org launch has no configuration for '${address}'.`);
  return launch;
};
