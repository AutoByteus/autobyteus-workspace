import { z } from "zod";
/**
 * One user mention of a shared definition, sent with a live-run message.
 * The server re-validates every mention; the client never decides eligibility.
 */
export declare const collaboratorMentionKindSchema: z.ZodEnum<{
    agent: "agent";
    agent_team: "agent_team";
}>;
export type CollaboratorMentionKind = z.infer<typeof collaboratorMentionKindSchema>;
export declare const COLLABORATOR_MENTIONS_MAX = 8;
export declare const collaboratorMentionDtoSchema: z.ZodObject<{
    kind: z.ZodEnum<{
        agent: "agent";
        agent_team: "agent_team";
    }>;
    definition_id: z.ZodString;
}, z.core.$strict>;
export type CollaboratorMentionDto = Readonly<z.infer<typeof collaboratorMentionDtoSchema>>;
/** Optional `mentions` field of every live SEND_MESSAGE payload: at most 8, unique by (kind, definition_id). */
export declare const collaboratorMentionsDtoSchema: z.ZodArray<z.ZodObject<{
    kind: z.ZodEnum<{
        agent: "agent";
        agent_team: "agent_team";
    }>;
    definition_id: z.ZodString;
}, z.core.$strict>>;
/**
 * Where a mentioned definition is relative to the run: `not_in_run` (delegate to its catalog
 * address), `in_run` (a configured member or a collaborator, also messageable directly), or
 * `run_agent` (the standalone Agent run's own agent, reached only with `send_message_to`).
 */
export type MentionedCollaboratorPresence = "not_in_run" | "in_run" | "run_agent";
export type MentionedCollaborator = Readonly<{
    name: string;
    kind: CollaboratorMentionKind;
    address: string;
    presence: MentionedCollaboratorPresence;
}>;
export type ParsedCollaboratorMentionNote = Readonly<{
    /** The user's own text before the note; empty for a mention-only message. */
    text: string;
    collaborators: readonly MentionedCollaborator[];
}>;
/**
 * The one owner of the mention-note wording (server compose, web parse). The note tells the
 * focused agent to delegate the work to each mentioned address. An entry already in the run is
 * marked so, and the guidance then also offers messaging that instance directly. The run's own
 * agent (a standalone Agent run's host) is marked so and gets an explicit send_message_to
 * sentence instead, with no delegate_task alternative:
 *
 *   compose("Please ask @Product Team", [{ name: "Product Team", kind: "agent_team", address: "/product_team", presence: "not_in_run" }])
 *   === "Please ask @Product Team\n\n[Mentioned collaborators]\n- Product Team (Agent Team) at /product_team\nDelegate the work with delegate_task …"
 */
export declare const composeCollaboratorMentionNote: (text: string, collaborators: readonly MentionedCollaborator[]) => string;
/**
 * Recognizes only a note at the very end of the content, in exactly the composed form: its
 * guidance line is the one its entries compose to, or a guidance saved by an earlier release.
 */
export declare const parseCollaboratorMentionNote: (content: string) => ParsedCollaboratorMentionNote | null;
/**
 * The code every transport uses when a mentioned definition cannot be resolved on send (it is
 * not eligible in the run): the message is not posted. Transports carry its name with it.
 */
export declare const COLLABORATOR_ADD_FAILED = "COLLABORATOR_ADD_FAILED";
export declare const collaboratorMentionNote: Readonly<{
    compose: (text: string, collaborators: readonly MentionedCollaborator[]) => string;
    parse: (content: string) => ParsedCollaboratorMentionNote | null;
}>;
//# sourceMappingURL=collaborator-mention-note.d.ts.map