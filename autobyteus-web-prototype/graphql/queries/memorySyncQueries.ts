import { gql } from 'graphql-tag'

export const GET_MEMORY_SYNC_STATUS = gql`
  query GetMemorySyncStatus {
    getMemorySyncStatus {
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
  }
`

export const LIST_MEMORY_HUB_URL_CANDIDATES = gql`
  query ListMemoryHubUrlCandidates($currentNodeBaseUrl: String, $manualBaseUrl: String) {
    listMemoryHubUrlCandidates(currentNodeBaseUrl: $currentNodeBaseUrl, manualBaseUrl: $manualBaseUrl) {
      id
      kind
      label
      baseUrl
      source
    }
  }
`

export const GET_MEMORY_HUB_CONNECTION_INFO = gql`
  query GetMemoryHubConnectionInfo {
    getMemoryHubConnectionInfo {
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
  }
`
