import { gql } from 'graphql-tag'

const AgentTeamDefinitionMutationFields = gql`
  fragment AgentTeamDefinitionMutationFields on AgentTeamDefinition {
    __typename
    id
    name
    description
    instructions
    category
    avatarUrl
    coordinatorMemberName
    revision
    handoffs { from to rules }
    ownershipScope
    ownerApplicationId
    ownerApplicationName
    ownerPackageId
    ownerLocalApplicationId
    defaultLaunchConfig {
      llmModelIdentifier
      runtimeKind
      llmConfig
    }
    nodes {
      __typename
      memberName
      ref
      refScope
    }
  }
`

export const CreateAgentTeamDefinition = gql`
  mutation CreateAgentTeamDefinition($input: CreateAgentTeamDefinitionInput!) {
    createAgentTeamDefinition(input: $input) {
      ...AgentTeamDefinitionMutationFields
    }
  }
  ${AgentTeamDefinitionMutationFields}
`

export const UpdateAgentTeamDefinition = gql`
  mutation UpdateAgentTeamDefinition($input: UpdateAgentTeamDefinitionInput!) {
    updateAgentTeamDefinition(input: $input) {
      ...AgentTeamDefinitionMutationFields
    }
  }
  ${AgentTeamDefinitionMutationFields}
`

export const DeleteAgentTeamDefinition = gql`
  mutation DeleteAgentTeamDefinition($id: String!) {
    deleteAgentTeamDefinition(id: $id) {
      __typename
      success
      message
    }
  }
`

export const RefreshAgentTeamDefinitionCatalog = gql`
  mutation RefreshAgentTeamDefinitionCatalog {
    refreshAgentTeamDefinitionCatalog
  }
`
