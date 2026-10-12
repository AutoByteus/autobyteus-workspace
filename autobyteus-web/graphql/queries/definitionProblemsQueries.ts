import { gql } from 'graphql-tag'

/** Definitions of one kind that are unusable, or usable only through their last working version. */
export const GetDefinitionProblems = gql`
  query GetDefinitionProblems($kind: DefinitionKind!) {
    definitionProblems(kind: $kind) {
      kind
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
