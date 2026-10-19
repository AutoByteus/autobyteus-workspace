/**
 * Contract §8: a `user` record that is a teammate's message, recognized by its envelope text
 * (with or without `sender_id`). The envelope is a platform format, not a runtime's.
 */
export type TeammateMessage = Readonly<{ sender: string; text: string; files: readonly string[] }>;

/** `You received a message from the agent with [sender address "<addr>" and ]sender run id "<runId>".` */
const CURRENT_FORM = /^You received a message from the agent with (?:sender address "([^"]*)" and )?sender run id "([^"]*)"\.\nmessage:\n/;
/** `You received a message from sender name: <name>, [sender address: <addr>, ]sender id: <id>` */
const OLDER_FORM = /^You received a message from sender name: ([^\n]*?), (?:sender address: ([^\n]*?), )?sender id: ([^\n]*)\nmessage:\n/;
const REFERENCE_FILES = /\n\nReference files:\n((?:- [^\n]*(?:\n|$))+)$/;

const splitReferenceFiles = (body: string): { text: string; files: string[] } => {
  const match = REFERENCE_FILES.exec(body);
  if (!match) return { text: body, files: [] };
  const files = match[1]!.split("\n").map((line) => line.replace(/^- /, "").trim()).filter(Boolean);
  return { text: body.slice(0, match.index), files };
};

/** The sender is the address when the envelope gives one, else the run id (current) or name (older). */
export const parseTeammateMessage = (content: string): TeammateMessage | null => {
  const current = CURRENT_FORM.exec(content);
  if (current) {
    const sender = current[1]?.trim() || current[2]!.trim();
    return { sender, ...splitReferenceFiles(content.slice(current[0].length)) };
  }
  const older = OLDER_FORM.exec(content);
  if (older) {
    const sender = older[2]?.trim() || older[1]!.trim();
    return { sender, ...splitReferenceFiles(content.slice(older[0].length)) };
  }
  return null;
};
