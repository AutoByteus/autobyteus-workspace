import {
  FIXED_PROVIDER_SECRET_IDS,
  isCustomProviderSlot,
  providerSecretId,
} from "autobyteus-ts/secrets/vault/provider-secret-id.js";
import { secretId, type SecretId } from "autobyteus-ts/secrets/vault/secret-id.js";
import type { SecretConsumerIdentity } from "../domain/secret-id.js";
import { serializeSecretConsumerIdentity } from "../domain/secret-id.js";

const SEARCH_BINDINGS: Readonly<Record<string, string>> = Object.freeze({
  serper: "search.serper.api-key",
  serpapi: "search.serpapi.api-key",
  vertex_ai_search: "search.vertex-ai.api-key",
});

const FIXED_SECRET_IDS: readonly string[] = Object.freeze([
  ...FIXED_PROVIDER_SECRET_IDS,
  ...Object.values(SEARCH_BINDINGS),
]);

const notAuthorized = (): Error => new Error("SECRET_CONSUMER_NOT_AUTHORIZED");

/**
 * The server's consumer authorization: which consumer may read which vault
 * entry. Entry names for provider keys come from autobyteus-ts
 * `providerSecretId`; the rules about consumer kinds stay here.
 */
export class ProviderCredentialCatalog {
  resolve(consumer: SecretConsumerIdentity): SecretId {
    if (consumer.kind === "agentRuntime") {
      if (consumer.runtimeKind === "claude_agent_sdk" && consumer.credentialSlot === "apiKey") {
        return secretId("provider.anthropic.api-key");
      }
      throw notAuthorized();
    }
    if (consumer.kind === "search") {
      const mapped = SEARCH_BINDINGS[consumer.providerId.toLowerCase()];
      if (!mapped) throw notAuthorized();
      return secretId(mapped);
    }

    const providerId = consumer.providerId.trim();
    let id: SecretId;
    try {
      id = providerSecretId(providerId, consumer.credentialSlot);
    } catch {
      throw notAuthorized();
    }
    if (isCustomProviderSlot(providerId, consumer.credentialSlot)) {
      if (consumer.kind !== "llm" && consumer.kind !== "llmMetadata") throw notAuthorized();
      return id;
    }
    if (
      consumer.kind === "media"
      && providerId.toUpperCase() !== "GEMINI"
      && providerId.toUpperCase() !== "OPENAI"
    ) {
      throw notAuthorized();
    }
    return id;
  }

  isKnownSecretId(value: SecretId): boolean {
    const candidate = String(value);
    return FIXED_SECRET_IDS.includes(candidate)
      || /^provider\.openai-compatible\.[a-z0-9_-]+\.api-key$/.test(candidate);
  }

  /** Every built-in secret ID, sorted (custom OpenAI-compatible provider IDs are open-ended). */
  listFixedSecretIds(): SecretId[] {
    return [...FIXED_SECRET_IDS].sort().map(secretId);
  }

  describeBinding(consumer: SecretConsumerIdentity): { key: string; secretId: SecretId } {
    return { key: serializeSecretConsumerIdentity(consumer), secretId: this.resolve(consumer) };
  }
}

export const providerCredentialCatalog = new ProviderCredentialCatalog();
