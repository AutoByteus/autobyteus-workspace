import { gql } from 'graphql-tag'
import { INTEGRATION_FIELDS, INTEGRATION_SOURCE_FIELDS } from '~/graphql/queries/integrationsQueries'

export const IMPORT_INTEGRATIONS = gql`
  mutation ImportIntegrations($location: String!) {
    importIntegrations(location: $location) {
      ...IntegrationFields
    }
  }
  ${INTEGRATION_FIELDS}
`

export const UPDATE_INTEGRATION_SOURCE = gql`
  mutation UpdateIntegrationSource($sourceId: String!) {
    updateIntegrationSource(sourceId: $sourceId) {
      ...IntegrationSourceFields
    }
  }
  ${INTEGRATION_SOURCE_FIELDS}
`

export const REMOVE_INTEGRATION_SOURCE = gql`
  mutation RemoveIntegrationSource($sourceId: String!) {
    removeIntegrationSource(sourceId: $sourceId) {
      removedConnectionNames
    }
  }
`

export const CONNECT_INTEGRATION = gql`
  mutation ConnectIntegration($id: String!, $token: String!) {
    connectIntegration(id: $id, token: $token) {
      ...IntegrationFields
    }
  }
  ${INTEGRATION_FIELDS}
`

export const TEST_INTEGRATION = gql`
  mutation TestIntegration($id: String!) {
    testIntegration(id: $id) {
      ...IntegrationFields
    }
  }
  ${INTEGRATION_FIELDS}
`

export const DISCONNECT_INTEGRATION = gql`
  mutation DisconnectIntegration($id: String!) {
    disconnectIntegration(id: $id) {
      ...IntegrationFields
    }
  }
  ${INTEGRATION_FIELDS}
`
