import { gql } from 'graphql-tag'

export const GetAgentCustomizationOptions = gql`
  query GetAgentCustomizationOptions {
    availableToolNames
    availableOptionalInputProcessorNames
    availableOptionalLlmResponseProcessorNames
    availableOptionalToolExecutionResultProcessorNames
    availableOptionalToolInvocationPreprocessorNames
    availableOptionalLifecycleProcessorNames
  }
`
