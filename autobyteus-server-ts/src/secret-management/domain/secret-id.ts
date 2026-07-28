export type SecretId = string & { readonly __brand: "SecretId" };

export type SecretCredentialSlot =
  | "apiKey"
  | "geminiAiStudioApiKey"
  | "geminiVertexExpressApiKey";

export type SecretConsumerIdentity =
  | { kind: "llm"; providerId: string; credentialSlot: SecretCredentialSlot }
  | { kind: "llmMetadata"; providerId: string; credentialSlot: SecretCredentialSlot }
  | {
      kind: "modelDiscovery";
      modelKind: "llm" | "audio" | "image";
      providerId: "AUTOBYTEUS";
      credentialSlot: "apiKey";
    }
  | { kind: "search"; providerId: string; credentialSlot: "apiKey" }
  | {
      kind: "media";
      mediaKind: "audio" | "image" | "video";
      providerId: string;
      credentialSlot: SecretCredentialSlot;
    }
  | {
      kind: "agentRuntime";
      runtimeKind: "claude_agent_sdk";
      credentialSlot: "apiKey";
    };

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

export const serializeSecretConsumerIdentity = (consumer: SecretConsumerIdentity): string => {
  switch (consumer.kind) {
    case "media":
      return `${consumer.kind}:${consumer.mediaKind}:${consumer.providerId}:${consumer.credentialSlot}`;
    case "agentRuntime":
      return `${consumer.kind}:${consumer.runtimeKind}:${consumer.credentialSlot}`;
    case "modelDiscovery":
      return `${consumer.kind}:${consumer.modelKind}:${consumer.providerId}:${consumer.credentialSlot}`;
    default:
      return `${consumer.kind}:${consumer.providerId}:${consumer.credentialSlot}`;
  }
};
