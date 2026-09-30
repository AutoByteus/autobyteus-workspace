import type { MentionedCollaborator } from "@autobyteus/agent-presentation-contracts";
import type { CollaboratorEntry } from "../../run-history/domain/run-execution-tree-shared-records.js";
import { allocateCollaboratorAddress } from "./collaborator-address-allocator.js";
import type {
  CollaboratorCandidatePolicy,
  CollaboratorMention,
} from "./collaborator-candidate-policy.js";
import type { CollaboratorEntryBuilder } from "./collaborator-entry-builder.js";
import type { CollaboratorRootPort } from "./collaborator-root-port.js";

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
