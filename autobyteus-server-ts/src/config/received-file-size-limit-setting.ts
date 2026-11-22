import { appConfigProvider } from "./app-config-provider.js";

/** autobyteus-587 (RFC-001 RF-4): the largest file this node accepts from another node, in MiB. */
export const RECEIVED_FILE_MAX_MB_SETTING_KEY = "AUTOBYTEUS_RECEIVED_FILE_MAX_MB";

const MiB = 1024 * 1024;
const DEFAULT_MB = 2048;
const MIN_MB = 1;
/** One message or delegation carries at most 4 GiB of files, so no single file can be larger. */
const MAX_MB = 4096;

const parseMb = (rawValue: string | undefined): number | null => {
  const normalized = rawValue?.trim() ?? "";
  if (!/^\d+$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isSafeInteger(value) && value >= MIN_MB && value <= MAX_MB ? value : null;
};

/** Read at each status and piece, so a changed setting applies to the next file; an invalid value uses the default. */
export const resolveReceivedFileMaxBytes = (): number =>
  (parseMb(appConfigProvider.config.get(RECEIVED_FILE_MAX_MB_SETTING_KEY)) ?? DEFAULT_MB) * MiB;

export const normalizeReceivedFileMaxMbForPersistence = (rawValue: string): [true, string] | [false, string] => {
  const parsed = parseMb(rawValue);
  return parsed === null
    ? [false, `Received file size limit must be a whole number of MiB from ${MIN_MB} through ${MAX_MB}.`]
    : [true, String(parsed)];
};
