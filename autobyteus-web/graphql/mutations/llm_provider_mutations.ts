import gql from 'graphql-tag';

export const SET_LLM_PROVIDER_API_KEY = gql`
  mutation SetLLMProviderApiKey($providerId: String!, $apiKey: String!) {
    setLlmProviderApiKey(providerId: $providerId, apiKey: $apiKey)
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
      apiKeyConfigured
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

export const SET_GEMINI_SETUP_CONFIG = gql`
  mutation SetGeminiSetupConfig(
    $mode: String!
    $geminiApiKey: String
    $vertexApiKey: String
    $vertexProject: String
    $vertexLocation: String
  ) {
    setGeminiSetupConfig(
      mode: $mode
      geminiApiKey: $geminiApiKey
      vertexApiKey: $vertexApiKey
      vertexProject: $vertexProject
      vertexLocation: $vertexLocation
    )
  }
`;
