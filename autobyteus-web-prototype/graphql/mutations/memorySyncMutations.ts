import { gql } from 'graphql-tag'

const MEMORY_SYNC_STATUS_FIELDS = gql`
  fragment MemorySyncStatusFields on MemorySyncStatusGql {
    hub {
      enabled
      advertisedHubBaseUrl
      updatedAt
    }
    source {
      enabled
      sourceNodeId
      displayName
      hubBaseUrl
      hubTokenConfigured
      hubTokenPreview
      backgroundEnabled
      intervalMs
      batchSize
      updatedAt
    }
    connectionInfo {
      hubEnabled
      advertisedHubBaseUrl
      ingestEndpointUrl
      healthEndpointUrl
      secureTransportWarning
      credentials {
        credentialId
        label
        boundSourceNodeId
        createdAt
        lastUsedAt
        revokedAt
        status
      }
    }
    sourceState {
      jobState
      lastSuccessfulSyncAt
      lastError
      trackedFileCount
    }
    imports {
      sourceNodeId
      displayName
      lastKnownEndpoint
      firstImportedAt
      lastImportedAt
      lastSyncStatus
      lastError
      fileCount
      totalBytes
      lastCommittedBatchId
      lastCommittedAt
    }
    oneTimePlaintextToken
  }
`

export const UPDATE_MEMORY_HUB_CONFIG = gql`
  ${MEMORY_SYNC_STATUS_FIELDS}
  mutation UpdateMemoryHubConfig($input: UpdateMemoryHubConfigInput!) {
    updateMemoryHubConfig(input: $input) {
      ...MemorySyncStatusFields
    }
  }
`

export const UPDATE_MEMORY_SYNC_SOURCE_CONFIG = gql`
  ${MEMORY_SYNC_STATUS_FIELDS}
  mutation UpdateMemorySyncSourceConfig($input: UpdateMemorySyncSourceConfigInput!) {
    updateMemorySyncSourceConfig(input: $input) {
      ...MemorySyncStatusFields
    }
  }
`

export const CREATE_MEMORY_HUB_SOURCE_CREDENTIAL = gql`
  mutation CreateMemoryHubSourceCredential($input: CreateMemoryHubCredentialInput) {
    createMemoryHubSourceCredential(input: $input) {
      plaintextToken
      credential {
        credentialId
        label
        boundSourceNodeId
        createdAt
        lastUsedAt
        revokedAt
        status
      }
    }
  }
`

export const REGENERATE_MEMORY_HUB_SOURCE_CREDENTIAL = gql`
  mutation RegenerateMemoryHubSourceCredential($credentialId: String!) {
    regenerateMemoryHubSourceCredential(credentialId: $credentialId) {
      plaintextToken
      credential {
        credentialId
        label
        boundSourceNodeId
        createdAt
        lastUsedAt
        revokedAt
        status
      }
    }
  }
`

export const REVOKE_MEMORY_HUB_SOURCE_CREDENTIAL = gql`
  mutation RevokeMemoryHubSourceCredential($credentialId: String!) {
    revokeMemoryHubSourceCredential(credentialId: $credentialId) {
      credentialId
      label
      boundSourceNodeId
      createdAt
      lastUsedAt
      revokedAt
      status
    }
  }
`

export const TEST_MEMORY_HUB_CONNECTION = gql`
  mutation TestMemoryHubConnection($input: TestMemoryHubConnectionInput!) {
    testMemoryHubConnection(input: $input) {
      ok
      hubEnabled
      sourceNodeId
      authenticated
      message
    }
  }
`

export const START_MEMORY_SYNC = gql`
  mutation StartMemorySync {
    startMemorySync {
      startedAt
      finishedAt
      scannedFiles
      changedFiles
      unchangedFiles
      deferredFiles
      committedBatches
      duplicateBatches
    }
  }
`
