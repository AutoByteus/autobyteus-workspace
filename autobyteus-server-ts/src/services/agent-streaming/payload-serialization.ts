const FALLBACK_ERROR_CODE = "PAYLOAD_SERIALIZATION_FAILED";

const buildFallback = (data: unknown, error: unknown): Record<string, unknown> => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const valueType = data === null ? "null" : typeof data;
  return {
    code: FALLBACK_ERROR_CODE,
    message: "Unable to serialize payload to JSON-safe object",
    error: errorMessage,
    value_type: valueType,
  };
};

export const serializePayload = (data: unknown): Record<string, unknown> => {
  if (!data || typeof data !== "object") {
    return {};
  }

  try {
    const seen = new WeakSet<object>();
    const serialized = JSON.parse(
      JSON.stringify(data, (_key: string, value: unknown): unknown => {
        if (typeof value === "bigint") {
          return value.toString();
        }
        if (!value || typeof value !== "object") {
          return value;
        }
        if (seen.has(value)) {
          return "[Circular]";
        }
        seen.add(value);
        return value;
      }),
    ) as unknown;
    if (!serialized || typeof serialized !== "object" || Array.isArray(serialized)) {
      return {
        value: serialized ?? null,
      };
    }
    return serialized as Record<string, unknown>;
  } catch (error) {
    return buildFallback(data, error);
  }
};
