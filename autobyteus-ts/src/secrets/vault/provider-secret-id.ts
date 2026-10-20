import type { ProviderApiKeySlot } from "../provider-api-key-resolver.js";
import { customProviderSecretId, secretId, type SecretId } from "./secret-id.js";
import { SecretVaultError } from "./secret-vault-types.js";

/*
 * Provider-key naming: which vault entry holds a provider's key. Pure naming,
 * no authorization: the AutoByteus server decides which consumers may read
 * which entry (its `ProviderCredentialCatalog`, built on this mapping).
 */

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
});

const GEMINI_AI_STUDIO_SECRET_ID = "provider.google.ai-studio.api-key";
const GEMINI_VERTEX_EXPRESS_SECRET_ID = "provider.google.vertex-express.api-key";

/** Every fixed provider-key entry name (custom OpenAI-compatible providers are open-ended). */
export const FIXED_PROVIDER_SECRET_IDS: readonly string[] = Object.freeze([
  ...Object.values(API_KEY_BINDINGS),
  GEMINI_AI_STUDIO_SECRET_ID,
  GEMINI_VERTEX_EXPRESS_SECRET_ID,
]);

/** True for a custom OpenAI-compatible provider ID (`provider_…`) and its API-key slot. */
export const isCustomProviderSlot = (providerId: string, slot: ProviderApiKeySlot): boolean =>
  providerId.trim().startsWith("provider_") && slot === "apiKey";

/**
 * The vault entry holding `providerId`'s key for `slot`. An unknown provider or
 * slot throws `SecretVaultError` with `SECRET_PROVIDER_UNKNOWN`.
 */
export const providerSecretId = (providerId: string, slot: ProviderApiKeySlot = "apiKey"): SecretId => {
  const normalized = providerId.trim();
  if (isCustomProviderSlot(normalized, slot)) return customProviderSecretId(normalized);
  if (normalized.toUpperCase() === "GEMINI") {
    if (slot === "geminiAiStudioApiKey") return secretId(GEMINI_AI_STUDIO_SECRET_ID);
    if (slot === "geminiVertexExpressApiKey") return secretId(GEMINI_VERTEX_EXPRESS_SECRET_ID);
  } else {
    const mapped = API_KEY_BINDINGS[normalized.toUpperCase()];
    if (mapped && slot === "apiKey") return secretId(mapped);
  }
  throw new SecretVaultError("PROVIDER_UNKNOWN", false, "SECRET_PROVIDER_UNKNOWN", {
    detail: `no vault entry for provider ${providerId} (slot ${slot})`,
  });
};
