export class MissingApiKeyError extends Error {
  readonly kind = 'missing_api_key' as const;
  readonly providerId: string;

  constructor(providerId: string) {
    super(`API key not provided for ${providerId}. Configure the ${providerId} API key before sending a request.`);
    this.name = 'MissingApiKeyError';
    this.providerId = providerId;
  }
}
