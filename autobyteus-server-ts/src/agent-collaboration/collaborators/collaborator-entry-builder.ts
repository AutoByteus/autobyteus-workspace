import type { AgentLaunchConfiguration } from "../../agent-team-execution/domain/team-run-config.js";
import { FlatTeamDefinitionResolver } from "../../agent-team-definition/services/flat-team-definition-resolver.js";
import type {
  CollaboratorAgentEntry,
  CollaboratorTeamEntry,
} from "../../run-history/domain/run-execution-tree-shared-records.js";
import { CollaborationHandoffCompiler } from "../definition/collaboration-handoff-compiler.js";
import {
  createAgentTeamAddress,
  getAgentTeamAddressSegments,
  type AgentTeamAddress,
} from "../domain/agent-team-address.js";
import type { AdmissibleCollaboratorDefinition, CollaboratorDefinitionCatalog } from "./collaborator-candidate-policy.js";

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
 * Snapshots a definition into a collaborator entry with the run's root settings. A Team entry
 * keeps its layout (mounted at the collaborator address) and its rebased Team-local handoffs,
 * so reopening the run never depends on later definition edits.
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
  ): Promise<CollaboratorAgentEntry | CollaboratorTeamEntry> {
    if (definition.kind === "agent") {
      return Object.freeze({
        kind: "agent",
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
