import {
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
import type { CollaboratorEntryBuilder } from "./collaborator-entry-builder.js";
import type { CollaboratorRootPort } from "./collaborator-root-port.js";
import { CollaboratorMentionError } from "./collaborator-errors.js";

/** What a root returns to the transport: the content to post, or why nothing was admitted. */
export type CollaboratorMentionAdmissionResult =
  | Readonly<{ admitted: true; content: string; collaborators: readonly MentionedCollaborator[] }>
  | Readonly<{ admitted: false; code: string; message: string }>;

export const toCollaboratorMentions = (
  mentions: readonly CollaboratorMentionDto[] | null | undefined,
): readonly CollaboratorMention[] => Object.freeze((mentions ?? []).map((mention) =>
  Object.freeze({ kind: mention.kind, definitionId: mention.definition_id })));

export type { CollaboratorMention };

export type CollaboratorAdmissionPlan = Readonly<{
  /** Entries the root must commit in one tree write before anything is delivered. */
  newEntries: readonly CollaboratorEntry[];
  /** Every mention, in order, as the note lists it. */
  resolved: readonly MentionedCollaborator[];
}>;

/**
 * Stateless admission coordinator. It validates every mention through the policy, reuses the
 * existing entry per definition or builds a new one, and returns the plan. All or nothing:
 * any rejected mention rejects the whole plan. It never writes and never delivers.
 */
export class CollaboratorMentionAdmission {
  constructor(private readonly dependencies: Readonly<{
    policy: CollaboratorCandidatePolicy;
    entries: CollaboratorEntryBuilder;
  }>) {}

  get policy(): CollaboratorCandidatePolicy { return this.dependencies.policy; }

  /**
   * The admission sequence every root runs inside its operation gate: plan (all or nothing),
   * let the root commit new entries in one tree write, then compose the note. Nothing posts here.
   */
  async admit(port: CollaboratorRootPort, input: Readonly<{
    focusedAgentRunId: string;
    content: string;
    mentions: readonly CollaboratorMention[];
    commitEntries(entries: readonly CollaboratorEntry[]): Promise<void>;
  }>): Promise<CollaboratorMentionAdmissionResult> {
    if (input.mentions.length === 0) {
      return Object.freeze({ admitted: true, content: input.content, collaborators: Object.freeze([]) });
    }
    let plan: CollaboratorAdmissionPlan;
    try {
      plan = await this.plan(port, { focusedAgentRunId: input.focusedAgentRunId, mentions: input.mentions, now: new Date().toISOString() });
    } catch (error) {
      if (error instanceof CollaboratorMentionError) return Object.freeze({ admitted: false, code: error.code, message: error.message });
      throw error;
    }
    if (plan.newEntries.length) await input.commitEntries(plan.newEntries);
    return Object.freeze({
      admitted: true,
      content: composeCollaboratorMentionNote(input.content, plan.resolved),
      collaborators: plan.resolved,
    });
  }

  async plan(port: CollaboratorRootPort, input: Readonly<{
    focusedAgentRunId: string;
    mentions: readonly CollaboratorMention[];
    now: string;
  }>): Promise<CollaboratorAdmissionPlan> {
    const admissible = [];
    for (const mention of input.mentions) {
      admissible.push(await this.dependencies.policy.requireAdmissible(port, mention));
    }
    const addressesInUse = new Set(port.addressesInUse());
    const newEntries: CollaboratorEntry[] = [];
    const resolved: MentionedCollaborator[] = [];
    for (const definition of admissible) {
      const reused = [...port.collaborators(), ...newEntries].find((entry) => entry.kind === definition.kind
        && (entry.kind === "agent" ? entry.agentDefinitionId : entry.teamDefinitionId) === definition.definition.id);
      let entry = reused;
      if (!entry) {
        const address = allocateCollaboratorAddress(definition.definition.name, addressesInUse);
        addressesInUse.add(address);
        entry = await this.dependencies.entries.build(definition, {
          address,
          rootLaunchConfiguration: port.rootLaunchConfiguration(),
          addedAt: input.now,
          addedViaAgentRunId: input.focusedAgentRunId,
        });
        newEntries.push(entry);
      }
      resolved.push(Object.freeze({ name: definition.definition.name, kind: definition.kind, address: entry.address }));
    }
    return Object.freeze({ newEntries: Object.freeze(newEntries), resolved: Object.freeze(resolved) });
  }
}
