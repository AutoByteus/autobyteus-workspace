import { gql } from 'graphql-tag'

export const GetAgentDefinitions = gql`
  query GetAgentDefinitions {
    agentDefinitions {
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
  }
`
