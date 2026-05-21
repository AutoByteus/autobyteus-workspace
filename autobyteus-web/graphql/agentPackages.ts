import gql from 'graphql-tag'

export const AGENT_PACKAGE_FIELDS = gql`
  fragment AgentPackageFields on AgentPackage {
    packageId
    displayName
    path
    sourceKind
    source
    sharedAgentCount
    teamLocalAgentCount
    agentTeamCount
    applicationCount
    isDefault
    isRemovable
    updateInfo {
      status
      canCheck
      canUpdate
      canReload
      message
      installedRevision
      latestRevision
      checkedAt
      lastError
    }
  }
`

export const GET_AGENT_PACKAGES = gql`
  ${AGENT_PACKAGE_FIELDS}
  query GetAgentPackages {
    agentPackages {
      ...AgentPackageFields
    }
  }
`

export const IMPORT_AGENT_PACKAGE = gql`
  ${AGENT_PACKAGE_FIELDS}
  mutation ImportAgentPackage($input: ImportAgentPackageInput!) {
    importAgentPackage(input: $input) {
      ...AgentPackageFields
    }
  }
`

export const REMOVE_AGENT_PACKAGE = gql`
  ${AGENT_PACKAGE_FIELDS}
  mutation RemoveAgentPackage($packageId: String!) {
    removeAgentPackage(packageId: $packageId) {
      ...AgentPackageFields
    }
  }
`

export const RELOAD_AGENT_PACKAGE = gql`
  ${AGENT_PACKAGE_FIELDS}
  mutation ReloadAgentPackage($packageId: String!) {
    reloadAgentPackage(packageId: $packageId) {
      ...AgentPackageFields
    }
  }
`

export const CHECK_AGENT_PACKAGE_UPDATES = gql`
  ${AGENT_PACKAGE_FIELDS}
  mutation CheckAgentPackageUpdates($packageIds: [String!]) {
    checkAgentPackageUpdates(packageIds: $packageIds) {
      ...AgentPackageFields
    }
  }
`

export const UPDATE_AGENT_PACKAGE = gql`
  ${AGENT_PACKAGE_FIELDS}
  mutation UpdateAgentPackage($packageId: String!) {
    updateAgentPackage(packageId: $packageId) {
      ...AgentPackageFields
    }
  }
`
