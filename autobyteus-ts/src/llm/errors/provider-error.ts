export type ProviderErrorEvidence = {
  message: string;
  providerStatus?: number | string | null;
  providerCode?: string | null;
  providerRequestId?: string | null;
  details?: string | null;
};

const FALLBACK_MESSAGE = 'Provider request failed without an error message.';
const SECRET_PATTERNS = [
  /(authorization\s*[:=]\s*(?:bearer|basic)\s+)[^\s,;}]+/gi,
  /((?:api[_-]?key|access[_-]?token|token|secret|password)\s*[:=]\s*["']?)[^\s,"'}]+/gi,
  /([?&](?:api[_-]?key|access[_-]?token|token|secret)=)[^&\s]+/gi,
];

export const redactProviderSecrets = (value: string): string => {
  let redacted = value;
  for (const pattern of SECRET_PATTERNS) redacted = redacted.replace(pattern, '$1<redacted>');
  return redacted;
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' ? value as Record<string, unknown> : null;

const firstText = (...values: unknown[]): string | null => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return redactProviderSecrets(value.trim());
  }
  return null;
};

const firstNumberOrText = (...values: unknown[]): number | string | null => {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
};

export const extractProviderErrorEvidence = (error: unknown): ProviderErrorEvidence => {
  const root = asRecord(error);
  const response = asRecord(root?.response);
  const responseData = asRecord(response?.data);
  const errorData = asRecord(root?.error) ?? asRecord(responseData?.error);
  const headers = asRecord(response?.headers) ?? asRecord(root?.headers);
  const message = firstText(
    root?.message,
    errorData?.message,
    responseData?.message,
    typeof error === 'string' ? error : null,
  ) ?? FALLBACK_MESSAGE;
  const providerStatus = firstNumberOrText(root?.status, response?.status, responseData?.status, errorData?.status);
  const providerCode = firstText(root?.code, errorData?.code, responseData?.code);
  const providerRequestId = firstText(
    root?.request_id,
    root?.requestId,
    responseData?.request_id,
    responseData?.requestId,
    headers?.['x-request-id'],
    headers?.['request-id'],
  );

  const detailCandidate = firstText(
    errorData?.detail,
    errorData?.details,
    responseData?.detail,
    responseData?.details,
  );
  return {
    message,
    ...(providerStatus !== null ? { providerStatus } : {}),
    ...(providerCode ? { providerCode } : {}),
    ...(providerRequestId ? { providerRequestId } : {}),
    ...(detailCandidate ? { details: detailCandidate } : {}),
  };
};
