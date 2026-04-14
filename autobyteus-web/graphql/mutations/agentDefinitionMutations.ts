import { gql } from 'graphql-tag'

const AgentDefinitionMutationFields = gql`
  fragment AgentDefinitionMutationFields on AgentDefinition {
    __typename
    id
    name
    role
    description
    instructions
    category
    avatarUrl
    toolNames
    inputProcessorNames
    llmResponseProcessorNames
    systemPromptProcessorNames
    toolExecutionResultProcessorNames
    toolInvocationPreprocessorNames
    lifecycleProcessorNames
    skillNames
    ownershipScope
    ownerTeamId
    ownerTeamName
    ownerApplicationId
    ownerApplicationName
    ownerPackageId
    ownerLocalApplicationId
    defaultLaunchConfig {
      llmModelIdentifier
      runtimeKind
      llmConfig
    }
  }
`

export const CreateAgentDefinition = gql`
  mutation CreateAgentDefinition($input: CreateAgentDefinitionInput!) {
    createAgentDefinition(input: $input) {
      ...AgentDefinitionMutationFields
    }
  }
  ${AgentDefinitionMutationFields}
`

export const UpdateAgentDefinition = gql`
  mutation UpdateAgentDefinition($input: UpdateAgentDefinitionInput!) {
    updateAgentDefinition(input: $input) {
      ...AgentDefinitionMutationFields
    }
  }
  ${AgentDefinitionMutationFields}
`

export const DeleteAgentDefinition = gql`
  mutation DeleteAgentDefinition($id: String!) {
    deleteAgentDefinition(id: $id) {
      __typename
      success
      message
    }
  }
`

export const DuplicateAgentDefinition = gql`
  mutation DuplicateAgentDefinition($input: DuplicateAgentDefinitionInput!) {
    duplicateAgentDefinition(input: $input) {
      ...AgentDefinitionMutationFields
    }
  }
  ${AgentDefinitionMutationFields}
`
