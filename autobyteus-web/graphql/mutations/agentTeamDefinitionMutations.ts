import { gql } from 'graphql-tag'

export const CreateAgentTeamDefinition = gql`
  mutation CreateAgentTeamDefinition($input: CreateAgentTeamDefinitionInput!) {
    createAgentTeamDefinition(input: $input) {
      __typename
      id
      name
      description
      instructions
      category
      avatarUrl
      coordinatorMemberName
      nodes {
        __typename
        memberName
        ref
        refType
        refScope
      }
    }
  }
`

export const UpdateAgentTeamDefinition = gql`
  mutation UpdateAgentTeamDefinition($input: UpdateAgentTeamDefinitionInput!) {
    updateAgentTeamDefinition(input: $input) {
      __typename
      id
      name
      description
      instructions
      category
      avatarUrl
      coordinatorMemberName
      nodes {
        __typename
        memberName
        ref
        refType
        refScope
      }
    }
  }
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
