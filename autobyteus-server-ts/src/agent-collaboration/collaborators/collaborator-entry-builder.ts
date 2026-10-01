import type { AgentLaunchConfiguration } from "../../agent-team-execution/domain/team-run-config.js";
import { FlatTeamDefinitionResolver } from "../../agent-team-definition/services/flat-team-definition-resolver.js";
import type { CollaborationHandoff } from "../domain/collaboration-handoff.js";
import { CollaborationHandoffCompiler } from "../definition/collaboration-handoff-compiler.js";
import {
  createAgentTeamAddress,
  getAgentTeamAddressSegments,
  type AgentTeamAddress,
} from "../domain/agent-team-address.js";
import type { AdmissibleCollaboratorDefinition, CollaboratorDefinitionCatalog } from "./collaborator-candidate-policy.js";

/** A collaborator before its run IDs are allocated: what admission validates and commits. */
export type CollaboratorEntryPlan =
  | Readonly<{
      kind: "agent";
      name: string;
      address: AgentTeamAddress;
      agentDefinitionId: string;
      launchConfiguration: AgentLaunchConfiguration;
      addedAt: string;
      addedViaAgentRunId: string;
    }>
  | Readonly<{
      kind: "agent_team";
      name: string;
      address: AgentTeamAddress;
      teamDefinitionId: string;
      coordinatorAddress: AgentTeamAddress;
      members: readonly Readonly<{ address: AgentTeamAddress; agentDefinitionId: string }>[];
      handoffs: readonly CollaborationHandoff[];
      defaultLaunchConfiguration: AgentLaunchConfiguration;
      addedAt: string;
      addedViaAgentRunId: string;
    }>;

export type CollaboratorEntryInput = Readonly<{
  address: AgentTeamAddress;
  rootLaunchConfiguration: AgentLaunchConfiguration;
  addedAt: string;
  addedViaAgentRunId: string;
}>;

const cloneLaunch = (value: AgentLaunchConfiguration): AgentLaunchConfiguration => Object.freeze({
  runtimeKind: value.runtimeKind,
  llmModelIdentifier: value.llmModelIdentifier,
  llmConfig: value.llmConfig === null ? null : structuredClone(value.llmConfig),
  autoExecuteTools: value.autoExecuteTools,
  workspaceRootPath: value.workspaceRootPath,
});

/**
 * Snapshots a definition into a collaborator plan with the run's root settings. A Team plan
 * keeps its layout (mounted at the collaborator address) and its rebased Team-local handoffs,
 * so reopening the run never depends on later definition edits. Resolving the Team layout
 * fails when a member definition is missing.
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
  ): Promise<CollaboratorEntryPlan> {
    if (definition.kind === "agent") {
      return Object.freeze({
        kind: "agent",
        name: definition.definition.name,
        address: input.address,
        agentDefinitionId: definition.definition.id,
        launchConfiguration: cloneLaunch(input.rootLaunchConfiguration),
        addedAt: input.addedAt,
        addedViaAgentRunId: input.addedViaAgentRunId,
      });
    }
    const resolved = await this.teamResolver.resolve({
      rootDefinition: definition.definition,
      rootDefinitionId: definition.definition.id,
      mountPath: getAgentTeamAddressSegments(input.address),
      lookup: { getAgentById: (id) => this.catalog.getAgentDefinition(id) },
    });
    return Object.freeze({
      kind: "agent_team",
      name: definition.definition.name,
      address: input.address,
      teamDefinitionId: definition.definition.id,
      coordinatorAddress: createAgentTeamAddress(resolved.coordinator.absolutePath),
      members: Object.freeze(resolved.members.map((member) => Object.freeze({
        address: createAgentTeamAddress(member.absolutePath),
        agentDefinitionId: member.agentDefinitionId,
      }))),
      handoffs: Object.freeze(this.handoffCompiler.compileTeam(resolved)),
      defaultLaunchConfiguration: cloneLaunch(input.rootLaunchConfiguration),
      addedAt: input.addedAt,
      addedViaAgentRunId: input.addedViaAgentRunId,
    });
  }
}
