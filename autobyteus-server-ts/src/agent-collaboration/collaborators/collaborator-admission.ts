import {
  COLLABORATOR_ADD_FAILED,
  type CollaboratorMentionDto,
  type MentionedCollaborator,
} from "@autobyteus/agent-presentation-contracts";
import type {
  CollaboratorEntry,
  TaskExecutionSource,
} from "../../run-history/domain/run-execution-tree-shared-records.js";
import {
  preferredInRunPlacement,
  type AdmissibleCollaboratorDefinition,
  type CollaboratorCandidatePolicy,
  type CollaboratorMention,
} from "./collaborator-candidate-policy.js";
import type { CollaboratorEntryBuilder, CollaboratorEntryPlan } from "./collaborator-entry-builder.js";
import type { CollaboratorRootPort } from "./collaborator-root-port.js";
import { CollaboratorAddError, CollaboratorMentionError } from "./collaborator-errors.js";
import type { CollaboratorRunnabilityValidator } from "./collaborator-runnability-validator.js";
import { CollaboratorIdentityAllocator, type CollaboratorIdentityPorts } from "./collaborator-identity-allocator.js";
import { catalogDefinitionKey, type CatalogDefinitionRef } from "./catalog-address-map.js";

/**
 * The outcome of ensuring collaborators: every requested definition, in order, at its
 * collaborator address; or the collaborator that could not be added and why (nothing was added).
 */
export type CollaboratorAdmissionResult =
  | Readonly<{ admitted: true; collaborators: readonly MentionedCollaborator[] }>
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

export type CollaboratorAdmissionPlan = Readonly<{
  /** Collaborators to add: validated and allocated before the root commits them. */
  newPlans: readonly CollaboratorEntryPlan[];
  /** Every requested definition, in order, at its collaborator address. */
  resolved: readonly MentionedCollaborator[];
}>;

/** A catalog task copy's definition snapshot (REQ-005): no collaborator entry, no identities. */
export type CatalogTaskSource = Readonly<{ name: string; source: TaskExecutionSource }>;

/**
 * Stateless collaborator coordinator. `@` only resolves: `resolveMentions` validates each
 * mentioned definition and answers its address without adding anything. Agent-initiated
 * bring-in admits: the root calls `ensure` inside the operation gate it already holds (never
 * re-entering it): it plans every definition (reusing the entry of one that is already a
 * collaborator), checks that each new collaborator can run with the root settings, allocates
 * its run IDs at its catalog address, and lets the root commit and publish the new entries.
 * All or nothing: any failure returns `COLLABORATOR_ADD_FAILED` and nothing is added. The `@`
 * mention note is composed by the `@` callers, not here.
 */
export class CollaboratorAdmission {
  constructor(private readonly dependencies: Readonly<{
    policy: CollaboratorCandidatePolicy;
    entries: CollaboratorEntryBuilder;
    runnability: CollaboratorRunnabilityValidator;
  }>) {}

  get policy(): CollaboratorCandidatePolicy { return this.dependencies.policy; }

  async ensure(port: CollaboratorRootPort, input: Readonly<{
    /** The agent that brought the collaborators in (the `@` focused agent or the sender). */
    senderRunId: string;
    definitions: readonly CollaboratorMention[];
    identities: CollaboratorIdentityPorts;
    /**
     * The root commits the new entries in one tree write and publishes their hosted
     * executions (Offline) and `collaborator_added`. A failure before the durable commit
     * leaves the run unchanged.
     */
    addEntries(entries: readonly CollaboratorEntry[]): Promise<void>;
  }>): Promise<CollaboratorAdmissionResult> {
    if (input.definitions.length === 0) return Object.freeze({ admitted: true, collaborators: Object.freeze([]) });
    let plan: CollaboratorAdmissionPlan;
    try {
      plan = await this.plan(port, { senderRunId: input.senderRunId, definitions: input.definitions, now: new Date().toISOString() });
      await this.dependencies.runnability.validate(plan.newPlans);
      const allocator = new CollaboratorIdentityAllocator(input.identities);
      const entries: CollaboratorEntry[] = [];
      for (const newPlan of plan.newPlans) {
        try { entries.push(await allocator.allocate(newPlan)); }
        catch (error) { throw new CollaboratorAddError(newPlan.name, `Its run could not be prepared: ${messageOf(error)}`); }
      }
      if (entries.length) {
        try { await input.addEntries(entries); }
        catch (error) { throw new CollaboratorAddError(plan.newPlans[0]!.name, messageOf(error)); }
      }
    } catch (error) {
      if (error instanceof CollaboratorAddError) return addFailed(error);
      throw error;
    }
    return Object.freeze({ admitted: true, collaborators: plan.resolved });
  }

  /**
   * `@`: each mentioned definition, in order, with its name, kind, address and presence. An
   * in-run definition resolves to its collaborator entry's address, else its preferred in-run
   * placement address (`run_agent` when that placement is the run's own agent, else `in_run`);
   * any other to its catalog address (`not_in_run`). Never writes, allocates or publishes. An
   * ineligible mention returns `COLLABORATOR_ADD_FAILED` with its name.
   */
  async resolveMentions(port: CollaboratorRootPort, definitions: readonly CollaboratorMention[]): Promise<CollaboratorAdmissionResult> {
    if (definitions.length === 0) return Object.freeze({ admitted: true, collaborators: Object.freeze([]) });
    try {
      const eligible: AdmissibleCollaboratorDefinition[] = [];
      for (const ref of definitions) eligible.push(await this.checked(() => this.dependencies.policy.requireEligible(port, ref), ref));
      const addresses = await this.dependencies.policy.catalogAddressMap(port);
      const placements = port.inRunPlacementsByDefinition();
      const collaborators = eligible.map((definition): MentionedCollaborator => {
        const entry = port.collaborators().find(sameDefinitionAs(definition));
        const address = entry?.address ?? addresses.addressFor({ kind: definition.kind, definitionId: definition.definition.id });
        if (!address) throw new CollaboratorAddError(definition.definition.name, "It has no address in this run.");
        const preferred = preferredInRunPlacement(placements.get(catalogDefinitionKey({ kind: definition.kind, definitionId: definition.definition.id })) ?? []);
        const presence = entry ? "in_run" : preferred?.rank === "run_agent" ? "run_agent" : preferred ? "in_run" : "not_in_run";
        return Object.freeze({ name: definition.definition.name, kind: definition.kind, address, presence });
      });
      return Object.freeze({ admitted: true, collaborators: Object.freeze(collaborators) });
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
   * definition, its Team layout and handoffs, and the root launch settings, checked to run
   * like a new collaborator. Null when `address` is no catalog address. Throws
   * `CollaboratorAddError` when the copy cannot run.
   */
  async catalogTaskSource(port: CollaboratorRootPort, input: Readonly<{
    address: string;
    senderRunId: string;
  }>): Promise<CatalogTaskSource | null> {
    const ref = await this.catalogDefinitionAt(port, input.address);
    if (!ref) return null;
    const definition = await this.admissible(port, ref);
    const plan = await this.buildPlan(definition, port, {
      address: input.address, senderRunId: input.senderRunId, now: new Date().toISOString(),
    });
    await this.dependencies.runnability.validate([plan]);
    return Object.freeze({ name: plan.name, source: toTaskExecutionSource(plan) });
  }

  /** Plans every definition; never writes or allocates. Throws `CollaboratorAddError`. */
  async plan(port: CollaboratorRootPort, input: Readonly<{
    senderRunId: string;
    definitions: readonly CollaboratorMention[];
    now: string;
  }>): Promise<CollaboratorAdmissionPlan> {
    const admissible: AdmissibleCollaboratorDefinition[] = [];
    for (const ref of input.definitions) admissible.push(await this.admissible(port, ref));
    const addresses = await this.dependencies.policy.catalogAddressMap(port);
    const newPlans: CollaboratorEntryPlan[] = [];
    const resolved: MentionedCollaborator[] = [];
    for (const definition of admissible) {
      const sameDefinition = sameDefinitionAs(definition);
      let address = (port.collaborators().find(sameDefinition) ?? newPlans.find(sameDefinition))?.address;
      if (!address) {
        const allocated = addresses.addressFor({ kind: definition.kind, definitionId: definition.definition.id });
        if (!allocated) throw new CollaboratorAddError(definition.definition.name, "It has no address in this run.");
        newPlans.push(await this.buildPlan(definition, port, { address: allocated, senderRunId: input.senderRunId, now: input.now }));
        address = allocated;
      }
      // An existing collaborator entry is reused (in the run); a planned one is new.
      resolved.push(Object.freeze({ name: definition.definition.name, kind: definition.kind, address,
        presence: port.collaborators().some(sameDefinition) ? "in_run" : "not_in_run" }));
    }
    return Object.freeze({ newPlans: Object.freeze(newPlans), resolved: Object.freeze(resolved) });
  }

  /** Bring-in and catalog copies: never a second instance of a definition already in the run. */
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
    port: CollaboratorRootPort,
    input: Readonly<{ address: string; senderRunId: string; now: string }>,
  ): Promise<CollaboratorEntryPlan> {
    try {
      return await this.dependencies.entries.build(definition, {
        address: input.address as CollaboratorEntryPlan["address"],
        rootLaunchConfiguration: port.rootLaunchConfiguration(),
        addedAt: input.now,
        addedViaAgentRunId: input.senderRunId,
      });
    } catch (error) {
      throw new CollaboratorAddError(definition.definition.name, `Its definition could not be resolved: ${messageOf(error)}`);
    }
  }
}

/** An entry (or planned entry) of the same definition as the mention. */
const sameDefinitionAs = (definition: AdmissibleCollaboratorDefinition) =>
  (entry: CollaboratorEntry | CollaboratorEntryPlan): boolean => entry.kind === definition.kind
    && (entry.kind === "agent" ? entry.agentDefinitionId : entry.teamDefinitionId) === definition.definition.id;

const toTaskExecutionSource = (plan: CollaboratorEntryPlan): TaskExecutionSource => plan.kind === "agent"
  ? Object.freeze({ kind: "agent", agentDefinitionId: plan.agentDefinitionId, launchConfiguration: plan.launchConfiguration })
  : Object.freeze({
      kind: "agent_team",
      teamDefinitionId: plan.teamDefinitionId,
      coordinatorAddress: plan.coordinatorAddress,
      members: plan.members,
      handoffs: plan.handoffs,
      defaultLaunchConfiguration: plan.defaultLaunchConfiguration,
    });

const addFailed = (error: CollaboratorAddError): CollaboratorAdmissionResult => Object.freeze({
  admitted: false, code: COLLABORATOR_ADD_FAILED, collaboratorName: error.collaboratorName, message: error.reason,
});

const messageOf = (error: unknown): string => error instanceof Error ? error.message : String(error);
