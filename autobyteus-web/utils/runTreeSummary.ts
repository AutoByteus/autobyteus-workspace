import type { Conversation } from '~/types/conversation';
import { parseCollaboratorMentionNote } from '@autobyteus/agent-presentation-contracts';
import { skillRequestInstruction } from '~/utils/skills/skillRequestInstruction';

/**
 * The run summary reads from the user's own words: a skill-request instruction prefix and the
 * server's `[Mentioned agents]` note (or the earlier `[Mentioned collaborators]` form) are dropped. A mention-only message reads as its
 * `@Name` mentions; only a tags-only message falls back to the instruction itself.
 */
export const resolveFirstUserMessageSummary = (
  conversation: Pick<Conversation, 'messages'> | null | undefined,
): string | null => {
  const firstUserMessage = conversation?.messages?.find(
    message => message.type === 'user' && message.text?.trim().length > 0,
  );
  if (firstUserMessage?.type !== 'user') {
    return null;
  }
  const note = parseCollaboratorMentionNote(firstUserMessage.text.trim());
  const content = note
    ? note.text.trim() || note.collaborators.map((entry) => `@${entry.name}`).join(' ')
    : firstUserMessage.text.trim();
  const userText = skillRequestInstruction.parse(content)?.text.trim();
  return userText || content;
};

/**
 * A stored run title, cleaned the same way as the live summary: the server keeps the content the
 * window sent, compacted to one line, so a skill-tagged title starts with the single-line skill
 * instruction. The mention note never reaches a stored title (the server adds it later). A
 * tags-only title reads as the instruction itself. Empty means there is no stored title.
 */
export const resolveStoredTitleSummary = (summary: string | null | undefined): string | null => {
  const title = summary?.trim();
  if (!title) {
    return null;
  }
  return skillRequestInstruction.parseSingleLine(title)?.text.trim() || title;
};
