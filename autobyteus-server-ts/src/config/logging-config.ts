export type HttpAccessLogMode = "off" | "errors" | "all";

export type PinoLogLevel = "fatal" | "error" | "warn" | "info" | "debug" | "trace" | "silent";

export type ScopedLogLevelOverride = {
  scope: string;
  level: PinoLogLevel;
};

export type LoggingConfig = {
  pinoLogLevel: PinoLogLevel;
  httpAccessLogMode: HttpAccessLogMode;
  includeNoisyHttpAccessRoutes: boolean;
  scopedLogLevelOverrides: ScopedLogLevelOverride[];
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

const LOG_LEVEL_PRIORITY: Record<PinoLogLevel, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
  silent: 70,
};

const parsePinoLogLevel = (value: string | null | undefined): PinoLogLevel | null => {
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
      return null;
  }
};

export const resolvePinoLogLevel = (value: string | null | undefined): PinoLogLevel =>
  parsePinoLogLevel(value) ?? "info";

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

const normalizeScopeName = (value: string | null | undefined): string | null => {
  const normalized = normalizeOptionalString(value)?.toLowerCase();
  if (!normalized) {
    return null;
  }
  return normalized.replace(/\.+/g, ".").replace(/^\.+|\.+$/g, "");
};

export const parseScopedLogLevelOverrides = (
  value: string | null | undefined,
): ScopedLogLevelOverride[] => {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return [];
  }

  const dedupedOverrides = new Map<string, PinoLogLevel>();
  for (const token of normalized.split(/[\n,;]+/)) {
    const trimmedToken = token.trim();
    if (!trimmedToken) {
      continue;
    }

    const separatorIndex = trimmedToken.includes("=")
      ? trimmedToken.indexOf("=")
      : trimmedToken.indexOf(":");
    if (separatorIndex <= 0) {
      continue;
    }

    const scope = normalizeScopeName(trimmedToken.slice(0, separatorIndex));
    const level = parsePinoLogLevel(trimmedToken.slice(separatorIndex + 1));
    if (!scope || !level) {
      continue;
    }
    dedupedOverrides.set(scope, level);
  }

  return Array.from(dedupedOverrides, ([scope, level]) => ({ scope, level }));
};

const scopeMatchesLoggerName = (loggerName: string, scope: string): boolean =>
  loggerName === scope || loggerName.startsWith(`${scope}.`);

export const resolveScopedLogLevel = (
  loggingConfig: Pick<LoggingConfig, "pinoLogLevel" | "scopedLogLevelOverrides">,
  loggerName: string | null | undefined,
): PinoLogLevel => {
  const normalizedLoggerName = normalizeScopeName(loggerName);
  if (!normalizedLoggerName) {
    return loggingConfig.pinoLogLevel;
  }

  let matchedOverride: ScopedLogLevelOverride | null = null;
  for (const override of loggingConfig.scopedLogLevelOverrides) {
    if (!scopeMatchesLoggerName(normalizedLoggerName, override.scope)) {
      continue;
    }
    if (!matchedOverride || override.scope.length > matchedOverride.scope.length) {
      matchedOverride = override;
    }
  }

  return matchedOverride?.level ?? loggingConfig.pinoLogLevel;
};

export const shouldEmitLog = (
  effectiveLogLevel: PinoLogLevel,
  recordLogLevel: PinoLogLevel,
): boolean => LOG_LEVEL_PRIORITY[recordLogLevel] >= LOG_LEVEL_PRIORITY[effectiveLogLevel];

export const getLoggingConfigFromEnv = (env: NodeJS.ProcessEnv): LoggingConfig => ({
  pinoLogLevel: resolvePinoLogLevel(env.LOG_LEVEL),
  httpAccessLogMode: resolveHttpAccessLogMode(env.AUTOBYTEUS_HTTP_ACCESS_LOG_MODE),
  includeNoisyHttpAccessRoutes: parseBooleanEnv(env.AUTOBYTEUS_HTTP_ACCESS_LOG_INCLUDE_NOISY, false),
  scopedLogLevelOverrides: parseScopedLogLevelOverrides(env.AUTOBYTEUS_LOG_LEVEL_OVERRIDES),
});
