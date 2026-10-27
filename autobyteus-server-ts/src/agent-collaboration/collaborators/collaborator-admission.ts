import {
  COLLABORATOR_ADD_FAILED,
  type CollaboratorMentionDto,
  type MentionedCollaborator,
} from "@autobyteus/agent-presentation-contracts";
import type { TaskExecutionSource } from "../../run-history/domain/run-execution-tree-shared-records.js";
import type { DelegationWork, RoutingDecisionDraft } from "../../model-routing/domain/model-routing-types.js";
import { routingDecisionDraftOf } from "./routing-decision-draft.js";
import {
  preferredInRunPlacement,
  type AdmissibleCollaboratorDefinition,
  type CollaboratorCandidatePolicy,
  type CollaboratorMention,
} from "./collaborator-candidate-policy.js";
import type {
  CollaboratorDefinitionPlan,
  CollaboratorEntryBuilder,
  CollaboratorEntryPlan,
} from "./collaborator-entry-builder.js";
import type { CollaboratorRootPort } from "./collaborator-root-port.js";
import type { MentionViewer, MentionViewerRelation, OwnTeamMentionFacts } from "./mention-viewer.js";
import { CollaboratorAddError, CollaboratorMentionError } from "./collaborator-errors.js";
import type { CollaboratorLaunchResolver } from "./collaborator-launch-resolver.js";
import { entryPlanLaunchNotes } from "./launch-configuration-notes.js";
import { catalogDefinitionKey, type CatalogDefinitionRef } from "./catalog-address-map.js";

/**
 * The outcome of resolving `@` mentions: every requested definition, in order, at its address
 * and presence; or the definition that cannot be involved and why.
 */
export type CollaboratorAdmissionResult =
  | Readonly<{ admitted: true; collaborators: readonly MentionedCollaborator[]; launchNotes: readonly string[] }>
  | Readonly<{ admitted: false; code: typeof COLLABORATOR_ADD_FAILED; collaboratorName: string; message: string }>;

/** A root's answer to a send with mentions: the admission result, or a send the root cannot admit at all. */
export type RootCollaboratorAdmissionResult =
  | CollaboratorAdmissionResult
  | Readonly<{ admitted: false; code: "RUN_NOT_FOUND" | "COLLABORATOR_MENTION_UNAVAILABLE"; message: string }>;

export const toCollaboratorMentions = (
  mentions: readonly CollaboratorMentionDto[] | null | undefined,
): readonly CollaboratorMention[] => Object.freeze((mentions ?? []).map((mention) =>
  Object.freeze({ kind: mention.kind, definitionId: mention.definition_id })));

export type { CollaboratorMention };

/**
 * A catalog task copy's definition snapshot (REQ-005): no collaborator entry, no identities.
 * `launchNotes` describe this admission's skipped configured layers (empty when none).
 */
export type CatalogTaskSource = Readonly<{
  name: string;
  source: TaskExecutionSource;
  launchNotes: readonly string[];
  /** Present only when the copy was resolved while Model Routing was on: its decision records once it starts (REQ-012). */
  routingDecision?: RoutingDecisionDraft;
}>;

/**
 * Stateless catalog coordinator. `@` only resolves: `resolveMentions` validates each mentioned
 * definition and answers its address without adding anything. Delegation reads
 * `catalogTaskSource`, the definition snapshot a fresh catalog copy starts from. Nothing here
 * ever creates a run or an entry. The `@` mention note is composed by the `@` callers, not here.
 */
export class CollaboratorAdmission {
  constructor(private readonly dependencies: Readonly<{
    policy: CollaboratorCandidatePolicy;
    entries: CollaboratorEntryBuilder;
    launches: CollaboratorLaunchResolver;
  }>) {}

  get policy(): CollaboratorCandidatePolicy { return this.dependencies.policy; }

  /**
   * `@`: each mentioned definition, in order, with its name, kind, address and presence. An
   * in-run definition resolves to its preferred in-run placement address with its relation to the
   * focused agent (`self`, `own_team`, `run_agent` when that placement is the run's own agent, else
   * `in_run`); any other to its catalog address (`not_in_run`). Never writes, allocates or publishes. An
   * ineligible mention returns `COLLABORATOR_ADD_FAILED` with its name.
   */
  async resolveMentions(
    port: CollaboratorRootPort,
    definitions: readonly CollaboratorMention[],
    viewer: MentionViewer,
  ): Promise<CollaboratorAdmissionResult> {
    if (definitions.length === 0) return admitted(Object.freeze([]));
    try {
      const eligible: AdmissibleCollaboratorDefinition[] = [];
      for (const ref of definitions) eligible.push(await this.checked(() => this.dependencies.policy.requireEligible(port, ref), ref));
      const addresses = await this.dependencies.policy.catalogAddressMap(port);
      const placements = port.inRunPlacementsByDefinition();
      const collaborators = eligible.map((definition): MentionedCollaborator => {
        // Own team first (SR-011): the focused agent's own team instance is checked by definition before the
        // configured-placement and catalog paths, because a task agent team's members are neither.
        const own = ownTeamMention(viewer.ownTeam, definition.kind, definition.definition.id);
        if (own) return Object.freeze({ name: definition.definition.name, kind: definition.kind, address: own.address, presence: own.presence });
        const address = addresses.addressFor({ kind: definition.kind, definitionId: definition.definition.id });
        if (!address) throw new CollaboratorAddError(definition.definition.name, "It has no address in this run.");
        const preferred = preferredInRunPlacement(placements.get(catalogDefinitionKey({ kind: definition.kind, definitionId: definition.definition.id })) ?? []);
        const presence = !preferred ? "not_in_run" : presenceFor(viewer.relation(address), preferred.rank);
        return Object.freeze({ name: definition.definition.name, kind: definition.kind, address, presence });
      });
      return admitted(Object.freeze(collaborators));
    } catch (error) {
      if (error instanceof CollaboratorAddError) return addFailed(error);
      throw error;
    }
  }

  /** The eligible catalog definition at `address` that is not in the run; null otherwise. */
  async catalogDefinitionAt(port: CollaboratorRootPort, address: string): Promise<CatalogDefinitionRef | null> {
    if (port.isApplicationBound) return null;
    return (await this.dependencies.policy.catalogAddressMap(port)).definitionFor(address);
  }

  /**
   * The source snapshot of a task copy of the catalog definition at `address` (DS-003): the
   * definition, its Team layout and handoffs, and each agent's launch resolved by the layer
   * order, with this admission's launch notes. Null when `address` is no catalog
   * address. Throws `CollaboratorAddError` when the copy cannot run.
   */
  async catalogTaskSource(port: CollaboratorRootPort, input: Readonly<{
    address: string;
    senderRunId: string;
    /** The work the copy is started for (the Model Router is told it). */
    work: DelegationWork;
  }>): Promise<CatalogTaskSource | null> {
    const ref = await this.catalogDefinitionAt(port, input.address);
    return ref ? this.catalogTaskSourceOf(port, { ref, address: input.address, work: input.work }) : null;
  }

  /**
   * The source snapshot of a task copy of the catalog definition `ref` at `address`, with launches resolved
   * from `port.launchBase()`. A caller that must decide by kind first (a run started for a peer node) calls
   * `catalogDefinitionAt` and then this. Throws `CollaboratorAddError` (or its `CollaboratorNoDefaultLaunchError`)
   * when the copy cannot run.
   */
  async catalogTaskSourceOf(port: CollaboratorRootPort, input: Readonly<{
    ref: CatalogDefinitionRef;
    address: string;
    work: DelegationWork;
  }>): Promise<CatalogTaskSource> {
    const definition = await this.admissible(port, input.ref);
    const plan = await this.buildPlan(definition, { address: input.address });
    const { plans: [resolved], modelRoutingOn } = await this.dependencies.launches.resolve([plan], port.launchBase(), input.work);
    return Object.freeze({
      name: resolved!.name,
      source: toTaskExecutionSource(resolved!),
      launchNotes: Object.freeze(entryPlanLaunchNotes(resolved!)),
      ...(modelRoutingOn ? { routingDecision: routingDecisionDraftOf(resolved!) } : {}),
    });
  }

  /** Catalog copies: never a second instance of a definition already in the run. */
  private admissible(port: CollaboratorRootPort, ref: CollaboratorMention): Promise<AdmissibleCollaboratorDefinition> {
    return this.checked(() => this.dependencies.policy.requireAdmissible(port, ref), ref);
  }

  private async checked(check: () => Promise<AdmissibleCollaboratorDefinition>, ref: CollaboratorMention): Promise<AdmissibleCollaboratorDefinition> {
    try { return await check(); }
    catch (error) {
      if (error instanceof CollaboratorMentionError) throw new CollaboratorAddError(error.collaboratorName ?? ref.definitionId, error.message);
      throw error;
    }
  }

  private async buildPlan(
    definition: AdmissibleCollaboratorDefinition,
    input: Readonly<{ address: string }>,
  ): Promise<CollaboratorDefinitionPlan> {
    try {
      return await this.dependencies.entries.build(definition, {
        address: input.address as CollaboratorDefinitionPlan["address"],
      });
    } catch (error) {
      throw new CollaboratorAddError(definition.definition.name, `Its definition could not be resolved: ${messageOf(error)}`);
    }
  }
}

const toTaskExecutionSource = (plan: CollaboratorEntryPlan): TaskExecutionSource => plan.kind === "agent"
  ? Object.freeze({
      kind: "agent",
      agentDefinitionId: plan.agentDefinitionId,
      launchConfiguration: plan.launchConfiguration,
      launchSource: plan.launchSource,
    })
  : Object.freeze({
      kind: "agent_team",
      teamDefinitionId: plan.teamDefinitionId,
      coordinatorAddress: plan.coordinatorAddress,
      members: plan.members,
      handoffs: plan.handoffs,
      defaultLaunchConfiguration: plan.defaultLaunchConfiguration,
      defaultLaunchSource: plan.defaultLaunchSource,
    });

/**
 * A mentioned definition that belongs to the focused agent's own team instance: the agent itself (`self`), a
 * member (`own_team`, at its address in the instance) or the team itself (`own_team`, at the instance address).
 */
const ownTeamMention = (
  ownTeam: OwnTeamMentionFacts | null,
  kind: "agent" | "agent_team",
  definitionId: string,
): Readonly<{ address: MentionedCollaborator["address"]; presence: "self" | "own_team" }> | null => {
  if (!ownTeam) return null;
  if (kind === "agent_team") {
    return ownTeam.teamDefinitionId === definitionId ? Object.freeze({ address: ownTeam.teamAddress, presence: "own_team" as const }) : null;
  }
  if (ownTeam.members.some((member) => member.address === ownTeam.selfAddress && member.definitionId === definitionId)) {
    return Object.freeze({ address: ownTeam.selfAddress, presence: "self" as const });
  }
  const member = ownTeam.members.find((candidate) => candidate.definitionId === definitionId);
  return member ? Object.freeze({ address: member.address, presence: "own_team" as const }) : null;
};

/** The note presence of an in-run placement for the focused agent (wording §8). */
const presenceFor = (relation: ReturnType<MentionViewerRelation>, rank: "run_agent" | "configured"): MentionedCollaborator["presence"] =>
  relation === "self" ? "self" : relation === "own_team" ? "own_team" : rank === "run_agent" ? "run_agent" : "in_run";

const admitted = (collaborators: readonly MentionedCollaborator[], launchNotes: readonly string[] = []): CollaboratorAdmissionResult =>
  Object.freeze({ admitted: true, collaborators, launchNotes: Object.freeze([...launchNotes]) });

const addFailed = (error: CollaboratorAddError): CollaboratorAdmissionResult => Object.freeze({
  admitted: false, code: COLLABORATOR_ADD_FAILED, collaboratorName: error.collaboratorName, message: error.reason,
});

const messageOf = (error: unknown): string => error instanceof Error ? error.message : String(error);
