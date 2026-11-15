import type { TranslationKey, TranslationParams } from '~/localization/runtime/types';
import { formatContextFileSizeLimit } from './contextFileSizeLimits';
import type { ContextFileFailureGroup } from './contextFileUploadFailure';

const KEYS = 'agentInput.components.agentInput.ContextFilePathInputArea';

/** The localized line of one failure group: the file names and, for size, the limit. Never any server text. */
export const contextFileFailureMessage = (
  group: ContextFileFailureGroup,
  translate: (key: TranslationKey, params?: TranslationParams) => string,
  locale: string,
): string => {
  const name = group.fileNames.join(', ');
  switch (group.failure.reason) {
    case 'too_large':
      return translate(`${KEYS}.upload_too_large`, {
        name,
        limit: formatContextFileSizeLimit(group.failure.maxBytes, locale),
      });
    case 'unsupported_type':
      return translate(`${KEYS}.upload_unsupported_type`, { name });
    case 'interrupted':
      return translate(`${KEYS}.upload_interrupted`, { name });
    default:
      return translate(`${KEYS}.upload_failed`, { name });
  }
};
