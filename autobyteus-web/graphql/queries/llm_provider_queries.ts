import gql from 'graphql-tag';

export const GET_LLM_PROVIDER_CREDENTIAL_STATUS = gql`
  query GetLLMProviderCredentialStatus($providerId: String!) {
    getLlmProviderCredentialStatus(providerId: $providerId) {
      backendHealth
      storageState
      lifecycle
      instructionCode
    }
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
        credentialStatus {
          backendHealth
          storageState
          lifecycle
          instructionCode
        }
        status
        statusMessage
      }
      models {
        __typename
        modelIdentifier
        name
        description
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
        credentialStatus {
          backendHealth
          storageState
          lifecycle
          instructionCode
        }
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
        credentialStatus {
          backendHealth
          storageState
          lifecycle
          instructionCode
        }
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
    availableVideoProvidersWithModels(runtimeKind: $runtimeKind) {
      __typename
      provider {
        __typename
        id
        name
        providerType
        isCustom
        baseUrl
        credentialStatus {
          backendHealth
          storageState
          lifecycle
          instructionCode
        }
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
      geminiCredentialStatus {
        backendHealth
        storageState
        lifecycle
        instructionCode
      }
      vertexCredentialStatus {
        backendHealth
        storageState
        lifecycle
        instructionCode
      }
      vertexProject
      vertexLocation
    }
  }
`;
