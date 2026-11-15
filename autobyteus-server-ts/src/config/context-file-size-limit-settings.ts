import { appConfigProvider } from "./app-config-provider.js";
import type { ContextFileSizeLimits } from "../context-files/domain/context-file-upload-policy.js";

export const CONTEXT_FILE_OTHER_MAX_MB_SETTING_KEY = "AUTOBYTEUS_CONTEXT_FILE_OTHER_MAX_MB";
export const CONTEXT_FILE_AUDIO_VIDEO_MAX_MB_SETTING_KEY = "AUTOBYTEUS_CONTEXT_FILE_AUDIO_VIDEO_MAX_MB";

const MiB = 1024 * 1024;
interface LimitSetting { key: string; label: string; defaultMb: number; minMb: number; maxMb: number }
const OTHER: LimitSetting = { key: CONTEXT_FILE_OTHER_MAX_MB_SETTING_KEY, label: "Other-file size limit", defaultMb: 25, minMb: 1, maxMb: 1024 };
const AUDIO_VIDEO: LimitSetting = { key: CONTEXT_FILE_AUDIO_VIDEO_MAX_MB_SETTING_KEY, label: "Audio/video size limit", defaultMb: 2048, minMb: 1, maxMb: 10240 };

const parseMb = (setting: LimitSetting, rawValue: string | undefined): number | null => {
  const normalized = rawValue?.trim() ?? "";
  if (!/^\d+$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isSafeInteger(value) && value >= setting.minMb && value <= setting.maxMb ? value : null;
};

const resolveBytes = (setting: LimitSetting): number =>
  (parseMb(setting, appConfigProvider.config.get(setting.key)) ?? setting.defaultMb) * MiB;

const normalizeForPersistence = (setting: LimitSetting) => (rawValue: string): [true, string] | [false, string] => {
  const parsed = parseMb(setting, rawValue);
  return parsed === null
    ? [false, `${setting.label} must be a whole number of MiB from ${setting.minMb} through ${setting.maxMb}.`]
    : [true, String(parsed)];
};

/** Read at the start of each operation, so a changed setting applies to the next upload; an invalid value uses the default. */
export const resolveContextFileSizeLimits = (): ContextFileSizeLimits => ({
  audioVideoMaxBytes: resolveBytes(AUDIO_VIDEO),
  otherFileMaxBytes: resolveBytes(OTHER),
});

export const normalizeContextFileOtherMaxMbForPersistence = normalizeForPersistence(OTHER);
export const normalizeContextFileAudioVideoMaxMbForPersistence = normalizeForPersistence(AUDIO_VIDEO);
