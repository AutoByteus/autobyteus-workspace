const isMethodRuntimeAdapterDebugEnabled = process.env.METHOD_RUNTIME_ADAPTER_DEBUG === "1";
const isMethodRuntimeRawEventDebugEnabled = process.env.METHOD_RUNTIME_RAW_EVENT_DEBUG === "1";
const methodRuntimeRawEventMaxChars = Number.isFinite(Number(process.env.METHOD_RUNTIME_RAW_EVENT_MAX_CHARS))
  ? Math.max(512, Number(process.env.METHOD_RUNTIME_RAW_EVENT_MAX_CHARS))
  : 20_000;

export const debugMethodRuntimeAdapter = (
  message: string,
  details?: Record<string, unknown>,
): void => {
  if (!isMethodRuntimeAdapterDebugEnabled) {
    return;
  }
  if (details) {
    console.log(`[MethodRuntimeEventAdapter] ${message}`, details);
    return;
  }
  console.log(`[MethodRuntimeEventAdapter] ${message}`);
};

export const shouldLogRawMethodRuntimeEvent = (): boolean => isMethodRuntimeRawEventDebugEnabled;

const stringifyForDebug = (value: unknown): string => {
  try {
    return JSON.stringify(value);
  } catch {
    return "[unserializable-runtime-event]";
  }
};

const truncateForDebug = (value: string): string => {
  if (value.length <= methodRuntimeRawEventMaxChars) {
    return value;
  }
  return `${value.slice(0, methodRuntimeRawEventMaxChars)}...<truncated>`;
};

export const formatRawMethodRuntimeEventForDebug = (value: unknown): string =>
  truncateForDebug(stringifyForDebug(value));

