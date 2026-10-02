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

const NOTE_HEADING = "[Mentioned collaborators]";
const NOTE_GUIDANCE =
  "Message a collaborator with send_message_to and its address; it starts on its first message. delegate_task to its address spawns a new copy instead, which you follow up by run ID.";
/** The guidance line of notes written before REQ-009; still recognized so saved history reads unchanged. */
const RELEASED_NOTE_GUIDANCE =
  "Message a collaborator with send_message_to and its address; it starts on its first message.";
const KIND_LABELS: Readonly<Record<CollaboratorMentionKind, string>> = Object.freeze({
  agent: "Agent",
  agent_team: "Agent Team",
});
const ENTRY_PATTERN = /^- (.+) \((Agent|Agent Team)\) at (\/\S+)$/;

const singleLine = (value: string, label: string): string => {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) throw new Error(`${label} is required.`);
  return normalized;
};

const entryLine = (collaborator: MentionedCollaborator): string => {
  const address = agentAddressSchema.parse(collaborator.address);
  if (address === "/") throw new Error("A mentioned collaborator needs a non-root address.");
  return `- ${singleLine(collaborator.name, "Collaborator name")} (${KIND_LABELS[collaborator.kind]}) at ${address}`;
};

/**
 * The one owner of the mention-note wording (server compose, web parse):
 *
 *   compose("Please ask @Product Team", [{ name: "Product Team", kind: "agent_team", address: "/product_team" }])
 *   === "Please ask @Product Team\n\n[Mentioned collaborators]\n- Product Team (Agent Team) at /product_team\nMessage a collaborator with send_message_to …"
 */
export const composeCollaboratorMentionNote = (
  text: string,
  collaborators: readonly MentionedCollaborator[],
): string => {
  if (collaborators.length === 0) return text;
  const note = [NOTE_HEADING, ...collaborators.map(entryLine), NOTE_GUIDANCE].join("\n");
  return text.trim() ? `${text}\n\n${note}` : note;
};

/** Recognizes only a note at the very end of the content, in exactly the composed form. */
export const parseCollaboratorMentionNote = (content: string): ParsedCollaboratorMentionNote | null => {
  if (![NOTE_GUIDANCE, RELEASED_NOTE_GUIDANCE].some((guidance) => content.endsWith(`\n${guidance}`))) return null;
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
    }));
  }
  return Object.freeze({
    text: noteStart === 0 ? "" : content.slice(0, headingAt),
    collaborators: Object.freeze(collaborators),
  });
};

/**
 * The code every transport uses when a mentioned collaborator cannot be added on send: nothing
 * is added and the message is not posted. Transports carry the collaborator's name with it.
 */
export const COLLABORATOR_ADD_FAILED = "COLLABORATOR_ADD_FAILED";

export const collaboratorMentionNote = Object.freeze({
  compose: composeCollaboratorMentionNote,
  parse: parseCollaboratorMentionNote,
});
