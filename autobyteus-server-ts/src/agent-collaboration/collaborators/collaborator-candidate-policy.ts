import type { AgentDefinition } from "../../agent-definition/domain/models.js";
import type { AgentTeamDefinition } from "../../agent-team-definition/domain/agent-team-definition.js";
import { BUILT_IN_AGENT_DEFINITIONS } from "../../built-in-agents/built-in-agent-registry.js";
import type { CollaboratorMentionKind } from "@autobyteus/agent-presentation-contracts";
import type { AgentTeamAddress } from "../domain/agent-team-address.js";
import type { CollaboratorRootPort, InRunPlacement } from "./collaborator-root-port.js";
import { CollaboratorMentionError } from "./collaborator-errors.js";
import { CatalogAddressMap } from "./catalog-address-map.js";

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

/** One `list_available_agents` entry: an eligible definition at its in-run or catalog address. */
export type AvailableCollaborator = Readonly<{
  name: string;
  kind: CollaboratorMentionKind;
  address: AgentTeamAddress;
  description: string;
}>;

const RANK_ORDER: readonly InRunPlacement["rank"][] = ["configured", "collaborator", "collaborator_member"];

/** AR-002: one in-run address per definition, by rank, then the lexicographically smallest address. */
const preferredInRunAddress = (placements: readonly InRunPlacement[]): AgentTeamAddress | null => {
  const [best] = [...placements].sort((left, right) =>
    RANK_ORDER.indexOf(left.rank) - RANK_ORDER.indexOf(right.rank)
    || (left.address < right.address ? -1 : left.address > right.address ? 1 : 0));
  return best?.address ?? null;
};

/** General Agent (the default chat agent) and the internal helpers are never collaborators. */
const EXCLUDED_AGENT_DEFINITION_IDS: ReadonlySet<string> = new Set(BUILT_IN_AGENT_DEFINITIONS.map((entry) => entry.id));

const hasId = <T extends { id?: string | null }>(definition: T): definition is T & { id: string } =>
  typeof definition.id === "string" && definition.id.trim().length > 0;

/**
 * The single owner of `@` and catalog eligibility. Candidates are shared standalone Agent
 * definitions then shared Agent Team definitions, in catalog order. Agent Orgs, the internal
 * built-ins and the root's own definition are never candidates. `@` offers only definitions
 * not yet in the run; `list_available_agents` lists every eligible definition once, at its
 * in-run address or at the address it gets when brought in (Q-2: the same eligibility).
 */
export class CollaboratorCandidatePolicy {
  constructor(private readonly catalog: CollaboratorDefinitionCatalog) {}

  /**
   * In the run: the root's own definition and every in-run placement (configured placements,
   * collaborator entries, which exist only after a successful add, and collaborator-Team members).
   */
  inRunDefinitionIds(port: CollaboratorRootPort): InRunDefinitionIds {
    const agents = new Set<string>();
    const teams = new Set<string>();
    const own = port.rootDefinition();
    if (own) (own.kind === "agent" ? agents : teams).add(own.definitionId);
    for (const key of port.inRunPlacementsByDefinition().keys()) {
      const separator = key.indexOf(":");
      (key.slice(0, separator) === "agent" ? agents : teams).add(key.slice(separator + 1));
    }
    return Object.freeze({ agentDefinitionIds: agents, teamDefinitionIds: teams });
  }

  /** The run's catalog address map over every eligible definition except the root's own. */
  async catalogAddressMap(port: CollaboratorRootPort): Promise<CatalogAddressMap> {
    return (await this.catalogView(port)).map;
  }

  /**
   * Every eligible definition once, at its address; empty for application-owned runs.
   * Read-only: nothing is written to the run.
   */
  async listEligible(port: CollaboratorRootPort): Promise<readonly AvailableCollaborator[]> {
    if (port.isApplicationBound) return Object.freeze([]);
    const { eligible, map } = await this.catalogView(port);
    return Object.freeze(eligible.map((entry) => Object.freeze({
      name: entry.name,
      kind: entry.kind,
      address: map.addressFor(entry)!,
      description: entry.description,
    })));
  }

  private async catalogView(port: CollaboratorRootPort) {
    const own = port.rootDefinition();
    const [agents, teams] = await Promise.all([this.catalog.listAgentDefinitions(), this.catalog.listTeamDefinitions()]);
    const eligible = [
      ...agents.filter((agent) => this.isEligibleAgent(agent)).map((agent) =>
        ({ kind: "agent" as const, definitionId: agent.id!, name: agent.name, description: agent.description ?? "" })),
      ...teams.filter((team) => this.isEligibleTeam(team)).map((team) =>
        ({ kind: "agent_team" as const, definitionId: team.id!, name: team.name, description: team.description ?? "" })),
    ].filter((entry) => !own || own.kind !== entry.kind || own.definitionId !== entry.definitionId);
    const inRunAddresses = new Map<string, AgentTeamAddress>();
    for (const [key, placements] of port.inRunPlacementsByDefinition()) {
      const address = preferredInRunAddress(placements);
      if (address) inRunAddresses.set(key, address);
    }
    const map = new CatalogAddressMap({ eligible, inRunAddresses, addressesInUse: port.addressesInUse() });
    return { eligible, map };
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
    return new CollaboratorMentionError("COLLABORATOR_MENTION_UNAVAILABLE", `${name} is already in this run.`, name);
  }
}
