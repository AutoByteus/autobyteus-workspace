import { gql } from 'graphql-tag'

export const GetAgentCustomizationOptions = gql`
  query GetAgentCustomizationOptions {
    availableToolNames
    availableOptionalInputProcessorNames
    availableOptionalLlmResponseProcessorNames
    availableOptionalSystemPromptProcessorNames
    availableOptionalToolExecutionResultProcessorNames
    availableOptionalToolInvocationPreprocessorNames
    availableOptionalLifecycleProcessorNames
  }
`
