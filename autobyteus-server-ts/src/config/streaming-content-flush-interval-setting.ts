import { appConfigProvider } from "./app-config-provider.js";

export const STREAMING_CONTENT_FLUSH_INTERVAL_SETTING_KEY =
  "AUTOBYTEUS_STREAMING_CONTENT_FLUSH_INTERVAL_MS";
export const DEFAULT_STREAMING_CONTENT_FLUSH_INTERVAL_MS = 500;
export const MIN_STREAMING_CONTENT_FLUSH_INTERVAL_MS = 100;
export const MAX_STREAMING_CONTENT_FLUSH_INTERVAL_MS = 2_000;

const parseInterval = (rawValue: string | undefined): number | null => {
  const normalized = rawValue?.trim() ?? "";
  if (!/^\d+$/.test(normalized)) {
    return null;
  }

  const value = Number(normalized);
  if (
    !Number.isSafeInteger(value) ||
    value < MIN_STREAMING_CONTENT_FLUSH_INTERVAL_MS ||
    value > MAX_STREAMING_CONTENT_FLUSH_INTERVAL_MS
  ) {
    return null;
  }
  return value;
};

export const resolveStreamingContentFlushIntervalMs = (
  rawValue: string | undefined = appConfigProvider.config.get(
    STREAMING_CONTENT_FLUSH_INTERVAL_SETTING_KEY,
  ),
): number => parseInterval(rawValue) ?? DEFAULT_STREAMING_CONTENT_FLUSH_INTERVAL_MS;

export const normalizeStreamingContentFlushIntervalForPersistence = (
  rawValue: string,
): [true, string] | [false, string] => {
  const parsed = parseInterval(rawValue);
  if (parsed === null) {
    return [
      false,
      `Live response update interval must be a whole number from ${MIN_STREAMING_CONTENT_FLUSH_INTERVAL_MS} through ${MAX_STREAMING_CONTENT_FLUSH_INTERVAL_MS} milliseconds.`,
    ];
  }
  return [true, String(parsed)];
};
