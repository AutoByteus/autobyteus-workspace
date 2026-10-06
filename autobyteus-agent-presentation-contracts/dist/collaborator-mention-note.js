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
const NOTE_GUIDANCE = "Delegate the work with delegate_task to its address; it returns a run ID to follow up with. If it also returns a task_id, call create_or_update_task with that task_id and status DONE when the work is finished; this stops it and removes it from the run.";
/** Added after the guidance only when at least one mentioned agent or team is already in the run. */
const IN_RUN_GUIDANCE = "One already in this run can instead be messaged directly with send_message_to at its address, or use delegate_task for a separate copy.";
const IN_RUN_NOTE_GUIDANCE = `${NOTE_GUIDANCE} ${IN_RUN_GUIDANCE}`;
const IN_RUN_SUFFIX = ", already in this run";
/**
 * Guidance lines of notes saved by earlier releases (collaborator messaging, before and after
 * REQ-009); still recognized so saved history reads unchanged. Never composed.
 */
const SAVED_NOTE_GUIDANCES = Object.freeze([
    "Message a collaborator with send_message_to and its address; it starts on its first message. delegate_task to its address spawns a new copy instead, which you follow up by run ID.",
    "Message a collaborator with send_message_to and its address; it starts on its first message.",
]);
const KIND_LABELS = Object.freeze({
    agent: "Agent",
    agent_team: "Agent Team",
});
const ENTRY_PATTERN = /^- (.+) \((Agent|Agent Team)\) at (\/\S+?)(, already in this run)?$/;
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
    return `- ${singleLine(collaborator.name, "Collaborator name")} (${KIND_LABELS[collaborator.kind]}) at ${address}${collaborator.inRun ? IN_RUN_SUFFIX : ""}`;
};
/**
 * The one owner of the mention-note wording (server compose, web parse). The note tells the
 * focused agent to delegate the work to each mentioned address. An entry already in the run is
 * marked so, and the guidance then also offers messaging that instance directly:
 *
 *   compose("Please ask @Product Team", [{ name: "Product Team", kind: "agent_team", address: "/product_team", inRun: false }])
 *   === "Please ask @Product Team\n\n[Mentioned collaborators]\n- Product Team (Agent Team) at /product_team\nDelegate the work with delegate_task …"
 */
export const composeCollaboratorMentionNote = (text, collaborators) => {
    if (collaborators.length === 0)
        return text;
    const guidance = collaborators.some((collaborator) => collaborator.inRun) ? IN_RUN_NOTE_GUIDANCE : NOTE_GUIDANCE;
    const note = [NOTE_HEADING, ...collaborators.map(entryLine), guidance].join("\n");
    return text.trim() ? `${text}\n\n${note}` : note;
};
/** Recognizes only a note at the very end of the content, in exactly the composed form. */
export const parseCollaboratorMentionNote = (content) => {
    if (![NOTE_GUIDANCE, IN_RUN_NOTE_GUIDANCE, ...SAVED_NOTE_GUIDANCES].some((guidance) => content.endsWith(`\n${guidance}`)))
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
            inRun: match[4] !== undefined,
        }));
    }
    return Object.freeze({
        text: noteStart === 0 ? "" : content.slice(0, headingAt),
        collaborators: Object.freeze(collaborators),
    });
};
/**
 * The code every transport uses when a mentioned definition cannot be resolved on send (it is
 * not eligible in the run): the message is not posted. Transports carry its name with it.
 */
export const COLLABORATOR_ADD_FAILED = "COLLABORATOR_ADD_FAILED";
export const collaboratorMentionNote = Object.freeze({
    compose: composeCollaboratorMentionNote,
    parse: parseCollaboratorMentionNote,
});
//# sourceMappingURL=collaborator-mention-note.js.map