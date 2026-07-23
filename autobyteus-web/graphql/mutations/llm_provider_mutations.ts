import gql from 'graphql-tag';

export const SET_LLM_PROVIDER_API_KEY = gql`
  mutation SetLLMProviderApiKey($providerId: String!, $apiKey: String!) {
    setLlmProviderApiKey(providerId: $providerId, apiKey: $apiKey)
  }
`;

export const REMOVE_LLM_PROVIDER_API_KEY = gql`
  mutation RemoveLLMProviderApiKey($providerId: String!) {
    removeLlmProviderApiKey(providerId: $providerId)
  }
`;

export const RELOAD_LLM_MODELS = gql`
  mutation ReloadLLMModels($runtimeKind: String) {
    reloadLlmModels(runtimeKind: $runtimeKind)
  }
`;

export const RELOAD_LLM_PROVIDER_MODELS = gql`
  mutation ReloadLLMProviderModels($providerId: String!, $runtimeKind: String) {
    reloadLlmProviderModels(providerId: $providerId, runtimeKind: $runtimeKind)
  }
`;

export const PROBE_CUSTOM_LLM_PROVIDER = gql`
  mutation ProbeCustomLlmProvider($input: CustomLlmProviderInputObject!) {
    probeCustomLlmProvider(input: $input) {
      name
      providerType
      baseUrl
      discoveredModels {
        id
        name
      }
    }
  }
`;

export const CREATE_CUSTOM_LLM_PROVIDER = gql`
  mutation CreateCustomLlmProvider($input: CustomLlmProviderInputObject!, $runtimeKind: String) {
    createCustomLlmProvider(input: $input, runtimeKind: $runtimeKind) {
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
  }
`;

export const DELETE_CUSTOM_LLM_PROVIDER = gql`
  mutation DeleteCustomLlmProvider($providerId: String!, $runtimeKind: String) {
    deleteCustomLlmProvider(providerId: $providerId, runtimeKind: $runtimeKind)
  }
`;

export const SAVE_GEMINI_CONFIGURATION_OPTION = gql`
  mutation SaveGeminiConfigurationOption(
    $option: GeminiConfigurationOption!
    $geminiApiKey: String
    $vertexApiKey: String
    $vertexProject: String
    $vertexLocation: String
  ) {
    saveGeminiConfigurationOption(
      option: $option
      geminiApiKey: $geminiApiKey
      vertexApiKey: $vertexApiKey
      vertexProject: $vertexProject
      vertexLocation: $vertexLocation
    ) {
      operation
      option
      effectiveMode
    }
  }
`;

export const REMOVE_GEMINI_CONFIGURATION_OPTION = gql`
  mutation RemoveGeminiConfigurationOption($option: GeminiConfigurationOption!) {
    removeGeminiConfigurationOption(option: $option) {
      operation
      option
      effectiveMode
    }
  }
`;
