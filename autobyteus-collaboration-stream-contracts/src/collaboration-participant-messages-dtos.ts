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
 * An agent of a delegated run that left the root's tree when its Task closed (autobyteus-469 D-5): the other agent of
 * one of the participant's messages, with the address it had in the tree, so the Team tab names it as before.
 */
export const collaborationPastParticipantDtoSchema = z.object({
  agentRunId: nonEmptyStringSchema,
  address: nonEmptyStringSchema,
}).strict();

/**
 * `collaborationParticipantMessages(rootKind, rootRunId, agentRunId)` (autobyteus-358): the messages one participant
 * of one root sent or received, as the root's view would show them: the other agent is an agent of the root, or an
 * agent of a delegated run that left its tree, listed in `pastParticipants`.
 */
export const collaborationParticipantMessagesDtoSchema = z.object({
  messages: z.array(collaborationParticipantMessageDtoSchema),
  pastParticipants: z.array(collaborationPastParticipantDtoSchema),
}).strict();

export type CollaborationRootKind = z.infer<typeof collaborationRootKindSchema>;
export type CollaborationParticipantMessageDto = Readonly<z.infer<typeof collaborationParticipantMessageDtoSchema>>;
export type CollaborationPastParticipantDto = Readonly<z.infer<typeof collaborationPastParticipantDtoSchema>>;
export type CollaborationParticipantMessagesDto = Readonly<z.infer<typeof collaborationParticipantMessagesDtoSchema>>;
