import { TokenUsageSchema, type TokenUsage } from '../../../llm/utils/token-usage.js';

export const isRecord = (value: unknown): value is Record<string, any> =>
  typeof value === 'object' && value !== null;

export const assertRequiredKeys = (
  data: Record<string, any>,
  keys: string[],
  name: string
): void => {
  const missing = keys.filter((key) => !(key in data));
  if (missing.length) {
    throw new Error(`${name} missing required fields: ${missing.join(', ')}`);
  }
};

export class BaseStreamPayload {
  [key: string]: any;

  constructor(data: Record<string, any> = {}) {
    Object.assign(this, data);
  }
}

export const parseUsage = (usageData: unknown): TokenUsage | undefined => {
  if (!usageData) {
    return undefined;
  }
  const parsed = TokenUsageSchema.safeParse(usageData);
  if (!parsed.success) {
    console.warn(`Unsupported usage payload for stream event: ${parsed.error.message}`);
    return undefined;
  }
  return parsed.data;
};
