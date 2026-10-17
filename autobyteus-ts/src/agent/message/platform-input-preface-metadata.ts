/**
 * A platform notice delivered inside an input message (the platform's input preface).
 *
 * The platform may combine a notice with the next external input into one provider message
 * (`notice + "\n\n" + input`), or send a notice on its own. The message then carries this tag so
 * memory records what happened: one system notice trace, plus (when the message also carries an
 * input) the input as the user trace with its original content. The model keeps seeing the
 * combined content. The tag is generic: it carries no knowledge of what the notice is about.
 */
export const PLATFORM_INPUT_PREFACE_METADATA_KEY = 'platform_input_preface';

export type PlatformInputPreface = Readonly<{
  /** The notice text exactly as it appears at the start of the message content. */
  content: string;
  /** Who sent the notice (for example `system.skill_update_notifier`). */
  senderId: string;
  /** The input's own content before the notice was combined in; null when the message is only the notice. */
  originalContent: string | null;
}>;

const nonEmpty = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

/** Metadata entries that tag a message with a platform input preface. */
export const platformInputPrefaceMetadata = (preface: PlatformInputPreface): Record<string, unknown> => ({
  [PLATFORM_INPUT_PREFACE_METADATA_KEY]: {
    content: preface.content,
    sender_id: preface.senderId,
    original_content: preface.originalContent,
  },
});

/** The preface a message carries, or null when it carries none (or the tag is malformed). */
export const readPlatformInputPreface = (
  metadata: Readonly<Record<string, unknown>> | null | undefined,
): PlatformInputPreface | null => {
  const value = metadata?.[PLATFORM_INPUT_PREFACE_METADATA_KEY];
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (!nonEmpty(record.content) || !nonEmpty(record.sender_id)) return null;
  const original = record.original_content;
  if (original !== null && typeof original !== 'string') return null;
  return Object.freeze({ content: record.content, senderId: record.sender_id, originalContent: original });
};

/**
 * The input part of a message content that starts with the preface: the content after the notice
 * and its separator. Content processors may have changed the input part, so this is preferred over
 * the recorded original. Falls back to the original when the content no longer starts with the
 * notice; null when the message is only the notice.
 */
export const stripPlatformInputPreface = (content: string, preface: PlatformInputPreface): string | null => {
  if (preface.originalContent === null) return null;
  const prefix = `${preface.content}\n\n`;
  return content.startsWith(prefix) ? content.slice(prefix.length) : preface.originalContent;
};
