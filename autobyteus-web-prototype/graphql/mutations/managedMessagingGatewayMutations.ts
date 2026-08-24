import gql from 'graphql-tag';

const MANAGED_MESSAGING_GATEWAY_STATUS_FIELDS = `
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
`;

export const ENABLE_MANAGED_MESSAGING_GATEWAY = gql`
  mutation EnableManagedMessagingGateway {
    enableManagedMessagingGateway {
      ${MANAGED_MESSAGING_GATEWAY_STATUS_FIELDS}
    }
  }
`;

export const DISABLE_MANAGED_MESSAGING_GATEWAY = gql`
  mutation DisableManagedMessagingGateway {
    disableManagedMessagingGateway {
      ${MANAGED_MESSAGING_GATEWAY_STATUS_FIELDS}
    }
  }
`;

export const UPDATE_MANAGED_MESSAGING_GATEWAY = gql`
  mutation UpdateManagedMessagingGateway {
    updateManagedMessagingGateway {
      ${MANAGED_MESSAGING_GATEWAY_STATUS_FIELDS}
    }
  }
`;

export const SAVE_MANAGED_MESSAGING_GATEWAY_PROVIDER_CONFIG = gql`
  mutation SaveManagedMessagingGatewayProviderConfig($input: JSONObject!) {
    saveManagedMessagingGatewayProviderConfig(input: $input) {
      ${MANAGED_MESSAGING_GATEWAY_STATUS_FIELDS}
    }
  }
`;
