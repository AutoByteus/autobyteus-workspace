import gql from 'graphql-tag'

export const GET_PROVIDER_CREDENTIAL_SETTINGS = gql`
  query GetProviderCredentialSettings($runtimeKind: String) {
    providerCredentialSettings(runtimeKind: $runtimeKind) {
      provider { id name providerType isCustom baseUrl catalogMode }
      apiKeyConfigured
    }
  }
`

export const PROVIDER_MODEL_CATALOG_SNAPSHOT_FIELDS = gql`
  fragment ProviderModelCatalogSnapshotFields on ProviderModelCatalogSnapshotObject {
    runtimeKind
    ownerProvider { id name providerType isCustom baseUrl catalogMode }
    sources {
      modelKind state modelCount successfulUnitCount failedUnitCount safeMessage
    }
    llmModels {
      modelIdentifier name description value canonicalName providerId providerName providerType
      runtime hostUrl configSchema maxContextTokens activeContextTokens maxInputTokens
      maxOutputTokens metadataProvenance
    }
    audioModels { modelIdentifier name value canonicalName providerId providerName providerType runtime hostUrl }
    imageModels { modelIdentifier name description value canonicalName providerId providerName providerType runtime hostUrl }
    videoModels { modelIdentifier name value canonicalName providerId providerName providerType runtime hostUrl }
  }
`

export const GET_PROVIDER_MODEL_CATALOG_SNAPSHOTS = gql`
  query GetProviderModelCatalogSnapshots($runtimeKind: String) {
    providerModelCatalogSnapshots(runtimeKind: $runtimeKind) {
      ...ProviderModelCatalogSnapshotFields
    }
  }
  ${PROVIDER_MODEL_CATALOG_SNAPSHOT_FIELDS}
`

export const GET_GEMINI_SETUP_CONFIG = gql`
  query GetGeminiSetupConfig {
    getGeminiSetupConfig {
      activeMode aiStudioConfigured vertexExpressConfigured
      vertexProject { project location }
    }
  }
`

export const GET_QWEN_SETUP_STATUS = gql`
  query GetQwenSetupStatus {
    qwenSetupStatus { effectiveBaseUrl endpointSource }
  }
`
