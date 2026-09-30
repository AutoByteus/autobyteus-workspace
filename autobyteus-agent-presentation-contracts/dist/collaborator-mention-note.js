import { z } from "zod";
import { agentAddressSchema, nonEmptyStringSchema } from "./schema-helpers.js";
/**
 * One user mention of a shared definition, sent with a live-run message.
 * The server re-validates every mention; the client never decides eligibility.
 */
export const collaboratorMentionKindSchema = z.enum(["agent", "agent_team"]);
export const COLLABORATOR_MENTIONS_MAX = 8;
export const collaboratorMentionDtoSchema = z.object({
    kind: collaboratorMentionKindSchema,
    definition_id: nonEmptyStringSchema,
}).strict();
/** Optional `mentions` field of every live SEND_MESSAGE payload: at most 8, unique by (kind, definition_id). */
export const collaboratorMentionsDtoSchema = z.array(collaboratorMentionDtoSchema)
    .max(COLLABORATOR_MENTIONS_MAX)
    .superRefine((mentions, context) => {
    const seen = new Set();
    for (const mention of mentions) {
        const key = `${mention.kind}\0${mention.definition_id}`;
        if (seen.has(key)) {
            context.addIssue({ code: "custom", message: `Mention '${mention.definition_id}' is repeated.` });
        }
        seen.add(key);
    }
});
const NOTE_HEADING = "[Mentioned collaborators]";
const NOTE_GUIDANCE = "Use delegate_task with the address to bring one into this run; afterwards message the started instance with send_message_to and its run ID.";
const KIND_LABELS = Object.freeze({
    agent: "Agent",
    agent_team: "Agent Team",
});
const ENTRY_PATTERN = /^- (.+) \((Agent|Agent Team)\) at (\/\S+)$/;
const singleLine = (value, label) => {
    const normalized = value.replace(/\s+/g, " ").trim();
    if (!normalized)
        throw new Error(`${label} is required.`);
    return normalized;
};
const entryLine = (collaborator) => {
    const address = agentAddressSchema.parse(collaborator.address);
    if (address === "/")
        throw new Error("A mentioned collaborator needs a non-root address.");
    return `- ${singleLine(collaborator.name, "Collaborator name")} (${KIND_LABELS[collaborator.kind]}) at ${address}`;
};
/**
 * The one owner of the mention-note wording (server compose, web parse):
 *
 *   compose("Please ask @Product Team", [{ name: "Product Team", kind: "agent_team", address: "/product_team" }])
 *   === "Please ask @Product Team\n\n[Mentioned collaborators]\n- Product Team (Agent Team) at /product_team\nUse delegate_task …"
 */
export const composeCollaboratorMentionNote = (text, collaborators) => {
    if (collaborators.length === 0)
        return text;
    const note = [NOTE_HEADING, ...collaborators.map(entryLine), NOTE_GUIDANCE].join("\n");
    return text.trim() ? `${text}\n\n${note}` : note;
};
/** Recognizes only a note at the very end of the content, in exactly the composed form. */
export const parseCollaboratorMentionNote = (content) => {
    if (!content.endsWith(`\n${NOTE_GUIDANCE}`))
        return null;
    const headingAt = content.startsWith(`${NOTE_HEADING}\n`)
        ? 0
        : content.lastIndexOf(`\n\n${NOTE_HEADING}\n`);
    if (headingAt < 0)
        return null;
    const noteStart = headingAt === 0 && content.startsWith(NOTE_HEADING) ? 0 : headingAt + 2;
    const lines = content.slice(noteStart).split("\n");
    const entries = lines.slice(1, -1);
    if (entries.length === 0)
        return null;
    const collaborators = [];
    for (const line of entries) {
        const match = ENTRY_PATTERN.exec(line);
        if (!match)
            return null;
        collaborators.push(Object.freeze({
            name: match[1],
            kind: match[2] === "Agent" ? "agent" : "agent_team",
            address: match[3],
        }));
    }
    return Object.freeze({
        text: noteStart === 0 ? "" : content.slice(0, headingAt),
        collaborators: Object.freeze(collaborators),
    });
};
export const collaboratorMentionNote = Object.freeze({
    compose: composeCollaboratorMentionNote,
    parse: parseCollaboratorMentionNote,
});
//# sourceMappingURL=collaborator-mention-note.js.map