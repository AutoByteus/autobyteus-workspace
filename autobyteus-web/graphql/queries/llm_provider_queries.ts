import gql from 'graphql-tag';

export const GET_LLM_PROVIDER_API_KEY = gql`
  query GetLLMProviderApiKey($provider: String!) {
    getLlmProviderApiKey(provider: $provider)
  }
`;

export const GET_AVAILABLE_LLM_PROVIDERS_WITH_MODELS = gql`
  query GetAvailableLLMProvidersWithModels($runtimeKind: String) {
    availableLlmProvidersWithModels(runtimeKind: $runtimeKind) {
      __typename
      provider
      models {
        __typename
        modelIdentifier
        name
        value
        canonicalName
        provider
        runtime
        hostUrl
        configSchema
      }
    }
    availableAudioProvidersWithModels(runtimeKind: $runtimeKind) {
      __typename
      provider
      models {
        __typename
        modelIdentifier
        name
        value
        canonicalName
        provider
        runtime
        hostUrl
      }
    }
    availableImageProvidersWithModels(runtimeKind: $runtimeKind) {
      __typename
      provider
      models {
        __typename
        modelIdentifier
        name
        value
        canonicalName
        provider
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
