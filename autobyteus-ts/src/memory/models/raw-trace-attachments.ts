import { ContextFileType } from '../../agent/message/context-file-type.js';
import {
  captureContextFileReference, contextFileReferenceFromDict,
  type ContextFileReference,
} from '../../agent/message/context-file-reference.js';
import type { RawTraceMedia } from './raw-trace-item.js';

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

/** Disjoint partitions preserve accepted URI/type/name and order, never inferred values. */
export function partitionRawTraceAttachments(values: readonly ContextFileReference[]): {
  media: RawTraceMedia | null;
  fileAttachments: readonly ContextFileReference[];
} {
  const media: Required<RawTraceMedia> = { images: [], audio: [], video: [] };
  const files: ContextFileReference[] = [];
  for (const value of values) {
    const reference = captureContextFileReference(value);
    if (reference.fileType === ContextFileType.IMAGE) media.images.push(reference.uri);
    else if (reference.fileType === ContextFileType.AUDIO) media.audio.push(reference.uri);
    else if (reference.fileType === ContextFileType.VIDEO) media.video.push(reference.uri);
    else files.push(reference);
  }
  return {
    media: media.images.length || media.audio.length || media.video.length ? media : null,
    fileAttachments: validateFileAttachments(files),
  };
}
