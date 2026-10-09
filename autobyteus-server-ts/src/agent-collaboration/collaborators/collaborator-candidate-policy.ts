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

const RANK_ORDER: readonly InRunPlacement["rank"][] = ["run_agent", "configured", "collaborator", "collaborator_member"];

/**
 * AR-002: one in-run placement per definition, by rank, then the lexicographically smallest
 * address; its address is the definition's in-run address. Null when it has none.
 */
export const preferredInRunPlacement = (placements: readonly InRunPlacement[]): InRunPlacement | null => {
  const [best] = [...placements].sort((left, right) =>
    RANK_ORDER.indexOf(left.rank) - RANK_ORDER.indexOf(right.rank)
    || (left.address < right.address ? -1 : left.address > right.address ? 1 : 0));
  return best ?? null;
};

/** Daily Assistant (the default chat agent) and the internal helpers are never collaborators. */
const EXCLUDED_AGENT_DEFINITION_IDS: ReadonlySet<string> = new Set(BUILT_IN_AGENT_DEFINITIONS.map((entry) => entry.id));

const hasId = <T extends { id?: string | null }>(definition: T): definition is T & { id: string } =>
  typeof definition.id === "string" && definition.id.trim().length > 0;

/**
 * The single owner of `@` and catalog eligibility. Candidates are shared standalone Agent
 * definitions then shared Agent Team definitions, in catalog order. Agent Orgs, the internal
 * built-ins and the viewer's own definition (`port.ownDefinition()`) are never candidates. Two checks: `requireEligible`
 * may be mentioned with `@` (including definitions already in the run, which `@` addresses);
 * `requireAdmissible` may be brought in as a collaborator (not already in the run, unless it
 * is a collaborator whose entry is reused). `list_available_agents` lists every eligible
 * definition once, at its in-run address or at the address it gets when brought in.
 */
export class CollaboratorCandidatePolicy {
  constructor(private readonly catalog: CollaboratorDefinitionCatalog) {}

  /**
   * In the run: the viewer's own definition and every in-run placement (the run agent, configured
   * placements, collaborator entries, which exist only after a successful add, and
   * collaborator-Team members).
   */
  inRunDefinitionIds(port: CollaboratorRootPort): InRunDefinitionIds {
    const agents = new Set<string>();
    const teams = new Set<string>();
    const own = port.ownDefinition();
    if (own) (own.kind === "agent" ? agents : teams).add(own.definitionId);
    for (const key of port.inRunPlacementsByDefinition().keys()) {
      const separator = key.indexOf(":");
      (key.slice(0, separator) === "agent" ? agents : teams).add(key.slice(separator + 1));
    }
    return Object.freeze({ agentDefinitionIds: agents, teamDefinitionIds: teams });
  }

  /** The run's catalog address map over every eligible definition except the viewer's own. */
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
    const own = port.ownDefinition();
    const [agents, teams] = await Promise.all([this.catalog.listAgentDefinitions(), this.catalog.listTeamDefinitions()]);
    const eligible = [
      ...agents.filter((agent) => this.isEligibleAgent(agent)).map((agent) =>
        ({ kind: "agent" as const, definitionId: agent.id!, name: agent.name, description: agent.description ?? "" })),
      ...teams.filter((team) => this.isEligibleTeam(team)).map((team) =>
        ({ kind: "agent_team" as const, definitionId: team.id!, name: team.name, description: team.description ?? "" })),
    ].filter((entry) => !own || own.kind !== entry.kind || own.definitionId !== entry.definitionId);
    const inRunAddresses = new Map<string, AgentTeamAddress>();
    for (const [key, placements] of port.inRunPlacementsByDefinition()) {
      const placement = preferredInRunPlacement(placements);
      if (placement) inRunAddresses.set(key, placement.address);
    }
    const map = new CatalogAddressMap({ eligible, inRunAddresses, addressesInUse: port.addressesInUse() });
    return { eligible, map };
  }

  /** `@` options: every eligible definition, in the run or not, except the viewer's own definition. */
  async listCandidates(port: CollaboratorRootPort): Promise<CollaboratorCandidateList> {
    if (port.isApplicationBound) {
      return Object.freeze({ availability: "UNAVAILABLE_APPLICATION_ROOT", candidates: Object.freeze([]) });
    }
    const own = port.ownDefinition();
    const isOwn = (kind: CollaboratorMentionKind, definitionId: string) => own?.kind === kind && own.definitionId === definitionId;
    const [agents, teams] = await Promise.all([this.catalog.listAgentDefinitions(), this.catalog.listTeamDefinitions()]);
    const candidates: CollaboratorCandidate[] = [];
    for (const agent of agents) {
      if (!this.isEligibleAgent(agent) || isOwn("agent", agent.id)) continue;
      candidates.push(Object.freeze({ kind: "agent", definitionId: agent.id, name: agent.name, description: agent.description ?? "" }));
    }
    for (const team of teams) {
      if (!this.isEligibleTeam(team) || isOwn("agent_team", team.id)) continue;
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
   * `@` re-check of one mention: a shared, non-built-in definition that is not the viewer's own.
   * It may already be in the run (the mention then addresses that instance).
   */
  async requireEligible(port: CollaboratorRootPort, mention: CollaboratorMention): Promise<AdmissibleCollaboratorDefinition> {
    if (port.isApplicationBound) {
      throw new CollaboratorMentionError("COLLABORATOR_MENTION_UNAVAILABLE", "Collaborators cannot be brought into application-owned runs.");
    }
    const own = port.ownDefinition();
    const resolved: AdmissibleCollaboratorDefinition = mention.kind === "agent"
      ? { kind: "agent", definition: await this.eligibleAgent(mention) }
      : { kind: "agent_team", definition: await this.eligibleTeam(mention) };
    if (own?.kind === resolved.kind && own.definitionId === resolved.definition.id) throw this.ownDefinitionError(resolved.definition.name);
    return Object.freeze(resolved);
  }

  /**
   * Bring-in re-check of one definition: eligible, and not already in the run unless it has a
   * collaborator entry (admission reuses that entry). Never admits a second instance.
   */
  async requireAdmissible(port: CollaboratorRootPort, mention: CollaboratorMention): Promise<AdmissibleCollaboratorDefinition> {
    const eligible = await this.requireEligible(port, mention);
    const existing = port.collaborators().some((entry) => entry.kind === mention.kind
      && (entry.kind === "agent" ? entry.agentDefinitionId : entry.teamDefinitionId) === mention.definitionId);
    const inRun = this.inRunDefinitionIds(port);
    const inRunIds = eligible.kind === "agent" ? inRun.agentDefinitionIds : inRun.teamDefinitionIds;
    if (!existing && inRunIds.has(eligible.definition.id)) throw this.alreadyInRun(eligible.definition.name);
    return eligible;
  }

  private async eligibleAgent(mention: CollaboratorMention): Promise<AgentDefinition & { id: string }> {
    const definition = await this.catalog.getAgentDefinition(mention.definitionId);
    if (!definition || !this.isEligibleAgent(definition)) throw this.invalid(mention);
    return definition;
  }

  private async eligibleTeam(mention: CollaboratorMention): Promise<AgentTeamDefinition & { id: string }> {
    const definition = await this.catalog.getTeamDefinition(mention.definitionId);
    if (!definition || !this.isEligibleTeam(definition)) throw this.invalid(mention);
    return definition;
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

  private ownDefinitionError(name: string): CollaboratorMentionError {
    return new CollaboratorMentionError("COLLABORATOR_MENTION_UNAVAILABLE", `${name} is this run's own definition.`, name);
  }

  private alreadyInRun(name: string): CollaboratorMentionError {
    return new CollaboratorMentionError("COLLABORATOR_MENTION_UNAVAILABLE", `${name} is already in this run.`, name);
  }
}
