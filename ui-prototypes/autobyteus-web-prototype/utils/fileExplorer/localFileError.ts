export type LocalFilePreviewErrorCode =
  | 'invalid-path'
  | 'unavailable'
  | 'not-regular-file'
  | 'unreadable'
  | 'unsupported-type';

export const LOCAL_FILE_PREVIEW_ERROR_PREFIX = 'local-file-preview:';

export const localFilePreviewError = (code: LocalFilePreviewErrorCode): string => (
  `${LOCAL_FILE_PREVIEW_ERROR_PREFIX}${code}`
);

export const localFilePreviewErrorCode = (value: string | null | undefined): LocalFilePreviewErrorCode | null => {
  if (!value?.startsWith(LOCAL_FILE_PREVIEW_ERROR_PREFIX)) return null;
  const code = value.slice(LOCAL_FILE_PREVIEW_ERROR_PREFIX.length);
  return code === 'invalid-path'
    || code === 'unavailable'
    || code === 'not-regular-file'
    || code === 'unreadable'
    || code === 'unsupported-type'
    ? code
    : null;
};
