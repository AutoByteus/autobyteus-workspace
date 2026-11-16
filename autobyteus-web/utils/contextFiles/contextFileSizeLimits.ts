/** The node's context-file size limits as `GET /rest/context-files/size-limits` publishes them (see GLOSSARY.md "Context Files"). */
export interface ContextFileSizeLimits {
  otherFileMaxBytes: number;
  audioVideoMaxBytes: number;
  /** The accepted audio and video types: the files the audio/video limit covers. */
  audioVideoMimeTypes: string[];
}

const isLimit = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0;

/** Reads the published limits; a malformed answer is an error, never a guessed limit. */
export const parseContextFileSizeLimits = (raw: unknown): ContextFileSizeLimits => {
  const body = raw as Partial<ContextFileSizeLimits> | null;
  if (
    !body
    || !isLimit(body.otherFileMaxBytes)
    || !isLimit(body.audioVideoMaxBytes)
    || !Array.isArray(body.audioVideoMimeTypes)
    || !body.audioVideoMimeTypes.every((type) => typeof type === 'string')
  ) {
    throw new Error('The node published invalid context-file size limits.');
  }
  return {
    otherFileMaxBytes: body.otherFileMaxBytes,
    audioVideoMaxBytes: body.audioVideoMaxBytes,
    audioVideoMimeTypes: [...body.audioVideoMimeTypes],
  };
};

/**
 * The limit that applies to a picked file, classified by its `File.type` like the server's multipart Content-Type;
 * an empty or unlisted type gets the other-file limit (the server stays the authority).
 */
export const contextFileMaxBytesFor = (file: { type: string }, limits: ContextFileSizeLimits): number =>
  limits.audioVideoMimeTypes.includes(file.type) ? limits.audioVideoMaxBytes : limits.otherFileMaxBytes;

const MIB = 1024 * 1024;
const GIB = 1024 * MIB;

/** `25 MB`, `2 GB`, `1.5 GB`: base 1024 (as phones and Windows show sizes), whole numbers or one decimal, in the UI locale. */
export const formatContextFileSizeLimit = (bytes: number, locale: string): string => {
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  return bytes >= GIB ? `${number.format(bytes / GIB)} GB` : `${number.format(bytes / MIB)} MB`;
};
