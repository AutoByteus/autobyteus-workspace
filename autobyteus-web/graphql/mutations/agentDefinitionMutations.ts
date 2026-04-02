import { gql } from 'graphql-tag'

export const CreateAgentDefinition = gql`
  mutation CreateAgentDefinition($input: CreateAgentDefinitionInput!) {
    createAgentDefinition(input: $input) {
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
    }
  }
`

export const UpdateAgentDefinition = gql`
  mutation UpdateAgentDefinition($input: UpdateAgentDefinitionInput!) {
    updateAgentDefinition(input: $input) {
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
    }
  }
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
    }
  }
`
