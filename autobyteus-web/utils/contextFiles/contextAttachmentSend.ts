import type { ContextAttachment } from '~/types/conversation';

export type ContextAttachmentSubmissionPlan = {
  retainedMessageAttachments: ContextAttachment[];
  executable: {
    contextFilePaths: string[];
    imageUrls: string[];
  };
};

export const isExecutableContextAttachment = (attachment: ContextAttachment): boolean =>
  attachment.kind !== 'unsupported_local_file' && Boolean(attachment.locator?.trim());

export const planContextAttachmentSubmission = (
  attachments: ContextAttachment[],
): ContextAttachmentSubmissionPlan => {
  const contextFilePaths: string[] = [];
  const imageUrls: string[] = [];

  for (const attachment of attachments) {
    if (!isExecutableContextAttachment(attachment)) {
      continue;
    }
    const locator = attachment.locator.trim();

    if (attachment.type === 'Image') {
      imageUrls.push(locator);
      continue;
    }

    contextFilePaths.push(locator);
  }

  return {
    retainedMessageAttachments: [...attachments],
    executable: { contextFilePaths, imageUrls },
  };
};
