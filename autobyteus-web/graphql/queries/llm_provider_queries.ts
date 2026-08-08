import gql from 'graphql-tag'

export const GET_PROVIDER_SETTINGS = gql`
  query GetProviderSettings($runtimeKind: String) {
    providerSettings(runtimeKind: $runtimeKind) {
      provider {
        id
        name
        providerType
        isCustom
        baseUrl
        apiKeyConfigured
        status
        statusMessage
      }
      llmModels { modelIdentifier name providerType }
      audioModels { modelIdentifier name providerType }
      imageModels { modelIdentifier name providerType }
      videoModels { modelIdentifier name providerType }
    }
  }
`

export const GET_AVAILABLE_LLM_PROVIDERS_WITH_MODELS = gql`
  query GetAvailableLLMProvidersWithModels($runtimeKind: String) {
    availableLlmProvidersWithModels(runtimeKind: $runtimeKind) {
      provider {
        id
        name
        providerType
        isCustom
        baseUrl
        status
        statusMessage
      }
      models {
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
        metadataProvenance
      }
    }
    availableAudioProvidersWithModels(runtimeKind: $runtimeKind) {
      provider {
        id
        name
        providerType
        isCustom
        baseUrl
        status
        statusMessage
      }
      models {
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
      provider {
        id
        name
        providerType
        isCustom
        baseUrl
        status
        statusMessage
      }
      models {
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
      provider {
        id
        name
        providerType
        isCustom
        baseUrl
        status
        statusMessage
      }
      models {
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
`

export const GET_GEMINI_SETUP_CONFIG = gql`
  query GetGeminiSetupConfig {
    getGeminiSetupConfig {
      activeMode
      aiStudioConfigured
      vertexExpressConfigured
      vertexProject {
        project
        location
      }
    }
  }
`

export const GET_QWEN_SETUP_STATUS = gql`
  query GetQwenSetupStatus {
    qwenSetupStatus {
      effectiveBaseUrl
      endpointSource
      apiKeyConfigured
    }
  }
`
