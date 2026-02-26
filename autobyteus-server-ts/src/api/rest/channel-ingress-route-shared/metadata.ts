export const resolveCallbackIdempotencyKey = (
  metadata: Record<string, unknown>,
  correlationMessageId: string,
): string => {
  const fromCamel = normalizeOptionalString(
    metadata.callbackIdempotencyKey as string | undefined,
  );
  if (fromCamel) {
    return fromCamel;
  }

  const fromSnake = normalizeOptionalString(
    metadata.callback_idempotency_key as string | undefined,
  );
  if (fromSnake) {
    return fromSnake;
  }

  return correlationMessageId;
};

export const resolveErrorMessage = (
  metadata: Record<string, unknown>,
): string | null => {
  const fromCamel = metadata.errorMessage;
  if (typeof fromCamel === "string") {
    return normalizeOptionalString(fromCamel);
  }

  const fromSnake = metadata.error_message;
  if (typeof fromSnake === "string") {
    return normalizeOptionalString(fromSnake);
  }
  return null;
};

const normalizeOptionalString = (
  value: string | null | undefined,
): string | null => {
  if (value === undefined || value === null) {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};
