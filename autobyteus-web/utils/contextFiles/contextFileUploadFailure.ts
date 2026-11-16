import axios from 'axios';

/** Why a context file did not attach: the only information the UI shows (never the server's own text). */
export type ContextFileUploadFailure =
  | { reason: 'too_large'; maxBytes: number }
  | { reason: 'unsupported_type' }
  | { reason: 'interrupted' }
  | { reason: 'other' };

/** Thrown by the upload transports; the composers read `failure`, never a response body. */
export class ContextFileUploadError extends Error {
  constructor(readonly failure: ContextFileUploadFailure) {
    super(`Context file upload failed: ${failure.reason}`);
    this.name = 'ContextFileUploadError';
  }
}

/**
 * The one mapping from a refusal to a failure. A transport unwraps its own body envelope first and passes
 * `{code, maxBytes}`; no `status` means no response arrived (connection lost, timeout).
 */
export const contextFileUploadFailureFor = (input: {
  status?: number;
  code?: unknown;
  maxBytes?: unknown;
}): ContextFileUploadFailure => {
  if (input.status === undefined) return { reason: 'interrupted' };
  if (input.status === 413 && input.code === 'CONTEXT_FILE_TOO_LARGE' && typeof input.maxBytes === 'number' && input.maxBytes > 0) {
    return { reason: 'too_large', maxBytes: input.maxBytes };
  }
  if (input.status === 415 && input.code === 'CONTEXT_FILE_TYPE_UNSUPPORTED') return { reason: 'unsupported_type' };
  return { reason: 'other' };
};

/** An axios failure of the composer's transport (`{code, detail, maxBytes}` at the top level of the body). */
export const contextFileUploadErrorFromAxios = (error: unknown): ContextFileUploadError => {
  if (!axios.isAxiosError(error)) return new ContextFileUploadError({ reason: 'other' });
  const body = (error.response?.data ?? {}) as { code?: unknown; maxBytes?: unknown };
  return new ContextFileUploadError(contextFileUploadFailureFor({
    status: error.response?.status,
    code: body.code,
    maxBytes: body.maxBytes,
  }));
};

export const failureOfUploadError = (error: unknown): ContextFileUploadFailure =>
  error instanceof ContextFileUploadError ? error.failure : { reason: 'other' };

export type ContextFileFailureGroup = {
  /** `too_large:<maxBytes>` or the reason: the line's identity. */
  key: string;
  failure: ContextFileUploadFailure;
  fileNames: string[];
};

/**
 * One group per failure reason, and for `too_large` one per limit, so every file is named with its own limit.
 * Groups keep the order in which their first file failed.
 */
export const groupContextFileFailures = (
  failures: ReadonlyArray<{ fileName: string; failure: ContextFileUploadFailure }>,
): ContextFileFailureGroup[] => {
  const groups = new Map<string, ContextFileFailureGroup>();
  for (const { fileName, failure } of failures) {
    const key = failure.reason === 'too_large' ? `too_large:${failure.maxBytes}` : failure.reason;
    const group = groups.get(key);
    if (group) {
      group.fileNames.push(fileName);
    } else {
      groups.set(key, { key, failure, fileNames: [fileName] });
    }
  }
  return [...groups.values()];
};
