import gql from 'graphql-tag';

export const MANAGED_MESSAGING_GATEWAY_STATUS = gql`
  query ManagedMessagingGatewayStatus {
    managedMessagingGatewayStatus {
      __typename
      supported
      enabled
      lifecycleState
      message
      lastError
      activeVersion
      desiredVersion
      releaseTag
      installedVersions
      bindHost
      bindPort
      pid
      providerConfig
      providerStatusByProvider
      supportedProviders
      excludedProviders
      diagnostics
      runtimeReliabilityStatus
      runtimeRunning
    }
  }
`;

export const MANAGED_MESSAGING_GATEWAY_WECOM_ACCOUNTS = gql`
  query ManagedMessagingGatewayWeComAccounts {
    managedMessagingGatewayWeComAccounts {
      __typename
      accountId
      label
      mode
    }
  }
`;

export const MANAGED_MESSAGING_GATEWAY_PEER_CANDIDATES = gql`
  query ManagedMessagingGatewayPeerCandidates(
    $provider: String!
    $includeGroups: Boolean!
    $limit: Int!
  ) {
    managedMessagingGatewayPeerCandidates(
      provider: $provider
      includeGroups: $includeGroups
      limit: $limit
    ) {
      __typename
      accountId
      updatedAt
      items {
        __typename
        peerId
        peerType
        threadId
        displayName
        lastMessageAt
      }
    }
  }
`;
