import { gql } from 'graphql-tag'

/** Definitions of one subject that are unusable, or usable only through their last working version. */
export const GetDefinitionDiagnostics = gql`
  query GetDefinitionDiagnostics($subject: DefinitionSubject!) {
    definitionDiagnostics(subject: $subject) {
      subject
      definitionId
      code
      reason
      definitionPath
      packageRoot
      usingLastGood
      dependencyChain
    }
  }
`
