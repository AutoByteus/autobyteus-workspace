import { z } from "zod";
/** The root kinds whose participants exchange messages: a hub (`agent`), a Team run and an Org run. */
export declare const collaborationRootKindSchema: z.ZodEnum<{
    agent: "agent";
    agent_team: "agent_team";
    agent_org: "agent_org";
}>;
/**
 * One stored message between two agents of a root, as every root kind stores it. A Team message may have empty
 * content, so content is any string.
 */
export declare const collaborationParticipantMessageDtoSchema: z.ZodObject<{
    messageId: z.ZodString;
    senderAgentRunId: z.ZodString;
    receiverAgentRunId: z.ZodString;
    content: z.ZodString;
    messageType: z.ZodString;
    referenceFiles: z.ZodArray<z.ZodString>;
    createdAt: z.ZodString;
}, z.core.$strict>;
/**
 * The other agent of messages on a page, when the root's tree does not name it (autobyteus-565):
 * - `past`: an agent of a delegated run that left the tree when its Task closed, with the address it had (autobyteus-469 D-5);
 * - `run`: an agent of another local run (or one that can no longer be named: `address` null, shown by its run ID);
 * - `remote`: an agent on another node, with its address when known and this node's name for that node (`nodeName`).
 */
export declare const collaborationCounterpartDtoSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    kind: z.ZodLiteral<"past">;
    agentRunId: z.ZodString;
    address: z.ZodString;
}, z.core.$strict>, z.ZodObject<{
    kind: z.ZodLiteral<"run">;
    agentRunId: z.ZodString;
    address: z.ZodNullable<z.ZodString>;
}, z.core.$strict>, z.ZodObject<{
    kind: z.ZodLiteral<"remote">;
    agentRunId: z.ZodString;
    address: z.ZodNullable<z.ZodString>;
    nodeName: z.ZodNullable<z.ZodString>;
}, z.core.$strict>], "kind">;
/** Where the next page starts: the last message of the page before it, in the one order (`createdAt` newest first, then ID). */
export declare const collaborationParticipantMessagesCursorSchema: z.ZodObject<{
    createdAt: z.ZodString;
    messageId: z.ZodString;
}, z.core.$strict>;
/** The page size of a participant's messages (autobyteus-565 DEC-004: the conversation's earlier pages' size). */
export declare const COLLABORATION_PARTICIPANT_MESSAGES_PAGE_SIZE = 50;
/**
 * `collaborationParticipantMessages(rootKind, rootRunId, agentRunId, before?)` (autobyteus-358, autobyteus-565): one page of
 * the messages one participant of one root sent or received, as the root's view shows them, newest first (`createdAt`
 * descending, then `messageId`), at most 50, after `before` when given. `counterparts` names each other agent of the page
 * that the root's tree does not; `hasMore` says older messages follow.
 */
export declare const collaborationParticipantMessagesDtoSchema: z.ZodObject<{
    messages: z.ZodArray<z.ZodObject<{
        messageId: z.ZodString;
        senderAgentRunId: z.ZodString;
        receiverAgentRunId: z.ZodString;
        content: z.ZodString;
        messageType: z.ZodString;
        referenceFiles: z.ZodArray<z.ZodString>;
        createdAt: z.ZodString;
    }, z.core.$strict>>;
    counterparts: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
        kind: z.ZodLiteral<"past">;
        agentRunId: z.ZodString;
        address: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"run">;
        agentRunId: z.ZodString;
        address: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"remote">;
        agentRunId: z.ZodString;
        address: z.ZodNullable<z.ZodString>;
        nodeName: z.ZodNullable<z.ZodString>;
    }, z.core.$strict>], "kind">>;
    hasMore: z.ZodBoolean;
}, z.core.$strict>;
export type CollaborationRootKind = z.infer<typeof collaborationRootKindSchema>;
export type CollaborationParticipantMessageDto = Readonly<z.infer<typeof collaborationParticipantMessageDtoSchema>>;
export type CollaborationCounterpartDto = Readonly<z.infer<typeof collaborationCounterpartDtoSchema>>;
export type CollaborationParticipantMessagesCursor = Readonly<z.infer<typeof collaborationParticipantMessagesCursorSchema>>;
export type CollaborationParticipantMessagesDto = Readonly<z.infer<typeof collaborationParticipantMessagesDtoSchema>>;
//# sourceMappingURL=collaboration-participant-messages-dtos.d.ts.map