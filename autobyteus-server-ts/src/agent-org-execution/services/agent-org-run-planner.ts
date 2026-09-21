import { randomUUID } from "node:crypto";
import { createAgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import { CollaborationHandoffCompiler } from "../../agent-collaboration/definition/collaboration-handoff-compiler.js";
import { CollaborationLaunchConfigurationResolver, type PlacementLaunchOverride } from "../../agent-collaboration/services/collaboration-launch-configuration-resolver.js";
import { AgentOrgDefinitionResolver, type AgentOrgDefinitionLookup } from "../../agent-org-definition/services/agent-org-definition-resolver.js";
import type { AgentOrgDefinition } from "../../agent-org-definition/domain/agent-org-definition.js";
import type { AgentLaunchConfiguration } from "../../agent-team-execution/domain/team-run-config.js";
import type { AgentOrgRunExecutionTreeFileV1 } from "../domain/agent-org-run-execution-tree.js";
import type { ConfiguredExecutionNode } from "../../run-history/domain/run-execution-tree-shared-records.js";
import { validateAgentOrgRunExecutionTreePayload } from "../../run-history/store/agent-org-run-execution-tree-schema.js";
import type { ResolvedAgentOrgDefinition } from "../../agent-collaboration/definition/resolved-collaboration-topology.js";

export type ResolvedAgentOrgLaunchPlan = Readonly<{
  topology: ResolvedAgentOrgDefinition;
  launch: ReturnType<CollaborationLaunchConfigurationResolver["resolveOrg"]>;
}>;

export type AgentOrgRunIdentityAllocation = Readonly<{
  allocateAgent(agentDefinitionId: string): Promise<string>;
  allocateTeam(teamDefinitionName: string): string;
  allocateOrg(orgDefinitionName: string): string;
}>;
const orgRunId = (name: string): string => `${name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "agent_org"}_${randomUUID().replace(/-/g, "")}`;

export class AgentOrgRunPlanner {
  constructor(
    private readonly lookup: AgentOrgDefinitionLookup,
    private readonly identities: AgentOrgRunIdentityAllocation,
  ) {}
  async resolveConfiguration(input: {
    definition: AgentOrgDefinition;
    rootConfiguration: AgentLaunchConfiguration;
    teamOverrides?: readonly PlacementLaunchOverride[] | null;
    agentOverrides?: readonly PlacementLaunchOverride[] | null;
  }): Promise<ResolvedAgentOrgLaunchPlan> {
    if (!input.definition.id) throw new Error("AgentOrg definition id is required for launch.");
    const topology = await new AgentOrgDefinitionResolver().resolve({ definition: input.definition, lookup: this.lookup });
    const launch = new CollaborationLaunchConfigurationResolver().resolveOrg({
      topology,
      rootConfiguration: input.rootConfiguration,
      teamOverrides: input.teamOverrides,
      agentOverrides: input.agentOverrides,
    });
    return Object.freeze({ topology, launch });
  }
  async build(input: {
    definition: AgentOrgDefinition;
    rootConfiguration: AgentLaunchConfiguration;
    teamOverrides?: readonly PlacementLaunchOverride[] | null;
    agentOverrides?: readonly PlacementLaunchOverride[] | null;
    applicationBinding?: { applicationId: string; bindingId: string } | null;
    createdAt?: string;
  }): Promise<AgentOrgRunExecutionTreeFileV1> {
    const { topology, launch } = await this.resolveConfiguration(input);
    const members: ConfiguredExecutionNode[] = [];
    for (const member of topology.members) {
      const address = createAgentTeamAddress(member.absolutePath);
      if (member.kind === "agent") {
        members.push({ address, agentDefinitionId: member.agentDefinitionId, role: null, description: null,
          agentRunId: await this.identities.allocateAgent(member.agentDefinitionId), platformAgentRunId: null,
          launchConfiguration: launch.agents.get(address)!, });
        continue;
      }
      const configuredAgents = await Promise.all(member.team.members.map(async (agent) => {
        const agentAddress = createAgentTeamAddress(agent.absolutePath);
        return { address: agentAddress, agentDefinitionId: agent.agentDefinitionId, role: null, description: null,
          agentRunId: await this.identities.allocateAgent(agent.agentDefinitionId), platformAgentRunId: null,
          launchConfiguration: launch.agents.get(agentAddress)!, };
      }));
      members.push({ address, teamDefinitionId: member.teamDefinitionId, role: null, description: null,
        teamRunId: this.identities.allocateTeam(member.team.definition.name),
        coordinatorAddress: createAgentTeamAddress(member.team.coordinator.absolutePath),
        defaultLaunchConfiguration: launch.teams.get(address)!, members: configuredAgents, taskExecutions: [] });
    }
    return validateAgentOrgRunExecutionTreePayload({
      schemaVersion: 1, subjectKind: "agent_org", createdAt: input.createdAt ?? new Date().toISOString(), archivedAt: null,
      applicationBinding: input.applicationBinding ?? null,
      handoffs: new CollaborationHandoffCompiler().compileOrg(topology),
      rootOrg: { address: "/", orgDefinitionId: input.definition.id, orgDefinitionName: input.definition.name,
        orgRunId: this.identities.allocateOrg(input.definition.name), defaultLaunchConfiguration: launch.root,
        members, taskExecutions: [] },
    });
  }
  static defaultOrgIdentity(name: string): string { return orgRunId(name); }
}
