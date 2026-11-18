import { gql } from 'graphql-tag'

/** One card's fields. Never a token. */
export const INTEGRATION_FIELDS = gql`
  fragment IntegrationFields on IntegrationView {
    id
    name
    description
    iconDataUrl
    state
    login
    connectedAt
    tokenHelp
    skillName
    source {
      sourceId
      kind
      label
    }
    tools {
      tool
      found
    }
  }
`

export const INTEGRATION_SOURCE_FIELDS = gql`
  fragment IntegrationSourceFields on IntegrationSourceView {
    sourceId
    kind
    label
    location
    skillCount
    integrationIds
    integrationNames
    github {
      status
      repositoryUrl
      defaultBranch
      installedRevision
      latestRevision
    }
  }
`

export const GET_INTEGRATIONS = gql`
  query GetIntegrations {
    integrations {
      ...IntegrationFields
    }
  }
  ${INTEGRATION_FIELDS}
`

export const GET_INTEGRATION_SOURCES = gql`
  query GetIntegrationSources {
    integrationSources {
      ...IntegrationSourceFields
    }
  }
  ${INTEGRATION_SOURCE_FIELDS}
`
