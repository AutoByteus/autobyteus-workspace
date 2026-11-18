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
 * An agent of a delegated run that left the root's tree when its Task closed (autobyteus-469 D-5): the other agent of
 * one of the participant's messages, with the address it had in the tree, so the Team tab names it as before.
 */
export declare const collaborationPastParticipantDtoSchema: z.ZodObject<{
    agentRunId: z.ZodString;
    address: z.ZodString;
}, z.core.$strict>;
/**
 * `collaborationParticipantMessages(rootKind, rootRunId, agentRunId)` (autobyteus-358): the messages one participant
 * of one root sent or received, as the root's view would show them: the other agent is an agent of the root, or an
 * agent of a delegated run that left its tree, listed in `pastParticipants`.
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
    pastParticipants: z.ZodArray<z.ZodObject<{
        agentRunId: z.ZodString;
        address: z.ZodString;
    }, z.core.$strict>>;
}, z.core.$strict>;
export type CollaborationRootKind = z.infer<typeof collaborationRootKindSchema>;
export type CollaborationParticipantMessageDto = Readonly<z.infer<typeof collaborationParticipantMessageDtoSchema>>;
export type CollaborationPastParticipantDto = Readonly<z.infer<typeof collaborationPastParticipantDtoSchema>>;
export type CollaborationParticipantMessagesDto = Readonly<z.infer<typeof collaborationParticipantMessagesDtoSchema>>;
//# sourceMappingURL=collaboration-participant-messages-dtos.d.ts.map