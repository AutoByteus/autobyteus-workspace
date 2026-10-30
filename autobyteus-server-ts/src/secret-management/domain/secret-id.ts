import type { ProviderApiKeySlot } from "autobyteus-ts/secrets/provider-api-key-resolver.js";
import type { SecretId } from "autobyteus-ts/secrets/vault/secret-id.js";

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
    }
  /** An MCP server value stored as a vault entry (`mcp.<uuid>`); its owner and field live in `mcps.json`. */
  | { kind: "mcpServer"; vaultSecretId: SecretId }
  /** An integration's credential (the credential proxy adds it to a run's outbound calls). */
  | { kind: "integration"; integrationId: IntegrationId };

/** The integrations the app defines (the credential proxy's app-owned definitions). */
export type IntegrationId = "github";

export const serializeSecretConsumerIdentity = (consumer: SecretConsumerIdentity): string => {
  switch (consumer.kind) {
    case "media":
      return `${consumer.kind}:${consumer.mediaKind}:${consumer.providerId}:${consumer.credentialSlot}`;
    case "agentRuntime":
      return `${consumer.kind}:${consumer.runtimeKind}:${consumer.credentialSlot}`;
    case "mcpServer":
      return `${consumer.kind}:${consumer.vaultSecretId}`;
    case "integration":
      return `${consumer.kind}:${consumer.integrationId}`;
    default:
      return `${consumer.kind}:${consumer.providerId}:${consumer.credentialSlot}`;
  }
};
