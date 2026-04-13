import type { AgentContext } from '~/types/agent/AgentContext';
import type { ContextAttachmentType } from '~/types/conversation';
import type { ExternalUserMessagePayload } from '../protocol/messageTypes';
import { hydrateContextAttachment } from '~/utils/contextFiles/contextAttachmentModel';

const KNOWN_CONTEXT_FILE_TYPES = new Set<ContextAttachmentType>([
  'Audio',
  'Csv',
  'Docx',
  'Html',
  'Image',
  'Javascript',
  'Json',
  'Markdown',
  'Pdf',
  'Pptx',
  'Python',
  'Text',
  'Unknown',
  'Video',
  'Xlsx',
  'Xml',
]);

const toContextFileType = (value?: string | null): ContextAttachmentType => {
  if (value && KNOWN_CONTEXT_FILE_TYPES.has(value as ContextAttachmentType)) {
    return value as ContextAttachmentType;
  }
  return 'Unknown';
};

const toTimestamp = (value?: string | null): Date => {
  if (!value) {
    return new Date();
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }
  return parsed;
};

export const handleExternalUserMessage = (
  payload: ExternalUserMessagePayload,
  context: AgentContext,
): void => {
  const contextFilePaths = (payload.context_file_paths ?? [])
    .filter((item) => typeof item?.path === 'string' && item.path.trim().length > 0)
    .map((item) =>
      hydrateContextAttachment({
        locator: item.path,
        type: toContextFileType(item.type),
      }),
    );

  context.conversation.messages.push({
    type: 'user',
    text: payload.content ?? '',
    timestamp: toTimestamp(payload.received_at),
    contextFilePaths,
  });
  context.isSending = true;
};
