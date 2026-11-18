import type { ContextFileSizeLimits } from "../../src/context-files/domain/context-file-upload-policy.js";

export const MiB = 1024 * 1024;
/** The shipped defaults: 25 MiB for other files, 2048 MiB for audio/video. */
export const defaultContextFileSizeLimits: ContextFileSizeLimits = { audioVideoMaxBytes: 2048 * MiB, otherFileMaxBytes: 25 * MiB };
