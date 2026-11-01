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
 * `collaborationParticipantMessages(rootKind, rootRunId, agentRunId)` (autobyteus-358): the messages one participant
 * of one root sent or received, as the root's view would show them (both endpoints are agents of the root).
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
}, z.core.$strict>;
export type CollaborationRootKind = z.infer<typeof collaborationRootKindSchema>;
export type CollaborationParticipantMessageDto = Readonly<z.infer<typeof collaborationParticipantMessageDtoSchema>>;
export type CollaborationParticipantMessagesDto = Readonly<z.infer<typeof collaborationParticipantMessagesDtoSchema>>;
//# sourceMappingURL=collaboration-participant-messages-dtos.d.ts.map