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
export type MentionedCollaborator = Readonly<{
    name: string;
    kind: CollaboratorMentionKind;
    address: string;
}>;
export type ParsedCollaboratorMentionNote = Readonly<{
    /** The user's own text before the note; empty for a mention-only message. */
    text: string;
    collaborators: readonly MentionedCollaborator[];
}>;
/**
 * The one owner of the mention-note wording (server compose, web parse):
 *
 *   compose("Please ask @Product Team", [{ name: "Product Team", kind: "agent_team", address: "/product_team" }])
 *   === "Please ask @Product Team\n\n[Mentioned collaborators]\n- Product Team (Agent Team) at /product_team\nUse delegate_task …"
 */
export declare const composeCollaboratorMentionNote: (text: string, collaborators: readonly MentionedCollaborator[]) => string;
/** Recognizes only a note at the very end of the content, in exactly the composed form. */
export declare const parseCollaboratorMentionNote: (content: string) => ParsedCollaboratorMentionNote | null;
export declare const collaboratorMentionNote: Readonly<{
    compose: (text: string, collaborators: readonly MentionedCollaborator[]) => string;
    parse: (content: string) => ParsedCollaboratorMentionNote | null;
}>;
//# sourceMappingURL=collaborator-mention-note.d.ts.map