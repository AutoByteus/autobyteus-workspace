import { AxiosError } from 'axios';
import { describe, expect, it } from 'vitest';
import {
  ContextFileUploadError,
  contextFileUploadErrorFromAxios,
  contextFileUploadFailureFor,
  failureOfUploadError,
  groupContextFileFailures,
} from '../contextFileUploadFailure';

const MB = 1024 * 1024;
const axiosFailure = (status: number | undefined, data?: unknown) => {
  const error = new AxiosError('Request failed');
  if (status !== undefined) error.response = { status, data, statusText: '', headers: {}, config: {} as never };
  return error;
};

describe('context-file upload failures', () => {
  it('maps a refusal to one reason: size with its limit, type, no response, anything else', () => {
    expect(contextFileUploadFailureFor({ status: 413, code: 'CONTEXT_FILE_TOO_LARGE', maxBytes: 25 * MB })).toEqual({ reason: 'too_large', maxBytes: 25 * MB });
    expect(contextFileUploadFailureFor({ status: 415, code: 'CONTEXT_FILE_TYPE_UNSUPPORTED' })).toEqual({ reason: 'unsupported_type' });
    expect(contextFileUploadFailureFor({})).toEqual({ reason: 'interrupted' });
    for (const input of [
      { status: 413 }, // a proxy's own 413 carries no code
      { status: 413, code: 'CONTEXT_FILE_TOO_LARGE' }, // no limit to name
      { status: 413, code: 'CONTEXT_FILE_TOO_LARGE', maxBytes: 'big' },
      { status: 400, code: 'CONTEXT_FILE_TOO_LARGE', maxBytes: 1 },
      { status: 500 },
    ]) {
      expect(contextFileUploadFailureFor(input)).toEqual({ reason: 'other' });
    }
  });

  it('translates the composer transport error (top-level code and maxBytes) and a lost connection', () => {
    expect(contextFileUploadErrorFromAxios(axiosFailure(413, { code: 'CONTEXT_FILE_TOO_LARGE', detail: 'x', maxBytes: 5 * MB })).failure)
      .toEqual({ reason: 'too_large', maxBytes: 5 * MB });
    expect(contextFileUploadErrorFromAxios(axiosFailure(415, { code: 'CONTEXT_FILE_TYPE_UNSUPPORTED' })).failure).toEqual({ reason: 'unsupported_type' });
    expect(contextFileUploadErrorFromAxios(axiosFailure(undefined)).failure).toEqual({ reason: 'interrupted' });
    expect(contextFileUploadErrorFromAxios(axiosFailure(400, { detail: 'owner is required.' })).failure).toEqual({ reason: 'other' });
    expect(contextFileUploadErrorFromAxios(new Error('boom')).failure).toEqual({ reason: 'other' });
  });

  it('reads the failure of an upload error and treats any other error as "other"', () => {
    expect(failureOfUploadError(new ContextFileUploadError({ reason: 'interrupted' }))).toEqual({ reason: 'interrupted' });
    expect(failureOfUploadError(new Error('Uploaded file is too large.'))).toEqual({ reason: 'other' });
    expect(failureOfUploadError('x')).toEqual({ reason: 'other' });
  });

  it('groups by reason and, for size, by limit, in first-failure order', () => {
    const groups = groupContextFileFailures([
      { fileName: 'a.mp4', failure: { reason: 'too_large', maxBytes: 2048 * MB } },
      { fileName: 'b.pdf', failure: { reason: 'too_large', maxBytes: 25 * MB } },
      { fileName: 'c.exe', failure: { reason: 'unsupported_type' } },
      { fileName: 'd.mp4', failure: { reason: 'too_large', maxBytes: 2048 * MB } },
      { fileName: 'e.png', failure: { reason: 'other' } },
      { fileName: 'f.png', failure: { reason: 'other' } },
    ]);
    expect(groups.map((g) => [g.key, g.fileNames])).toEqual([
      [`too_large:${2048 * MB}`, ['a.mp4', 'd.mp4']],
      [`too_large:${25 * MB}`, ['b.pdf']],
      ['unsupported_type', ['c.exe']],
      ['other', ['e.png', 'f.png']],
    ]);
  });
});
