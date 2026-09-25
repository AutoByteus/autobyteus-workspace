import gql from 'graphql-tag'
const options = gql`fragment RunModelOptionsFields on RunModelOptionsObject {
  currentModelIdentifier unavailableReason
  replacements { llmModelIdentifier }
}`
export const AgentRunModelOptions = gql`query AgentRunModelOptions($agentRunId: String!) {
  agentRunModelOptions(agentRunId: $agentRunId) { ...RunModelOptionsFields }
} ${options}`
export const TeamRunModelOptions = gql`query TeamRunModelOptions($teamRunId: String!) {
  teamRunModelOptions(teamRunId: $teamRunId) {
    scopeKind scopeAddress currentModelIdentifier unavailableReason
    replacements { llmModelIdentifier }
  }
}`

export const AgentOrgRunConfig = gql`query AgentOrgRunConfig($orgRunId: String!) {
  getAgentOrgRunConfig(orgRunId: $orgRunId) {
    orgRunId executionTree isActive editability { editable reason }
  }
}`
export const AgentOrgRunModelOptions = gql`query AgentOrgRunModelOptions($orgRunId: String!, $teamWorkspacePatches: [AgentOrgTeamWorkspacePatchInput!]!) {
  agentOrgRunModelOptions(orgRunId: $orgRunId, teamWorkspacePatches: $teamWorkspacePatches) {
    scopeKind scopeAddress currentModelIdentifier unavailableReason
    replacements { llmModelIdentifier }
  }
}`
