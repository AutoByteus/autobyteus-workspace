export type ProviderAccessRefusal =
  | 'invalid_or_missing_credentials'
  | 'quota_or_billing_blocked'
  | 'rate_limited'
  | 'model_not_available_or_access_blocked';

/** Classifies a provider refusal from its error text; `null` for every other error. */
export const classifyProviderAccessError = (error: unknown): ProviderAccessRefusal | null => {
  const message = String(error instanceof Error ? error.message : error).toLowerCase();

  if (
    message.includes('401')
    || message.includes('authentication')
    || message.includes('unauthorized')
    || message.includes('invalid api key')
    || message.includes('invalid x-api-key')
    || message.includes('api key not valid')
    // GLM (Zhipu) reports authentication failures in Chinese.
    || message.includes('身份验证失败')
  ) {
    return 'invalid_or_missing_credentials';
  }

  if (
    message.includes('quota')
    || message.includes('billing')
    || message.includes('insufficient_quota')
    || message.includes('insufficient balance')
    || message.includes('payment required')
  ) {
    return 'quota_or_billing_blocked';
  }

  if (message.includes('429') || message.includes('rate limit') || message.includes('rate_limit')) {
    return 'rate_limited';
  }

  if (
    message.includes('403')
    || message.includes('forbidden')
    || message.includes('permission_denied')
    || message.includes('permission denied')
    || message.includes('access denied')
    || message.includes('not_found')
    || message.includes('not found')
    || message.includes('does not exist')
    || message.includes('model_not_found')
    || message.includes('model not found')
    || message.includes('unsupported model')
    || message.includes('not have access to the model')
    || message.includes('do not have access to the model')
  ) {
    return 'model_not_available_or_access_blocked';
  }

  return null;
};
