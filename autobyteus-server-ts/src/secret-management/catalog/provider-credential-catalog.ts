import type { SecretConsumerIdentity, SecretId } from "../domain/secret-id.js";
import {
  customProviderSecretId,
  secretId,
  serializeSecretConsumerIdentity,
} from "../domain/secret-id.js";

const API_KEY_BINDINGS: Readonly<Record<string, string>> = Object.freeze({
  OPENAI: "provider.openai.api-key",
  ANTHROPIC: "provider.anthropic.api-key",
  MISTRAL: "provider.mistral.api-key",
  DEEPSEEK: "provider.deepseek.api-key",
  GROK: "provider.grok.api-key",
  KIMI: "provider.kimi.api-key",
  QWEN: "provider.qwen.api-key",
  GLM: "provider.glm.api-key",
  MINIMAX: "provider.minimax.api-key",
  LMSTUDIO: "provider.lmstudio.api-key",
  AUTOBYTEUS: "provider.autobyteus.api-key",
});

const SEARCH_BINDINGS: Readonly<Record<string, string>> = Object.freeze({
  serper: "search.serper.api-key",
  serpapi: "search.serpapi.api-key",
  vertex_ai_search: "search.vertex-ai.api-key",
});

export class ProviderCredentialCatalog {
  resolve(consumer: SecretConsumerIdentity): SecretId {
    if (consumer.kind === "agentRuntime") {
      if (consumer.runtimeKind === "claude_agent_sdk" && consumer.credentialSlot === "apiKey") {
        return secretId("provider.anthropic.api-key");
      }
      throw new Error("SECRET_CONSUMER_NOT_AUTHORIZED");
    }
    if (consumer.kind === "search") {
      const mapped = SEARCH_BINDINGS[consumer.providerId.toLowerCase()];
      if (!mapped) throw new Error("SECRET_CONSUMER_NOT_AUTHORIZED");
      return secretId(mapped);
    }
    if (consumer.kind === "modelDiscovery") {
      if (
        ["llm", "audio", "image"].includes(consumer.modelKind)
        && consumer.providerId === "AUTOBYTEUS"
        && consumer.credentialSlot === "apiKey"
      ) {
        return secretId("provider.autobyteus.api-key");
      }
      throw new Error("SECRET_CONSUMER_NOT_AUTHORIZED");
    }

    const providerId = consumer.providerId.trim();
    if (providerId.startsWith("provider_") && consumer.credentialSlot === "apiKey") {
      if (consumer.kind !== "llm" && consumer.kind !== "llmMetadata") {
        throw new Error("SECRET_CONSUMER_NOT_AUTHORIZED");
      }
      return customProviderSecretId(providerId);
    }
    if (providerId.toUpperCase() === "GEMINI") {
      if (consumer.credentialSlot === "geminiAiStudioApiKey") {
        return secretId("provider.google.ai-studio.api-key");
      }
      if (consumer.credentialSlot === "geminiVertexExpressApiKey") {
        return secretId("provider.google.vertex-express.api-key");
      }
      throw new Error("SECRET_CONSUMER_NOT_AUTHORIZED");
    }

    const mapped = API_KEY_BINDINGS[providerId.toUpperCase()];
    if (!mapped || consumer.credentialSlot !== "apiKey") {
      throw new Error("SECRET_CONSUMER_NOT_AUTHORIZED");
    }
    if (consumer.kind === "media") {
      const normalized = providerId.toUpperCase();
      const allowed = normalized === "OPENAI"
        || (normalized === "AUTOBYTEUS" && consumer.mediaKind !== "video");
      if (!allowed) throw new Error("SECRET_CONSUMER_NOT_AUTHORIZED");
    }
    return secretId(mapped);
  }

  isKnownSecretId(value: SecretId): boolean {
    const candidate = String(value);
    return Object.values(API_KEY_BINDINGS).includes(candidate)
      || Object.values(SEARCH_BINDINGS).includes(candidate)
      || candidate === "provider.google.ai-studio.api-key"
      || candidate === "provider.google.vertex-express.api-key"
      || /^provider\.openai-compatible\.[a-z0-9_-]+\.api-key$/.test(candidate);
  }

  describeBinding(consumer: SecretConsumerIdentity): { key: string; secretId: SecretId } {
    return { key: serializeSecretConsumerIdentity(consumer), secretId: this.resolve(consumer) };
  }
}

export const providerCredentialCatalog = new ProviderCredentialCatalog();
