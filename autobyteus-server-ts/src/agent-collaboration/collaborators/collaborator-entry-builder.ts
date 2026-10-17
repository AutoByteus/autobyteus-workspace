import type { AgentLaunchConfiguration } from "../../agent-team-execution/domain/team-run-config.js";
import type { AgentDefinition } from "../../agent-definition/domain/models.js";
import type { DefaultLaunchConfig } from "../../launch-preferences/default-launch-config.js";
import { FlatTeamDefinitionResolver } from "../../agent-team-definition/services/flat-team-definition-resolver.js";
import type { CollaborationHandoff } from "../domain/collaboration-handoff.js";
import type { LaunchConfigurationSource } from "../domain/launch-configuration-source.js";
import { CollaborationHandoffCompiler } from "../definition/collaboration-handoff-compiler.js";
import {
  createAgentTeamAddress,
  getAgentTeamAddressSegments,
  type AgentTeamAddress,
} from "../domain/agent-team-address.js";
import type { AdmissibleCollaboratorDefinition, CollaboratorDefinitionCatalog } from "./collaborator-candidate-policy.js";

type PlanIdentity = Readonly<{ name: string; address: AgentTeamAddress }>;
type TeamLayout = Readonly<{ teamDefinitionId: string; coordinatorAddress: AgentTeamAddress; handoffs: readonly CollaborationHandoff[] }>;

/**
 * A catalog copy before its launch is resolved: the structural snapshot and
 * the definition defaults captured with it (an Agent's own default; a Team's default and each
 * member's agent default). Admission's launch resolver turns it into an entry plan.
 */
export type CollaboratorDefinitionPlan =
  | (PlanIdentity & Readonly<{ kind: "agent"; agentDefinitionId: string; agentDefault: DefaultLaunchConfig | null }>)
  | (PlanIdentity & TeamLayout & Readonly<{
      kind: "agent_team";
      members: readonly Readonly<{ address: AgentTeamAddress; agentDefinitionId: string; agentDefault: DefaultLaunchConfig | null }>[];
      teamDefault: DefaultLaunchConfig | null;
    }>);

/** A resolved Team member: its own launch only when it runs on its agent default (see `RecordedMemberLaunch`). */
export type CollaboratorEntryPlanMember = Readonly<{
  address: AgentTeamAddress;
  agentDefinitionId: string;
  launchConfiguration?: AgentLaunchConfiguration;
  launchSource?: LaunchConfigurationSource;
}>;

/** A catalog copy plan with resolved launches: what a copy's source snapshot is built from. */
export type CollaboratorEntryPlan =
  | (PlanIdentity & Readonly<{
      kind: "agent";
      agentDefinitionId: string;
      launchConfiguration: AgentLaunchConfiguration;
      launchSource: LaunchConfigurationSource;
    }>)
  | (PlanIdentity & TeamLayout & Readonly<{
      kind: "agent_team";
      members: readonly CollaboratorEntryPlanMember[];
      defaultLaunchConfiguration: AgentLaunchConfiguration;
      defaultLaunchSource: LaunchConfigurationSource;
    }>);

export type CollaboratorEntryInput = Readonly<{ address: AgentTeamAddress }>;

const captured = (value: DefaultLaunchConfig | null | undefined): DefaultLaunchConfig | null =>
  value ? Object.freeze(structuredClone(value)) : null;

/**
 * Snapshots a definition into a definition plan. A Team plan keeps its layout (mounted at the
 * copy address), its rebased Team-local handoffs and the defaults of the Team and of
 * each member's agent definition, so reopening the run never depends on later definition
 * edits. Resolving the Team layout fails when a member definition is missing.
 */
export class CollaboratorEntryBuilder {
  constructor(
    private readonly catalog: Pick<CollaboratorDefinitionCatalog, "getAgentDefinition">,
    private readonly teamResolver = new FlatTeamDefinitionResolver(),
    private readonly handoffCompiler = new CollaborationHandoffCompiler(),
  ) {}

  async build(
    definition: AdmissibleCollaboratorDefinition,
    input: CollaboratorEntryInput,
  ): Promise<CollaboratorDefinitionPlan> {
    const identity = { name: definition.definition.name, address: input.address };
    if (definition.kind === "agent") {
      return Object.freeze({
        kind: "agent",
        ...identity,
        agentDefinitionId: definition.definition.id,
        agentDefault: captured(definition.definition.defaultLaunchConfig),
      });
    }
    // The layout lookup reads each member's definition once; its default is captured from it.
    const memberDefinitions = new Map<string, AgentDefinition | null>();
    const resolved = await this.teamResolver.resolve({
      rootDefinition: definition.definition,
      rootDefinitionId: definition.definition.id,
      mountPath: getAgentTeamAddressSegments(input.address),
      lookup: { getAgentById: async (id) => {
        const member = await this.catalog.getAgentDefinition(id);
        memberDefinitions.set(id, member);
        return member;
      } },
    });
    return Object.freeze({
      kind: "agent_team",
      ...identity,
      teamDefinitionId: definition.definition.id,
      coordinatorAddress: createAgentTeamAddress(resolved.coordinator.absolutePath),
      members: Object.freeze(resolved.members.map((member) => Object.freeze({
        address: createAgentTeamAddress(member.absolutePath),
        agentDefinitionId: member.agentDefinitionId,
        agentDefault: captured(memberDefinitions.get(member.agentDefinitionId)?.defaultLaunchConfig),
      }))),
      handoffs: Object.freeze(this.handoffCompiler.compileTeam(resolved)),
      teamDefault: captured(definition.definition.defaultLaunchConfig),
    });
  }
}
