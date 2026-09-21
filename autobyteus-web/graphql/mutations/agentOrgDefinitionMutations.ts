import { gql } from 'graphql-tag'
const Fields = gql`
  fragment AgentOrgDefinitionFields on AgentOrgDefinition {
    id name description instructions category avatarUrl revision
    handoffs { from to rules }
    members { memberName ref refType refScope }
    defaultLaunchConfig { llmModelIdentifier runtimeKind llmConfig }
  }
`
export const CreateAgentOrgDefinition = gql`
  mutation CreateAgentOrgDefinition($input: CreateAgentOrgDefinitionInput!) {
    createAgentOrgDefinition(input: $input) { ...AgentOrgDefinitionFields }
  }
  ${Fields}
`
export const UpdateAgentOrgDefinition = gql`
  mutation UpdateAgentOrgDefinition($input: UpdateAgentOrgDefinitionInput!) {
    updateAgentOrgDefinition(input: $input) { ...AgentOrgDefinitionFields }
  }
  ${Fields}
`
export const DeleteAgentOrgDefinition = gql`
  mutation DeleteAgentOrgDefinition($id: String!) { deleteAgentOrgDefinition(id: $id) }
`
