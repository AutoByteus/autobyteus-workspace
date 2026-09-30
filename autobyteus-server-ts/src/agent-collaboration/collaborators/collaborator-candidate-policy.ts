import type { AgentDefinition } from "../../agent-definition/domain/models.js";
import type { AgentTeamDefinition } from "../../agent-team-definition/domain/agent-team-definition.js";
import { BUILT_IN_AGENT_DEFINITIONS } from "../../built-in-agents/built-in-agent-registry.js";
import type { CollaboratorMentionKind } from "@autobyteus/agent-presentation-contracts";
import type { CollaboratorRootPort } from "./collaborator-root-port.js";
import { CollaboratorMentionError } from "./collaborator-errors.js";

/** Read access to the shared definition catalogs, in catalog order. */
export type CollaboratorDefinitionCatalog = Readonly<{
  listAgentDefinitions(): Promise<readonly AgentDefinition[]>;
  listTeamDefinitions(): Promise<readonly AgentTeamDefinition[]>;
  getAgentDefinition(id: string): Promise<AgentDefinition | null>;
  getTeamDefinition(id: string): Promise<AgentTeamDefinition | null>;
}>;

export type CollaboratorCandidate =
  | Readonly<{ kind: "agent"; definitionId: string; name: string; description: string }>
  | Readonly<{
      kind: "agent_team";
      definitionId: string;
      name: string;
      description: string;
      memberCount: number;
      coordinatorName: string;
    }>;

export type CollaboratorCandidateList = Readonly<{
  availability: "AVAILABLE" | "UNAVAILABLE_APPLICATION_ROOT";
  candidates: readonly CollaboratorCandidate[];
}>;

export type AdmissibleCollaboratorDefinition =
  | Readonly<{ kind: "agent"; definition: AgentDefinition & { id: string } }>
  | Readonly<{ kind: "agent_team"; definition: AgentTeamDefinition & { id: string } }>;

export type InRunDefinitionIds = Readonly<{
  agentDefinitionIds: ReadonlySet<string>;
  teamDefinitionIds: ReadonlySet<string>;
}>;

export type CollaboratorMention = Readonly<{ kind: CollaboratorMentionKind; definitionId: string }>;

/** Daily Assistant (the default chat agent) and the internal helpers are never collaborators. */
const EXCLUDED_AGENT_DEFINITION_IDS: ReadonlySet<string> = new Set(BUILT_IN_AGENT_DEFINITIONS.map((entry) => entry.id));

const hasId = <T extends { id?: string | null }>(definition: T): definition is T & { id: string } =>
  typeof definition.id === "string" && definition.id.trim().length > 0;

/**
 * The single owner of `@` eligibility. Candidates are shared standalone Agent definitions
 * then shared Agent Team definitions, in catalog order, minus everything already in the run.
 * Agent Orgs are never candidates.
 */
export class CollaboratorCandidatePolicy {
  constructor(private readonly catalog: CollaboratorDefinitionCatalog) {}

  /**
   * In the run: the root's own and configured definitions, plus every collaborator with at
   * least one task execution and the member Agents of such collaborator Teams. A collaborator
   * with no task execution (a failed or unattempted add) is not in the run.
   */
  inRunDefinitionIds(port: CollaboratorRootPort): InRunDefinitionIds {
    const configured = port.configuredDefinitionIds();
    const agents = new Set(configured.agentDefinitionIds);
    const teams = new Set(configured.teamDefinitionIds);
    for (const entry of port.collaborators()) {
      if (!port.hasTaskExecutionAt(entry.address)) continue;
      if (entry.kind === "agent") {
        agents.add(entry.agentDefinitionId);
        continue;
      }
      teams.add(entry.teamDefinitionId);
      entry.members.forEach((member) => agents.add(member.agentDefinitionId));
    }
    return Object.freeze({ agentDefinitionIds: agents, teamDefinitionIds: teams });
  }

  async listCandidates(port: CollaboratorRootPort): Promise<CollaboratorCandidateList> {
    if (port.isApplicationBound) {
      return Object.freeze({ availability: "UNAVAILABLE_APPLICATION_ROOT", candidates: Object.freeze([]) });
    }
    const inRun = this.inRunDefinitionIds(port);
    const [agents, teams] = await Promise.all([this.catalog.listAgentDefinitions(), this.catalog.listTeamDefinitions()]);
    const candidates: CollaboratorCandidate[] = [];
    for (const agent of agents) {
      if (!this.isEligibleAgent(agent) || inRun.agentDefinitionIds.has(agent.id)) continue;
      candidates.push(Object.freeze({ kind: "agent", definitionId: agent.id, name: agent.name, description: agent.description ?? "" }));
    }
    for (const team of teams) {
      if (!this.isEligibleTeam(team) || inRun.teamDefinitionIds.has(team.id)) continue;
      candidates.push(Object.freeze({
        kind: "agent_team",
        definitionId: team.id,
        name: team.name,
        description: team.description ?? "",
        memberCount: team.nodes.length,
        coordinatorName: team.coordinatorMemberName,
      }));
    }
    return Object.freeze({ availability: "AVAILABLE", candidates: Object.freeze(candidates) });
  }

  /**
   * Admission re-check of one mention. A definition that already has a collaborator entry is
   * admissible (admission reuses that entry); anything else in the run is not.
   */
  async requireAdmissible(port: CollaboratorRootPort, mention: CollaboratorMention): Promise<AdmissibleCollaboratorDefinition> {
    if (port.isApplicationBound) {
      throw new CollaboratorMentionError("COLLABORATOR_MENTION_UNAVAILABLE", "Collaborators cannot be brought into application-owned runs.");
    }
    const existing = port.collaborators().some((entry) => entry.kind === mention.kind
      && (entry.kind === "agent" ? entry.agentDefinitionId : entry.teamDefinitionId) === mention.definitionId);
    const inRun = this.inRunDefinitionIds(port);
    if (mention.kind === "agent") {
      const definition = await this.catalog.getAgentDefinition(mention.definitionId);
      if (!definition || !this.isEligibleAgent(definition)) throw this.invalid(mention);
      if (!existing && inRun.agentDefinitionIds.has(definition.id)) throw this.alreadyInRun(definition.name);
      return Object.freeze({ kind: "agent", definition });
    }
    const definition = await this.catalog.getTeamDefinition(mention.definitionId);
    if (!definition || !this.isEligibleTeam(definition)) throw this.invalid(mention);
    if (!existing && inRun.teamDefinitionIds.has(definition.id)) throw this.alreadyInRun(definition.name);
    return Object.freeze({ kind: "agent_team", definition });
  }

  private isEligibleAgent(definition: AgentDefinition): definition is AgentDefinition & { id: string } {
    return hasId(definition) && definition.ownershipScope === "shared" && !EXCLUDED_AGENT_DEFINITION_IDS.has(definition.id);
  }

  private isEligibleTeam(definition: AgentTeamDefinition): definition is AgentTeamDefinition & { id: string } {
    return hasId(definition) && definition.ownershipScope === "shared";
  }

  private invalid(mention: CollaboratorMention): CollaboratorMentionError {
    return new CollaboratorMentionError(
      "COLLABORATOR_MENTION_INVALID",
      `'${mention.definitionId}' is not a shared ${mention.kind === "agent" ? "Agent" : "Agent Team"} that can be mentioned.`,
    );
  }

  private alreadyInRun(name: string): CollaboratorMentionError {
    return new CollaboratorMentionError("COLLABORATOR_MENTION_UNAVAILABLE", `${name} is already in this run.`);
  }
}
