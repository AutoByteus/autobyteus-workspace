import { z } from "zod";
import { agentAddressSchema, nonEmptyStringSchema } from "./schema-helpers.js";

/**
 * One user mention of a shared definition, sent with a live-run message.
 * The server re-validates every mention; the client never decides eligibility.
 */
export const collaboratorMentionKindSchema = z.enum(["agent", "agent_team"]);
export type CollaboratorMentionKind = z.infer<typeof collaboratorMentionKindSchema>;

export const COLLABORATOR_MENTIONS_MAX = 8;

export const collaboratorMentionDtoSchema = z.object({
  kind: collaboratorMentionKindSchema,
  definition_id: nonEmptyStringSchema,
}).strict();
export type CollaboratorMentionDto = Readonly<z.infer<typeof collaboratorMentionDtoSchema>>;

/** Optional `mentions` field of every live SEND_MESSAGE payload: at most 8, unique by (kind, definition_id). */
export const collaboratorMentionsDtoSchema = z.array(collaboratorMentionDtoSchema)
  .max(COLLABORATOR_MENTIONS_MAX)
  .superRefine((mentions, context) => {
    const seen = new Set<string>();
    for (const mention of mentions) {
      const key = `${mention.kind}\0${mention.definition_id}`;
      if (seen.has(key)) {
        context.addIssue({ code: "custom", message: `Mention '${mention.definition_id}' is repeated.` });
      }
      seen.add(key);
    }
  });

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

const NOTE_HEADING = "[Mentioned collaborators]";
const NOTE_GUIDANCE =
  "Delegate the work with delegate_task to its address; it returns a run ID to follow up with. If it also returns a task_id, call create_or_update_task with that task_id and status DONE when the work is finished; this stops it and removes it from the run.";
/** Added after the guidance only when at least one mentioned agent or team is already in the run. */
const IN_RUN_GUIDANCE =
  "One already in this run can instead be messaged directly with send_message_to at its address, or use delegate_task for a separate copy.";
const PRESENCE_SUFFIXES: Readonly<Record<MentionedCollaboratorPresence, string>> = Object.freeze({
  not_in_run: "",
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
const KIND_LABELS: Readonly<Record<CollaboratorMentionKind, string>> = Object.freeze({
  agent: "Agent",
  agent_team: "Agent Team",
});
const ENTRY_PATTERN = /^- (.+) \((Agent|Agent Team)\) at (\/\S+?)(, already in this run|, the run's own agent)?$/;
const presenceOfSuffix = (suffix: string | undefined): MentionedCollaboratorPresence =>
  suffix === PRESENCE_SUFFIXES.in_run ? "in_run" : suffix === PRESENCE_SUFFIXES.run_agent ? "run_agent" : "not_in_run";

const singleLine = (value: string, label: string): string => {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) throw new Error(`${label} is required.`);
  return normalized;
};

const entryLine = (collaborator: MentionedCollaborator): string => {
  const address = agentAddressSchema.parse(collaborator.address);
  if (address === "/") throw new Error("A mentioned collaborator needs a non-root address.");
  return `- ${singleLine(collaborator.name, "Collaborator name")} (${KIND_LABELS[collaborator.kind]}) at ${address}${PRESENCE_SUFFIXES[collaborator.presence]}`;
};

/** One sentence per mentioned run agent: it is messaged, never delegated to. */
const runAgentGuidance = (collaborator: MentionedCollaborator): string =>
  `Use send_message_to with recipient_address ${collaborator.address} to message ${singleLine(collaborator.name, "Collaborator name")}; delegate_task cannot target it.`;

/**
 * The guidance line for a note's entries, shared by compose and parse: the delegate_task
 * sentence when any entry is not the run agent, the in-run sentence when any entry is in the
 * run, then one send_message_to sentence per run-agent entry. Without run-agent entries it is
 * exactly the guidance of earlier releases.
 */
const guidanceFor = (collaborators: readonly MentionedCollaborator[]): string => [
  ...(collaborators.some((collaborator) => collaborator.presence !== "run_agent") ? [NOTE_GUIDANCE] : []),
  ...(collaborators.some((collaborator) => collaborator.presence === "in_run") ? [IN_RUN_GUIDANCE] : []),
  ...collaborators.filter((collaborator) => collaborator.presence === "run_agent").map(runAgentGuidance),
].join(" ");

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
export const composeCollaboratorMentionNote = (
  text: string,
  collaborators: readonly MentionedCollaborator[],
): string => {
  if (collaborators.length === 0) return text;
  const note = [NOTE_HEADING, ...collaborators.map(entryLine), guidanceFor(collaborators)].join("\n");
  return text.trim() ? `${text}\n\n${note}` : note;
};

/**
 * Recognizes only a note at the very end of the content, in exactly the composed form: its
 * guidance line is the one its entries compose to, or a guidance saved by an earlier release.
 */
export const parseCollaboratorMentionNote = (content: string): ParsedCollaboratorMentionNote | null => {
  const headingAt = content.startsWith(`${NOTE_HEADING}\n`)
    ? 0
    : content.lastIndexOf(`\n\n${NOTE_HEADING}\n`);
  if (headingAt < 0) return null;
  const noteStart = headingAt === 0 && content.startsWith(NOTE_HEADING) ? 0 : headingAt + 2;
  const lines = content.slice(noteStart).split("\n");
  const entries = lines.slice(1, -1);
  if (entries.length === 0) return null;
  const collaborators: MentionedCollaborator[] = [];
  for (const line of entries) {
    const match = ENTRY_PATTERN.exec(line);
    if (!match) return null;
    collaborators.push(Object.freeze({
      name: match[1]!,
      kind: match[2] === "Agent" ? "agent" : "agent_team",
      address: match[3]!,
      presence: presenceOfSuffix(match[4]),
    }));
  }
  const guidance = lines[lines.length - 1]!;
  if (guidance !== guidanceFor(collaborators) && !SAVED_NOTE_GUIDANCES.includes(guidance)) return null;
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
