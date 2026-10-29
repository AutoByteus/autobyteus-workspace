/** The stable name of one vault entry, for example `provider.openai.api-key`. */
export type SecretId = string & { readonly __brand: "SecretId" };

export const secretId = (value: string): SecretId => {
  const normalized = value.trim();
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(normalized)) {
    throw new Error("INVALID_SECRET_ID");
  }
  return normalized as SecretId;
};

export const customProviderSecretId = (providerId: string): SecretId => {
  const normalized = providerId.trim();
  if (!/^[A-Za-z0-9_-]+$/.test(normalized)) {
    throw new Error("INVALID_CUSTOM_PROVIDER_ID");
  }
  return secretId(`provider.openai-compatible.${normalized.toLowerCase()}.api-key`);
};
