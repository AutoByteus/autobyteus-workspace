import gql from 'graphql-tag'

export const RemoteCollaborationCapabilityFields = gql`
  fragment RemoteCollaborationCapabilityFields on RemoteCollaborationCapabilityGql {
    enabled
    settingKey
    source
  }
`

export const PeerNodeFields = gql`
  fragment PeerNodeFields on PeerNodeGql {
    nodeId
    name
    baseUrl
    addedAt
  }
`

export const PublishedAgentFields = gql`
  fragment PublishedAgentFields on PublishedAgentGql {
    agentDefinitionId
    definitionName
    address
    runtimeKind
    llmModelIdentifier
    llmConfig
    workspaceRootPath
    autoExecuteTools
    publishedAt
  }
`

export const GetRemoteCollaborationCapability = gql`
  query GetRemoteCollaborationCapability {
    remoteCollaborationCapability {
      ...RemoteCollaborationCapabilityFields
    }
  }
  ${RemoteCollaborationCapabilityFields}
`

export const GetRemoteCollaborationSettings = gql`
  query GetRemoteCollaborationSettings {
    peerNodes {
      ...PeerNodeFields
    }
    publishedAgents {
      ...PublishedAgentFields
    }
  }
  ${PeerNodeFields}
  ${PublishedAgentFields}
`
