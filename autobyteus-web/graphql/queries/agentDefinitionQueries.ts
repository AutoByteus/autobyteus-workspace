import { gql } from 'graphql-tag'

export const GetAgentDefinitions = gql`
  query GetAgentDefinitions {
    agentDefinitions {
      __typename
      id
      name
      role
      description
      avatarUrl
      toolNames
      inputProcessorNames
      llmResponseProcessorNames
      systemPromptProcessorNames
      toolExecutionResultProcessorNames

      toolInvocationPreprocessorNames
      lifecycleProcessorNames
      skillNames
      systemPromptCategory
      systemPromptName
      prompts {
        __typename
        id
        name
        category
        promptContent
        description
        suitableForModels
        version
        createdAt
        updatedAt
        parentPromptId
        isActive
      }
    }
  }
`
