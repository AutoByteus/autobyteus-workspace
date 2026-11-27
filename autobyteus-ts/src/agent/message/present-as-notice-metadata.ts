/**
 * An input the person sees as a platform notice, not as a message from the person (autobyteus-646 R-10).
 *
 * The message stays an ordinary input: the model reads it, and a pending platform notice (a preface) can combine into
 * it as into any input. Memory records its input part as a system notice trace from `senderId`, never as a user trace,
 * so a conversation replays it as a labelled notice row. The tag is generic: it carries no knowledge of what the
 * notice is about.
 */
export const PRESENT_AS_NOTICE_METADATA_KEY = 'present_as_notice';

export type PresentAsNotice = Readonly<{ senderId: string }>;

/** Metadata entries that tag a message to be presented as a notice from `senderId`. */
export const presentAsNoticeMetadata = (notice: PresentAsNotice): Record<string, unknown> => ({
  [PRESENT_AS_NOTICE_METADATA_KEY]: { sender_id: notice.senderId },
});

/** The notice presentation a message asks for, or null when it asks for none (or the tag is malformed). */
export const readPresentAsNotice = (metadata: Readonly<Record<string, unknown>> | null | undefined): PresentAsNotice | null => {
  const value = metadata?.[PRESENT_AS_NOTICE_METADATA_KEY];
  if (!value || typeof value !== 'object') return null;
  const senderId = (value as Record<string, unknown>).sender_id;
  return typeof senderId === 'string' && senderId.trim() ? Object.freeze({ senderId: senderId.trim() }) : null;
};
