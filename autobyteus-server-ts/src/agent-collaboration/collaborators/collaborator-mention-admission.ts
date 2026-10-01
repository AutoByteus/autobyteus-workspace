import {
  COLLABORATOR_ADD_FAILED,
  composeCollaboratorMentionNote,
  type CollaboratorMentionDto,
  type MentionedCollaborator,
} from "@autobyteus/agent-presentation-contracts";
import type { CollaboratorEntry } from "../../run-history/domain/run-execution-tree-shared-records.js";
import { allocateCollaboratorAddress } from "./collaborator-address-allocator.js";
import type {
  CollaboratorCandidatePolicy,
  CollaboratorMention,
} from "./collaborator-candidate-policy.js";
import type { CollaboratorEntryBuilder, CollaboratorEntryPlan } from "./collaborator-entry-builder.js";
import type { CollaboratorRootPort } from "./collaborator-root-port.js";
import { CollaboratorAddError, CollaboratorMentionError } from "./collaborator-errors.js";
import type { CollaboratorRunnabilityValidator } from "./collaborator-runnability-validator.js";
import { CollaboratorIdentityAllocator, type CollaboratorIdentityPorts } from "./collaborator-identity-allocator.js";

/**
 * What a root returns to the transport: the content to post, or the collaborator that could
 * not be added and why (nothing was added and the message must not be posted).
 */
export type CollaboratorMentionAdmissionResult =
  | Readonly<{ admitted: true; content: string; collaborators: readonly MentionedCollaborator[] }>
  | Readonly<{ admitted: false; code: typeof COLLABORATOR_ADD_FAILED; collaboratorName: string; message: string }>;

/** A root's answer to a send with mentions: the admission result, or a send the root cannot admit at all. */
export type RootCollaboratorAdmissionResult =
  | CollaboratorMentionAdmissionResult
  | Readonly<{ admitted: false; code: "RUN_NOT_FOUND" | "COLLABORATOR_MENTION_UNAVAILABLE"; message: string }>;

export const toCollaboratorMentions = (
  mentions: readonly CollaboratorMentionDto[] | null | undefined,
): readonly CollaboratorMention[] => Object.freeze((mentions ?? []).map((mention) =>
  Object.freeze({ kind: mention.kind, definitionId: mention.definition_id })));

export type { CollaboratorMention };

export type CollaboratorAdmissionPlan = Readonly<{
  /** Collaborators to add: validated and allocated before the root commits them. */
  newPlans: readonly CollaboratorEntryPlan[];
  /** Every mention, in order, as the note lists it. */
  resolved: readonly MentionedCollaborator[];
}>;

/**
 * Stateless admission coordinator (DS-001). Inside the root's operation gate it plans every
 * mention (reusing the entry of a definition that is already a collaborator), checks that each
 * new collaborator can run with the root settings, allocates its run IDs, lets the root commit
 * and publish the new entries, and composes the mention note. All or nothing: any failure
 * returns `COLLABORATOR_ADD_FAILED` and nothing is added or posted.
 */
export class CollaboratorMentionAdmission {
  constructor(private readonly dependencies: Readonly<{
    policy: CollaboratorCandidatePolicy;
    entries: CollaboratorEntryBuilder;
    runnability: CollaboratorRunnabilityValidator;
  }>) {}

  get policy(): CollaboratorCandidatePolicy { return this.dependencies.policy; }

  async admit(port: CollaboratorRootPort, input: Readonly<{
    focusedAgentRunId: string;
    content: string;
    mentions: readonly CollaboratorMention[];
    identities: CollaboratorIdentityPorts;
    /**
     * The root commits the new entries in one tree write and publishes their hosted
     * executions (Offline) and `collaborator_added`. A failure before the durable commit
     * leaves the run unchanged.
     */
    addEntries(entries: readonly CollaboratorEntry[]): Promise<void>;
  }>): Promise<CollaboratorMentionAdmissionResult> {
    if (input.mentions.length === 0) {
      return Object.freeze({ admitted: true, content: input.content, collaborators: Object.freeze([]) });
    }
    let plan: CollaboratorAdmissionPlan | null = null;
    try {
      plan = await this.plan(port, { focusedAgentRunId: input.focusedAgentRunId, mentions: input.mentions, now: new Date().toISOString() });
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
      if (error instanceof CollaboratorAddError) {
        return Object.freeze({
          admitted: false, code: COLLABORATOR_ADD_FAILED, collaboratorName: error.collaboratorName, message: error.reason,
        });
      }
      throw error;
    }
    return Object.freeze({
      admitted: true,
      content: composeCollaboratorMentionNote(input.content, plan.resolved),
      collaborators: plan.resolved,
    });
  }

  /** Plans every mention; never writes or allocates. Throws `CollaboratorAddError`. */
  async plan(port: CollaboratorRootPort, input: Readonly<{
    focusedAgentRunId: string;
    mentions: readonly CollaboratorMention[];
    now: string;
  }>): Promise<CollaboratorAdmissionPlan> {
    const admissible = [];
    for (const mention of input.mentions) {
      try { admissible.push(await this.dependencies.policy.requireAdmissible(port, mention)); }
      catch (error) {
        if (error instanceof CollaboratorMentionError) throw new CollaboratorAddError(error.collaboratorName ?? mention.definitionId, error.message);
        throw error;
      }
    }
    const addressesInUse = new Set(port.addressesInUse());
    const newPlans: CollaboratorEntryPlan[] = [];
    const resolved: MentionedCollaborator[] = [];
    for (const definition of admissible) {
      const sameDefinition = (entry: CollaboratorEntry | CollaboratorEntryPlan) => entry.kind === definition.kind
        && (entry.kind === "agent" ? entry.agentDefinitionId : entry.teamDefinitionId) === definition.definition.id;
      let address = (port.collaborators().find(sameDefinition) ?? newPlans.find(sameDefinition))?.address;
      if (!address) {
        address = allocateCollaboratorAddress(definition.definition.name, addressesInUse);
        addressesInUse.add(address);
        try {
          newPlans.push(await this.dependencies.entries.build(definition, {
            address,
            rootLaunchConfiguration: port.rootLaunchConfiguration(),
            addedAt: input.now,
            addedViaAgentRunId: input.focusedAgentRunId,
          }));
        } catch (error) {
          throw new CollaboratorAddError(definition.definition.name, `Its definition could not be resolved: ${messageOf(error)}`);
        }
      }
      resolved.push(Object.freeze({ name: definition.definition.name, kind: definition.kind, address }));
    }
    return Object.freeze({ newPlans: Object.freeze(newPlans), resolved: Object.freeze(resolved) });
  }
}

const messageOf = (error: unknown): string => error instanceof Error ? error.message : String(error);
