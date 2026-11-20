import { z } from "zod";
import { agentAddressSchema, nonEmptyStringSchema } from "@autobyteus/agent-presentation-contracts";
import { agentOrgCommunicationMessageDtoSchema } from "./agent-org-execution-dtos.js";
import { runTreeChangedEventDtoSchema } from "./run-tree-dtos.js";
const timestamp = nonEmptyStringSchema;
/**
 * The collaboration package of one standalone Agent run (root kind `agent`): its own agent. The runs it delegated are
 * its tree's rows (`RUN_TREE_SNAPSHOT`, autobyteus-461 SR-084).
 */
export const agentRunCollaborationTreeDtoSchema = z.object({
    subjectKind: z.literal("agent"),
    createdAt: timestamp,
    agent: z.object({
        address: agentAddressSchema,
        agentRunId: nonEmptyStringSchema,
        agentDefinitionId: nonEmptyStringSchema,
    }).strict(),
}).strict();
/** The run's view; its agent reports on its own Agent stream, its delegated runs on `/ws/run-status` (SR-083). */
export const agentRunCollaborationViewDtoSchema = z.object({
    base_change_sequence: z.number().int().nonnegative(),
    /** The live sequence `base_change_sequence` counts in (one per root event publisher); null for a stored view. */
    live_sequence_id: nonEmptyStringSchema.nullable(),
    /** The sequence of the root's latest message through `base_change_sequence` (0 when none); null for a stored view. */
    last_message_change_sequence: z.number().int().nonnegative().nullable(),
    is_active: z.boolean(),
    execution_tree: agentRunCollaborationTreeDtoSchema,
}).strict();
/**
 * One agent of a live message as its commit knew it (autobyteus-565): its run ID, its address in its own run when known,
 * and, for an agent on another node, the name the receiving node gives that node.
 */
export const messagePartyDtoSchema = z.object({
    agentRunId: nonEmptyStringSchema,
    address: nonEmptyStringSchema.nullable(),
    nodeName: nonEmptyStringSchema.nullable(),
}).strict();
/**
 * The Agent root view's events: its messages and its tree's changes. Its agent presents on its own Agent stream, and each
 * run it delegated on its own (rule 2; a peer's run through `/ws/peer-run`, SR-086 G-D1). A message comes with its two
 * parties, so the view names a counterpart it does not know yet (another run, another node; autobyteus-565).
 */
export const agentRunCollaborationEventDtoSchema = z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("communication"), message: agentOrgCommunicationMessageDtoSchema,
        parties: z.object({ sender: messagePartyDtoSchema, receiver: messagePartyDtoSchema }).strict() }).strict(),
    runTreeChangedEventDtoSchema,
]);
//# sourceMappingURL=agent-run-collaboration-dtos.js.map