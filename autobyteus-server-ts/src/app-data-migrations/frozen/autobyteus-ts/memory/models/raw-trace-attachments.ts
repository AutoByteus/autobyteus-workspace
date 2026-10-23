import { ContextFileType } from '../../agent/message/context-file-type.js';
import {
  captureContextFileReference, contextFileReferenceFromDict,
  type ContextFileReference,
} from '../../agent/message/context-file-reference.js';

export function validateFileAttachments(
  values: readonly ContextFileReference[],
): readonly ContextFileReference[] {
  if (!Array.isArray(values)) throw new TypeError('file_attachments must be an array.');
  return Object.freeze(values.map((value) => {
    const reference = captureContextFileReference(value);
    if ([ContextFileType.IMAGE, ContextFileType.AUDIO, ContextFileType.VIDEO].includes(reference.fileType)) {
      throw new TypeError('file_attachments must contain non-media references only.');
    }
    return reference;
  }));
}

export function parseRawTraceFileAttachments(
  value: unknown, traceType: string,
): readonly ContextFileReference[] {
  if (value === undefined || value === null) return Object.freeze([]);
  if (!Array.isArray(value)) throw new TypeError('file_attachments must be an array.');
  if (traceType !== 'user' && value.length) {
    throw new TypeError('Only user raw traces may contain file_attachments.');
  }
  return validateFileAttachments(value.map(contextFileReferenceFromDict));
}
