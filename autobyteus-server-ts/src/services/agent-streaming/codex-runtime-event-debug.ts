const isCodexRuntimeAdapterDebugEnabled = process.env.CODEX_RUNTIME_ADAPTER_DEBUG === "1";
const isCodexRuntimeRawEventDebugEnabled = process.env.CODEX_RUNTIME_RAW_EVENT_DEBUG === "1";
const codexRuntimeRawEventMaxChars = Number.isFinite(Number(process.env.CODEX_RUNTIME_RAW_EVENT_MAX_CHARS))
  ? Math.max(512, Number(process.env.CODEX_RUNTIME_RAW_EVENT_MAX_CHARS))
  : 20_000;

export const debugCodexRuntimeAdapter = (
  message: string,
  details?: Record<string, unknown>,
): void => {
  if (!isCodexRuntimeAdapterDebugEnabled) {
    return;
  }
  if (details) {
    console.log(`[CodexRuntimeEventAdapter] ${message}`, details);
    return;
  }
  console.log(`[CodexRuntimeEventAdapter] ${message}`);
};

export const shouldLogRawCodexRuntimeEvent = (): boolean => isCodexRuntimeRawEventDebugEnabled;

const stringifyForDebug = (value: unknown): string => {
  try {
    return JSON.stringify(value);
  } catch {
    return "[unserializable-runtime-event]";
  }
};

const truncateForDebug = (value: string): string => {
  if (value.length <= codexRuntimeRawEventMaxChars) {
    return value;
  }
  return `${value.slice(0, codexRuntimeRawEventMaxChars)}...<truncated>`;
};

export const formatRawCodexRuntimeEventForDebug = (value: unknown): string =>
  truncateForDebug(stringifyForDebug(value));

