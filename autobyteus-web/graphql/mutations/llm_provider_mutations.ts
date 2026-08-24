import gql from 'graphql-tag'
import { PROVIDER_MODEL_CATALOG_SNAPSHOT_FIELDS } from '../queries/llm_provider_queries'

const CREDENTIAL_SETTING_FIELDS = gql`
  fragment CredentialSettingFields on ProviderCredentialSettingObject {
    provider { id name providerType isCustom baseUrl catalogMode }
    apiKeyConfigured
  }
`

const GEMINI_COMMAND_FIELDS = gql`
  fragment GeminiCommandFields on GeminiConfigurationCommandResult {
    setup {
      activeMode
      aiStudioConfigured
      vertexExpressConfigured
      vertexProject { project location }
    }
    credentialSetting { ...CredentialSettingFields }
  }
  ${CREDENTIAL_SETTING_FIELDS}
`

export const SAVE_PROVIDER_API_KEY = gql`
  mutation SaveProviderApiKey($providerId: String!, $apiKey: String!) {
    saveProviderApiKey(providerId: $providerId, apiKey: $apiKey) {
      ...CredentialSettingFields
    }
  }
  ${CREDENTIAL_SETTING_FIELDS}
`

export const SAVE_QWEN_CONFIGURATION = gql`
  mutation SaveQwenConfiguration($input: QwenConfigurationInput!) {
    saveQwenConfiguration(input: $input) {
      setup { effectiveBaseUrl endpointSource }
      credentialSetting { ...CredentialSettingFields }
    }
  }
  ${CREDENTIAL_SETTING_FIELDS}
`

export const ENSURE_PROVIDER_MODEL_CATALOG = gql`
  mutation EnsureProviderModelCatalog($providerId: String!, $runtimeKind: String) {
    ensureProviderModelCatalog(providerId: $providerId, runtimeKind: $runtimeKind) {
      ...ProviderModelCatalogSnapshotFields
    }
  }
  ${PROVIDER_MODEL_CATALOG_SNAPSHOT_FIELDS}
`

export const RELOAD_PROVIDER_MODEL_CATALOG = gql`
  mutation ReloadProviderModelCatalog($providerId: String!, $runtimeKind: String) {
    reloadProviderModelCatalog(providerId: $providerId, runtimeKind: $runtimeKind) {
      ...ProviderModelCatalogSnapshotFields
    }
  }
  ${PROVIDER_MODEL_CATALOG_SNAPSHOT_FIELDS}
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
    createCustomProvider(input: $input) { ...CredentialSettingFields }
  }
  ${CREDENTIAL_SETTING_FIELDS}
`

export const DELETE_CUSTOM_PROVIDER = gql`
  mutation DeleteCustomProvider($providerId: String!) {
    deleteCustomProvider(providerId: $providerId) { providerId deleted }
  }
`

export const SAVE_GEMINI_AI_STUDIO = gql`
  mutation SaveGeminiAiStudio($apiKey: String!, $activateAfterSave: Boolean!) {
    saveGeminiAiStudio(apiKey: $apiKey, activateAfterSave: $activateAfterSave) {
      ...GeminiCommandFields
    }
  }
  ${GEMINI_COMMAND_FIELDS}
`

export const SAVE_GEMINI_VERTEX_EXPRESS = gql`
  mutation SaveGeminiVertexExpress($apiKey: String!, $activateAfterSave: Boolean!) {
    saveGeminiVertexExpress(apiKey: $apiKey, activateAfterSave: $activateAfterSave) {
      ...GeminiCommandFields
    }
  }
  ${GEMINI_COMMAND_FIELDS}
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
    ) { ...GeminiCommandFields }
  }
  ${GEMINI_COMMAND_FIELDS}
`

export const USE_GEMINI_MODE = gql`
  mutation UseGeminiMode($mode: GeminiSetupMode!) {
    useGeminiMode(mode: $mode) { ...GeminiCommandFields }
  }
  ${GEMINI_COMMAND_FIELDS}
`
