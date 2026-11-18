import { gql } from 'graphql-tag'
const Fields = gql`
  fragment AgentOrgDefinitionFields on AgentOrgDefinition {
    id name description instructions category avatarUrl revision personalSettings personalSettingsBase
    handoffs { from to rules }
    members { memberName ref refType refScope }
    defaultLaunchConfig { llmModelIdentifier runtimeKind llmConfig }
    loadIssues { kind definitionId name code reason definitionPath packageRoot usingLastGood }
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
export const ResetAgentOrgPersonalSetting = gql`
  mutation ResetAgentOrgPersonalSetting($definitionId: String!, $setting: PersonalSetting!) {
    resetAgentOrgPersonalSetting(definitionId: $definitionId, setting: $setting) { ...AgentOrgDefinitionFields }
  }
  ${Fields}
`
export const DeleteAgentOrgDefinition = gql`
  mutation DeleteAgentOrgDefinition($id: String!) { deleteAgentOrgDefinition(id: $id) }
`
