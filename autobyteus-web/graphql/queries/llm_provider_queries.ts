import gql from 'graphql-tag';

export const GET_LLM_PROVIDER_API_KEY_CONFIGURED = gql`
  query GetLLMProviderApiKeyConfigured($providerId: String!) {
    getLlmProviderApiKeyConfigured(providerId: $providerId)
  }
`;

export const GET_AVAILABLE_LLM_PROVIDERS_WITH_MODELS = gql`
  query GetAvailableLLMProvidersWithModels($runtimeKind: String) {
    availableLlmProvidersWithModels(runtimeKind: $runtimeKind) {
      __typename
      provider {
        __typename
        id
        name
        providerType
        isCustom
        baseUrl
        apiKeyConfigured
        status
        statusMessage
      }
      models {
        __typename
        modelIdentifier
        name
        value
        canonicalName
        providerId
        providerName
        providerType
        runtime
        hostUrl
        configSchema
        maxContextTokens
        activeContextTokens
        maxInputTokens
        maxOutputTokens
      }
    }
    availableAudioProvidersWithModels(runtimeKind: $runtimeKind) {
      __typename
      provider {
        __typename
        id
        name
        providerType
        isCustom
        baseUrl
        apiKeyConfigured
        status
        statusMessage
      }
      models {
        __typename
        modelIdentifier
        name
        value
        canonicalName
        providerId
        providerName
        providerType
        runtime
        hostUrl
      }
    }
    availableImageProvidersWithModels(runtimeKind: $runtimeKind) {
      __typename
      provider {
        __typename
        id
        name
        providerType
        isCustom
        baseUrl
        apiKeyConfigured
        status
        statusMessage
      }
      models {
        __typename
        modelIdentifier
        name
        value
        canonicalName
        providerId
        providerName
        providerType
        runtime
        hostUrl
      }
    }
  }
`;

export const GET_GEMINI_SETUP_CONFIG = gql`
  query GetGeminiSetupConfig {
    getGeminiSetupConfig {
      mode
      geminiApiKeyConfigured
      vertexApiKeyConfigured
      vertexProject
      vertexLocation
    }
  }
`;
