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
 * Where a mentioned definition is, for the agent the user is talking to (wording §8): `not_in_run`
 * (only in the catalog: delegate a task to it), `in_run` (defined in the same team or organization
 * run, outside the agent's own team: talk with it or delegate), `own_team` (the agent's teammate or
 * own team: talk with it, never delegate), `self` (the agent itself), or `run_agent` (the agent the
 * user started in a standalone run, mentioned to one of its task agents: talk with it, never delegate).
 */
export type MentionedCollaboratorPresence = "not_in_run" | "in_run" | "own_team" | "self" | "run_agent";
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
 * The one owner of the mention-note wording (server compose, web parse). One line per mentioned
 * agent or team, chosen for the agent the user is talking to; each line carries its own guidance:
 *
 *   compose("Please ask @Product Team", [{ name: "Product Team", kind: "agent_team", address: "/product_team", presence: "not_in_run" }])
 *   === "Please ask @Product Team\n\n[Mentioned agents]\n- Product Team (agent team) at /product_team: delegate a task to it with delegate_task."
 */
export declare const composeCollaboratorMentionNote: (text: string, collaborators: readonly MentionedCollaborator[]) => string;
/**
 * Recognizes only a note at the very end of the content, in exactly the composed form (every line
 * with the guidance its presence composes to), or in any form saved by an earlier release.
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