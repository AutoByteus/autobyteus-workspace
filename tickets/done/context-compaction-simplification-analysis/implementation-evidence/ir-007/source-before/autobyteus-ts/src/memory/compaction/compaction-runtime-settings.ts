export type CompactionRuntimeSettings = {
  triggerRatioOverride: number | null;
  activeContextTokensOverride: number | null;
  detailedLogsEnabled: boolean;
};

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);

export const AUTOBYTEUS_COMPACTION_TRIGGER_RATIO = 'AUTOBYTEUS_COMPACTION_TRIGGER_RATIO';
export const AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE = 'AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE';
export const AUTOBYTEUS_COMPACTION_DEBUG_LOGS = 'AUTOBYTEUS_COMPACTION_DEBUG_LOGS';

const parseRatio = (value: string | undefined): number | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.min(1, parsed);
};

const parsePositiveInteger = (value: string | undefined): number | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.floor(parsed);
};

const parseBoolean = (value: string | undefined): boolean => {
  if (typeof value !== 'string') {
    return false;
  }
  return TRUE_VALUES.has(value.trim().toLowerCase());
};

export class CompactionRuntimeSettingsResolver {
  resolve(env: NodeJS.ProcessEnv = process.env): CompactionRuntimeSettings {
    return {
      triggerRatioOverride: parseRatio(env[AUTOBYTEUS_COMPACTION_TRIGGER_RATIO]),
      activeContextTokensOverride: parsePositiveInteger(env[AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE]),
      detailedLogsEnabled: parseBoolean(env[AUTOBYTEUS_COMPACTION_DEBUG_LOGS])
    };
  }
}
