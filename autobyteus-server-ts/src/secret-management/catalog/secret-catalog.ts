import type { SecretDefinitionId, SecretConsumerIdentity } from '../domain/secret-binding.js';
import {
  customProviderSecretDefinitionId,
  secretDefinitionId,
  serializeSecretConsumerIdentity,
} from '../domain/secret-binding.js';

const API_KEY_BINDINGS: Record<string, string> = {
  OPENAI: 'provider.openai.api-key',
  ANTHROPIC: 'provider.anthropic.api-key',
  MISTRAL: 'provider.mistral.api-key',
  DEEPSEEK: 'provider.deepseek.api-key',
  GROK: 'provider.grok.api-key',
  KIMI: 'provider.kimi.api-key',
  QWEN: 'provider.qwen.api-key',
  GLM: 'provider.glm.api-key',
  MINIMAX: 'provider.minimax.api-key',
  LMSTUDIO: 'provider.lmstudio.api-key',
};

const SEARCH_BINDINGS: Record<string, string> = {
  serper: 'search.serper.api-key',
  serpapi: 'search.serpapi.api-key',
  vertex_ai_search: 'search.vertex-ai.api-key',
};

const asDefinition = (value: string): SecretDefinitionId => secretDefinitionId(value);

export class SecretCatalog {
  resolve(consumer: SecretConsumerIdentity): SecretDefinitionId {
    if (consumer.kind === 'agentRuntime') {
      if (consumer.runtimeKind === 'claude_agent_sdk' && consumer.credentialSlot === 'apiKey') {
        return asDefinition('provider.anthropic.api-key');
      }
      throw new Error('SECRET_CONSUMER_NOT_AUTHORIZED');
    }

    if (consumer.kind === 'search') {
      const definition = SEARCH_BINDINGS[consumer.providerId.toLowerCase()];
      if (!definition) throw new Error('SECRET_CONSUMER_NOT_AUTHORIZED');
      return asDefinition(definition);
    }

    const providerId = consumer.providerId.trim();
    if (providerId.startsWith('provider_') && consumer.credentialSlot === 'apiKey') {
      if (consumer.kind !== 'llm' && consumer.kind !== 'llmMetadata') {
        throw new Error('SECRET_CONSUMER_NOT_AUTHORIZED');
      }
      return customProviderSecretDefinitionId(providerId);
    }

    if (providerId.toUpperCase() === 'GEMINI') {
      if (consumer.credentialSlot === 'geminiAiStudioApiKey') {
        return asDefinition('provider.gemini.ai-studio-api-key');
      }
      if (consumer.credentialSlot === 'geminiVertexExpressApiKey') {
        return asDefinition('provider.google.vertex-express-api-key');
      }
      throw new Error('SECRET_CONSUMER_NOT_AUTHORIZED');
    }

    const definition = API_KEY_BINDINGS[providerId.toUpperCase()];
    if (!definition || consumer.credentialSlot !== 'apiKey') {
      throw new Error('SECRET_CONSUMER_NOT_AUTHORIZED');
    }

    if (consumer.kind === 'media') {
      const mediaAllowed = providerId.toUpperCase() === 'OPENAI';
      if (!mediaAllowed) throw new Error('SECRET_CONSUMER_NOT_AUTHORIZED');
    }

    return asDefinition(definition);
  }

  isKnownDefinition(definitionId: SecretDefinitionId): boolean {
    const value = String(definitionId);
    return Object.values(API_KEY_BINDINGS).includes(value)
      || Object.values(SEARCH_BINDINGS).includes(value)
      || value === 'provider.gemini.ai-studio-api-key'
      || value === 'provider.google.vertex-express-api-key'
      || /^provider\.openai-compatible\.[a-z0-9_-]+\.api-key$/.test(value);
  }

  describeBinding(consumer: SecretConsumerIdentity): { key: string; definitionId: SecretDefinitionId } {
    return { key: serializeSecretConsumerIdentity(consumer), definitionId: this.resolve(consumer) };
  }
}

export const defaultSecretCatalog = new SecretCatalog();
