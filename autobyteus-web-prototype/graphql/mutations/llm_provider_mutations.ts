import gql from 'graphql-tag'

export const SAVE_PROVIDER_API_KEY = gql`
  mutation SaveProviderApiKey($providerId: String!, $apiKey: String!) {
    saveProviderApiKey(providerId: $providerId, apiKey: $apiKey)
  }
`

export const SAVE_QWEN_CONFIGURATION = gql`
  mutation SaveQwenConfiguration($input: QwenConfigurationInput!) {
    saveQwenConfiguration(input: $input) {
      effectiveBaseUrl
      endpointSource
      apiKeyConfigured
    }
  }
`

export const RELOAD_LLM_MODELS = gql`
  mutation ReloadLLMModels($runtimeKind: String) {
    reloadLlmModels(runtimeKind: $runtimeKind)
  }
`

export const RELOAD_LLM_PROVIDER_MODELS = gql`
  mutation ReloadLLMProviderModels($providerId: String!, $runtimeKind: String) {
    reloadLlmProviderModels(providerId: $providerId, runtimeKind: $runtimeKind)
  }
`

export const PROBE_CUSTOM_PROVIDER = gql`
  mutation ProbeCustomProvider($input: CustomProviderInputObject!) {
    probeCustomProvider(input: $input) {
      discoveredModels { id name }
    }
  }
`

export const CREATE_CUSTOM_PROVIDER = gql`
  mutation CreateCustomProvider($input: CustomProviderInputObject!) {
    createCustomProvider(input: $input)
  }
`

export const DELETE_CUSTOM_PROVIDER = gql`
  mutation DeleteCustomProvider($providerId: String!) {
    deleteCustomProvider(providerId: $providerId)
  }
`

export const SAVE_GEMINI_AI_STUDIO = gql`
  mutation SaveGeminiAiStudio($apiKey: String!, $activateAfterSave: Boolean!) {
    saveGeminiAiStudio(apiKey: $apiKey, activateAfterSave: $activateAfterSave) {
      activeMode
      aiStudioConfigured
      vertexExpressConfigured
      vertexProject { project location }
    }
  }
`

export const SAVE_GEMINI_VERTEX_EXPRESS = gql`
  mutation SaveGeminiVertexExpress($apiKey: String!, $activateAfterSave: Boolean!) {
    saveGeminiVertexExpress(apiKey: $apiKey, activateAfterSave: $activateAfterSave) {
      activeMode
      aiStudioConfigured
      vertexExpressConfigured
      vertexProject { project location }
    }
  }
`

export const SAVE_GEMINI_VERTEX_PROJECT = gql`
  mutation SaveGeminiVertexProject(
    $project: String!
    $location: String!
    $activateAfterSave: Boolean!
  ) {
    saveGeminiVertexProject(
      project: $project
      location: $location
      activateAfterSave: $activateAfterSave
    ) {
      activeMode
      aiStudioConfigured
      vertexExpressConfigured
      vertexProject { project location }
    }
  }
`

export const USE_GEMINI_MODE = gql`
  mutation UseGeminiMode($mode: GeminiSetupMode!) {
    useGeminiMode(mode: $mode) {
      activeMode
      aiStudioConfigured
      vertexExpressConfigured
      vertexProject { project location }
    }
  }
`
