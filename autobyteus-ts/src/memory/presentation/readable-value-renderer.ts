export type ReadableValueRenderOptions = {
  maxChars: number | null;
};

const redactVisibleText = (value: string): string =>
  value
    .replace(/\b(Authorization\s*[:=]\s*)(Bearer|Basic|Token)\s+[A-Za-z0-9._~+/=-]+/gi, '$1$2 <redacted-token>')
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer <redacted-token>')
    .replace(/\b([A-Z0-9_]*(?:API[_-]?KEY|TOKEN|PASSWORD|SECRET)[A-Z0-9_]*\b["']?\s*[:=]\s*)(["']?)[^\s'",;}]+\2?/gi, '$1<redacted-secret>')
    .replace(/\b((?:api[_-]?key|access[_-]?token|auth[_-]?token|password|secret)\b["']?\s*[:=]\s*)(["']?)[^\s'",;}]+\2?/gi, '$1<redacted-secret>')
    .replace(/\b(?:sk-[A-Za-z0-9_-]{12,}|sk-ant-[A-Za-z0-9_-]{12,}|AIza[A-Za-z0-9_-]{16,}|ghp_[A-Za-z0-9_]{16,}|github_pat_[A-Za-z0-9_]{16,}|xox[baprs]-[A-Za-z0-9-]{16,})\b/g, '<redacted-secret>')
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '<redacted-email>')
    .replace(
      /(["']?)\b(?:turn_id|seq|source_event|correlation_id|tool_call_id|provider_event_id|provider_session_id)\b\1\s*[:=]\s*[^\n,}]+/gi,
      (_match, quote: string) => quote
        ? '"<redacted-backend-field>": "<redacted>"'
        : '<redacted-backend-field>',
    );

const serializeVisibleValue = (value: unknown): string => {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string') return value;
  try {
    const serialized = JSON.stringify(value, null, 2);
    return serialized === undefined ? String(value) : serialized;
  } catch {
    return String(value);
  }
};

const normalizeLimit = (value: number | null): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : null;

const omitMiddle = (value: string, limit: number): string => {
  if (value.length <= limit) return value;
  if (limit === 0) return '';

  let omitted = value.length;
  for (let iteration = 0; iteration < 8; iteration += 1) {
    const marker = `… [${omitted} characters omitted] …`;
    if (limit <= marker.length + 1) {
      return marker.slice(0, limit);
    }
    const retained = limit - marker.length;
    const headLength = Math.max(1, Math.ceil(retained / 2));
    const tailLength = Math.max(1, retained - headLength);
    const nextOmitted = Math.max(0, value.length - headLength - tailLength);
    if (nextOmitted === omitted) {
      return `${value.slice(0, headLength)}${marker}${value.slice(value.length - tailLength)}`;
    }
    omitted = nextOmitted;
  }

  const marker = `… [${omitted} characters omitted] …`;
  const retained = Math.max(2, limit - marker.length);
  const headLength = Math.ceil(retained / 2);
  const tailLength = retained - headLength;
  return `${value.slice(0, headLength)}${marker}${value.slice(value.length - tailLength)}`.slice(0, limit);
};

export class ReadableValueRenderer {
  render(value: unknown, options: ReadableValueRenderOptions): string {
    const redacted = redactVisibleText(serializeVisibleValue(value));
    const limit = normalizeLimit(options.maxChars);
    return limit === null ? redacted : omitMiddle(redacted, limit);
  }
}
