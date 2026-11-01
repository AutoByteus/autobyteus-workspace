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
 * `collaborationParticipantMessages(rootKind, rootRunId, agentRunId)` (autobyteus-358): the messages one participant
 * of one root sent or received, as the root's view would show them (both endpoints are agents of the root).
 */
export const collaborationParticipantMessagesDtoSchema = z.object({
  messages: z.array(collaborationParticipantMessageDtoSchema),
}).strict();

export type CollaborationRootKind = z.infer<typeof collaborationRootKindSchema>;
export type CollaborationParticipantMessageDto = Readonly<z.infer<typeof collaborationParticipantMessageDtoSchema>>;
export type CollaborationParticipantMessagesDto = Readonly<z.infer<typeof collaborationParticipantMessagesDtoSchema>>;
