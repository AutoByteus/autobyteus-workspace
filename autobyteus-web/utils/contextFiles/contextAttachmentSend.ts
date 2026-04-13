import type { ContextAttachment } from '~/types/conversation';

export const partitionContextAttachmentsForStreaming = (
  attachments: ContextAttachment[],
): { contextFilePaths: string[]; imageUrls: string[] } => {
  const contextFilePaths: string[] = [];
  const imageUrls: string[] = [];

  for (const attachment of attachments) {
    const locator = attachment.locator?.trim();
    if (!locator) {
      continue;
    }

    if (attachment.type === 'Image') {
      imageUrls.push(locator);
      continue;
    }

    contextFilePaths.push(locator);
  }

  return { contextFilePaths, imageUrls };
};
