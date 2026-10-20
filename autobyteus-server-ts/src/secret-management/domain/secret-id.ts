import type { ProviderApiKeySlot } from "autobyteus-ts/secrets/provider-api-key-resolver.js";

/** Who asks the server's vault for a credential; the catalog authorizes each kind. */
export type SecretConsumerIdentity =
  | { kind: "llm"; providerId: string; credentialSlot: ProviderApiKeySlot }
  | { kind: "llmMetadata"; providerId: string; credentialSlot: ProviderApiKeySlot }
  | { kind: "search"; providerId: string; credentialSlot: "apiKey" }
  | {
      kind: "media";
      mediaKind: "audio" | "image" | "video";
      providerId: string;
      credentialSlot: ProviderApiKeySlot;
    }
  | {
      kind: "agentRuntime";
      runtimeKind: "claude_agent_sdk";
      credentialSlot: "apiKey";
    };

export const serializeSecretConsumerIdentity = (consumer: SecretConsumerIdentity): string => {
  switch (consumer.kind) {
    case "media":
      return `${consumer.kind}:${consumer.mediaKind}:${consumer.providerId}:${consumer.credentialSlot}`;
    case "agentRuntime":
      return `${consumer.kind}:${consumer.runtimeKind}:${consumer.credentialSlot}`;
    default:
      return `${consumer.kind}:${consumer.providerId}:${consumer.credentialSlot}`;
  }
};
