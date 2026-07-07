export const INTERNAL_PROVIDER_REQUEST_KWARG_KEYS = new Set([
  'logicalConversationId',
  'logical_conversation_id',
  'conversationId',
  'agentId',
  'turnId',
  'requestId',
  'renderedPayload'
]);

export interface SafeProviderRequestKwargsOptions {
  controlledKeys?: Iterable<string>;
}

export function hasProviderRequestValue<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

const normalizeControlledKeys = (keys: Iterable<string> | null | undefined): Set<string> =>
  keys instanceof Set ? keys : new Set(keys ?? []);

export function cloneSafeProviderRequestKwargs(
  kwargs: Record<string, unknown> | null | undefined,
  options: SafeProviderRequestKwargsOptions = {}
): Record<string, unknown> {
  const safeKwargs: Record<string, unknown> = {};
  const controlledKeys = normalizeControlledKeys(options.controlledKeys);

  for (const [key, value] of Object.entries(kwargs ?? {})) {
    if (!hasProviderRequestValue(value)) {
      continue;
    }
    if (INTERNAL_PROVIDER_REQUEST_KWARG_KEYS.has(key) || controlledKeys.has(key)) {
      continue;
    }
    safeKwargs[key] = value;
  }

  return safeKwargs;
}

export function applySafeProviderRequestKwargs(
  target: Record<string, unknown>,
  kwargs: Record<string, unknown> | null | undefined,
  options: SafeProviderRequestKwargsOptions = {}
): void {
  Object.assign(target, cloneSafeProviderRequestKwargs(kwargs, options));
}
