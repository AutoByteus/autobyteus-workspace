export type HttpAccessLogMode = "off" | "errors" | "all";

type PinoLogLevel = "fatal" | "error" | "warn" | "info" | "debug" | "trace" | "silent";

export type LoggingConfig = {
  pinoLogLevel: PinoLogLevel;
  httpAccessLogMode: HttpAccessLogMode;
  includeNoisyHttpAccessRoutes: boolean;
};

const normalizeOptionalString = (value: string | null | undefined): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const parseBooleanEnv = (value: string | null | undefined, fallback: boolean): boolean => {
  const normalized = normalizeOptionalString(value)?.toLowerCase();
  if (!normalized) {
    return fallback;
  }
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }
  return fallback;
};

const resolvePinoLogLevel = (value: string | null | undefined): PinoLogLevel => {
  const normalized = normalizeOptionalString(value)?.toLowerCase();
  switch (normalized) {
    case "fatal":
    case "error":
    case "warn":
    case "info":
    case "debug":
    case "trace":
    case "silent":
      return normalized;
    default:
      return "info";
  }
};

const resolveHttpAccessLogMode = (value: string | null | undefined): HttpAccessLogMode => {
  const normalized = normalizeOptionalString(value)?.toLowerCase();
  switch (normalized) {
    case "off":
    case "errors":
    case "all":
      return normalized;
    default:
      return "errors";
  }
};

export const getLoggingConfigFromEnv = (
  env: NodeJS.ProcessEnv,
): LoggingConfig => ({
  pinoLogLevel: resolvePinoLogLevel(env.LOG_LEVEL),
  httpAccessLogMode: resolveHttpAccessLogMode(env.AUTOBYTEUS_HTTP_ACCESS_LOG_MODE),
  includeNoisyHttpAccessRoutes: parseBooleanEnv(
    env.AUTOBYTEUS_HTTP_ACCESS_LOG_INCLUDE_NOISY,
    false,
  ),
});
