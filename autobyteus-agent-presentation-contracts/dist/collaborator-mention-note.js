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
const NOTE_HEADING = "[Mentioned agents]";
const KIND_LABELS = Object.freeze({
    agent: "agent",
    agent_team: "agent team",
});
/** The guidance each line carries (wording §8): what the agent may do with the mentioned agent or team. */
const GUIDANCE = Object.freeze({
    self: "that is you.",
    own_team: "talk with it using send_message_to; don't delegate to it.",
    run_agent: "talk with it using send_message_to; you can't delegate to it.",
    in_run: "talk with it using send_message_to, or delegate a task to it with delegate_task; that creates a new task agent and returns its run ID to follow up with.",
    not_in_run: "delegate the task to it with delegate_task; it returns a run ID to follow up with.",
});
/** Guidance sentences composed by builds before the current wording (no released data has them); still read, never composed. */
const EARLIER_GUIDANCE = Object.freeze({
    in_run: Object.freeze([
        "talk with it using send_message_to, or delegate a task to it with delegate_task to have a new task agent work on it.",
        "talk with it using send_message_to, or delegate a task to it with delegate_task; that creates a new task agent and returns its ID to follow up with.",
    ]),
    not_in_run: Object.freeze([
        "delegate a task to it with delegate_task.",
        "delegate the task to it with delegate_task; it returns an ID to follow up with.",
    ]),
});
const OWN_TEAM_MARK = ", in your team";
const PRESENCE_MARKS = Object.freeze({
    self: "", own_team: OWN_TEAM_MARK, run_agent: "", in_run: "", not_in_run: "",
});
const PRESENCE_ORDER = Object.freeze(Object.keys(GUIDANCE));
const ENTRY_PATTERN = /^- (.+) \((agent|agent team)\) at (\/\S+?)(, in your team)?: (.+)$/;
// --- Notes saved by earlier releases: parse only, never composed. ---
const SAVED_NOTE_HEADING = "[Mentioned collaborators]";
const SAVED_NOTE_GUIDANCE = "Delegate the work with delegate_task to its address; it returns a run ID to follow up with.";
/**
 * The delegate sentence composed until the release that made the note tool-neutral; still
 * recognized, in every combination with the in-run and run-agent sentences, so saved history
 * reads unchanged. Never composed.
 */
const PREVIOUS_RELEASE_NOTE_GUIDANCE = "Delegate the work with delegate_task to its address; it returns a run ID to follow up with. If it also returns a task_id, call create_or_update_task with that task_id and status DONE when the work is finished; this stops it and removes it from the run.";
const SAVED_IN_RUN_GUIDANCE = "One already in this run can instead be messaged directly with send_message_to at its address, or use delegate_task for a separate copy.";
const SAVED_PRESENCE_SUFFIXES = Object.freeze({
    in_run: ", already in this run",
    run_agent: ", the run's own agent",
});
/**
 * Guidance lines of notes saved by earlier releases (collaborator messaging, before and after
 * REQ-009); still recognized so saved history reads unchanged. Never composed.
 */
const SAVED_NOTE_GUIDANCES = Object.freeze([
    "Message a collaborator with send_message_to and its address; it starts on its first message. delegate_task to its address spawns a new copy instead, which you follow up by run ID.",
    "Message a collaborator with send_message_to and its address; it starts on its first message.",
]);
const SAVED_KIND_LABELS = Object.freeze({ Agent: "agent", "Agent Team": "agent_team" });
const SAVED_ENTRY_PATTERN = /^- (.+) \((Agent|Agent Team)\) at (\/\S+?)(, already in this run|, the run's own agent)?$/;
const savedPresenceOfSuffix = (suffix) => suffix === SAVED_PRESENCE_SUFFIXES.in_run ? "in_run" : suffix === SAVED_PRESENCE_SUFFIXES.run_agent ? "run_agent" : "not_in_run";
/** The guidance line a saved note's entries composed to (the saved wording). */
const savedGuidanceFor = (collaborators, delegateSentence) => [
    ...(collaborators.some((collaborator) => collaborator.presence !== "run_agent") ? [delegateSentence] : []),
    ...(collaborators.some((collaborator) => collaborator.presence === "in_run") ? [SAVED_IN_RUN_GUIDANCE] : []),
    ...collaborators.filter((collaborator) => collaborator.presence === "run_agent").map((collaborator) => `Use send_message_to with recipient_address ${collaborator.address} to message ${collaborator.name}; delegate_task cannot target it.`),
].join(" ");
const singleLine = (value, label) => {
    const normalized = value.replace(/\s+/g, " ").trim();
    if (!normalized)
        throw new Error(`${label} is required.`);
    return normalized;
};
const entryLine = (collaborator) => {
    const address = agentAddressSchema.parse(collaborator.address);
    if (address === "/")
        throw new Error("A mentioned agent needs a non-root address.");
    return `- ${singleLine(collaborator.name, "Agent name")} (${KIND_LABELS[collaborator.kind]}) at ${address}${PRESENCE_MARKS[collaborator.presence]}: ${GUIDANCE[collaborator.presence]}`;
};
/**
 * The one owner of the mention-note wording (server compose, web parse). One line per mentioned
 * agent or team, chosen for the agent the user is talking to; each line carries its own guidance:
 *
 *   compose("Please ask @Product Team", [{ name: "Product Team", kind: "agent_team", address: "/product_team", presence: "not_in_run" }])
 *   === "Please ask @Product Team\n\n[Mentioned agents]\n- Product Team (agent team) at /product_team: delegate the task to it with delegate_task; it returns a run ID to follow up with."
 */
export const composeCollaboratorMentionNote = (text, collaborators) => {
    if (collaborators.length === 0)
        return text;
    const note = [NOTE_HEADING, ...collaborators.map(entryLine)].join("\n");
    return text.trim() ? `${text}\n\n${note}` : note;
};
const noteStartOf = (content, heading) => {
    const headingAt = content.startsWith(`${heading}\n`) ? 0 : content.lastIndexOf(`\n\n${heading}\n`);
    return headingAt < 0 ? null : headingAt;
};
const parseCurrentNote = (content) => {
    const headingAt = noteStartOf(content, NOTE_HEADING);
    if (headingAt === null)
        return null;
    const noteStart = headingAt === 0 ? 0 : headingAt + 2;
    const entries = content.slice(noteStart).split("\n").slice(1);
    if (entries.length === 0)
        return null;
    const collaborators = [];
    for (const line of entries) {
        const match = ENTRY_PATTERN.exec(line);
        if (!match)
            return null;
        const presence = PRESENCE_ORDER.find((candidate) => (GUIDANCE[candidate] === match[5] || (EARLIER_GUIDANCE[candidate] ?? []).includes(match[5])) && PRESENCE_MARKS[candidate] === (match[4] ?? ""));
        if (!presence)
            return null;
        collaborators.push(Object.freeze({
            name: match[1],
            kind: match[2] === "agent" ? "agent" : "agent_team",
            address: match[3],
            presence,
        }));
    }
    return Object.freeze({ text: noteStart === 0 ? "" : content.slice(0, headingAt), collaborators: Object.freeze(collaborators) });
};
const parseSavedNote = (content) => {
    const headingAt = noteStartOf(content, SAVED_NOTE_HEADING);
    if (headingAt === null)
        return null;
    const noteStart = headingAt === 0 ? 0 : headingAt + 2;
    const lines = content.slice(noteStart).split("\n");
    const entries = lines.slice(1, -1);
    if (entries.length === 0)
        return null;
    const collaborators = [];
    for (const line of entries) {
        const match = SAVED_ENTRY_PATTERN.exec(line);
        if (!match)
            return null;
        collaborators.push(Object.freeze({
            name: match[1],
            kind: SAVED_KIND_LABELS[match[2]],
            address: match[3],
            presence: savedPresenceOfSuffix(match[4]),
        }));
    }
    const guidance = lines[lines.length - 1];
    if (guidance !== savedGuidanceFor(collaborators, SAVED_NOTE_GUIDANCE)
        && guidance !== savedGuidanceFor(collaborators, PREVIOUS_RELEASE_NOTE_GUIDANCE)
        && !SAVED_NOTE_GUIDANCES.includes(guidance))
        return null;
    return Object.freeze({ text: noteStart === 0 ? "" : content.slice(0, headingAt), collaborators: Object.freeze(collaborators) });
};
/**
 * Recognizes only a note at the very end of the content, in exactly the composed form (every line
 * with the guidance its presence composes to), or in any form saved by an earlier release.
 */
export const parseCollaboratorMentionNote = (content) => parseCurrentNote(content) ?? parseSavedNote(content);
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