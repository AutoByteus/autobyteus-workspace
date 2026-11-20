import { z } from "zod";
import { nonEmptyStringSchema } from "@autobyteus/agent-presentation-contracts";

/** The root kinds whose participants exchange messages: a hub (`agent`), a Team run and an Org run. */
export const collaborationRootKindSchema = z.enum(["agent", "agent_team", "agent_org"]);

/**
 * One stored message between two agents of a root, as every root kind stores it. A Team message may have empty
 * content, so content is any string.
 */
export const collaborationParticipantMessageDtoSchema = z.object({
  messageId: nonEmptyStringSchema,
  senderAgentRunId: nonEmptyStringSchema,
  receiverAgentRunId: nonEmptyStringSchema,
  content: z.string(),
  messageType: nonEmptyStringSchema,
  referenceFiles: z.array(nonEmptyStringSchema),
  createdAt: nonEmptyStringSchema,
}).strict();

/**
 * The other agent of messages on a page, when the root's tree does not name it (autobyteus-565):
 * - `past`: an agent of a delegated run that left the tree when its Task closed, with the address it had (autobyteus-469 D-5);
 * - `run`: an agent of another local run (or one that can no longer be named: `address` null, shown by its run ID);
 * - `remote`: an agent on another node, with its address when known and this node's name for that node (`nodeName`).
 */
export const collaborationCounterpartDtoSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("past"), agentRunId: nonEmptyStringSchema, address: nonEmptyStringSchema }).strict(),
  z.object({ kind: z.literal("run"), agentRunId: nonEmptyStringSchema, address: nonEmptyStringSchema.nullable() }).strict(),
  z.object({ kind: z.literal("remote"), agentRunId: nonEmptyStringSchema, address: nonEmptyStringSchema.nullable(),
    nodeName: nonEmptyStringSchema.nullable() }).strict(),
]);

/** Where the next page starts: the last message of the page before it, in the one order (`createdAt` newest first, then ID). */
export const collaborationParticipantMessagesCursorSchema = z.object({
  createdAt: nonEmptyStringSchema,
  messageId: nonEmptyStringSchema,
}).strict();

/** The page size of a participant's messages (autobyteus-565 DEC-004: the conversation's earlier pages' size). */
export const COLLABORATION_PARTICIPANT_MESSAGES_PAGE_SIZE = 50;

/**
 * `collaborationParticipantMessages(rootKind, rootRunId, agentRunId, before?)` (autobyteus-358, autobyteus-565): one page of
 * the messages one participant of one root sent or received, as the root's view shows them, newest first (`createdAt`
 * descending, then `messageId`), at most 50, after `before` when given. `counterparts` names each other agent of the page
 * that the root's tree does not; `hasMore` says older messages follow.
 */
export const collaborationParticipantMessagesDtoSchema = z.object({
  messages: z.array(collaborationParticipantMessageDtoSchema),
  counterparts: z.array(collaborationCounterpartDtoSchema),
  hasMore: z.boolean(),
}).strict();

export type CollaborationRootKind = z.infer<typeof collaborationRootKindSchema>;
export type CollaborationParticipantMessageDto = Readonly<z.infer<typeof collaborationParticipantMessageDtoSchema>>;
export type CollaborationCounterpartDto = Readonly<z.infer<typeof collaborationCounterpartDtoSchema>>;
export type CollaborationParticipantMessagesCursor = Readonly<z.infer<typeof collaborationParticipantMessagesCursorSchema>>;
export type CollaborationParticipantMessagesDto = Readonly<z.infer<typeof collaborationParticipantMessagesDtoSchema>>;
