import gql from 'graphql-tag'

export const SKILL_SOURCE_FIELDS = gql`
  fragment SkillSourceFields on SkillSource {
    sourceId sourceKind path skillCount isDefault
    github {
      repositoryUrl defaultBranch installedRevision latestRevision latestCheckedAt status lastError
    }
  }
`

export const GET_SKILL_SOURCES = gql`
  query GetSkillSources {
    skillSources { ...SkillSourceFields }
    skillSourceRegistryError
  }
  ${SKILL_SOURCE_FIELDS}
`
export const ADD_SKILL_SOURCE = gql`
  mutation AddSkillSource($path: String!) {
    addSkillSource(path: $path) { ...SkillSourceFields }
  }
  ${SKILL_SOURCE_FIELDS}
`
export const REMOVE_SKILL_SOURCE = gql`
  mutation RemoveSkillSource($path: String!) {
    removeSkillSource(path: $path) { ...SkillSourceFields }
  }
  ${SKILL_SOURCE_FIELDS}
`
export const RELOAD_SKILL_CATALOG = gql`
  mutation ReloadSkillCatalog {
    reloadSkillCatalog {
      skills { name description content rootPath fileCount isReadonly isDisabled }
      skillSources { ...SkillSourceFields }
      skillSourceRegistryError
    }
  }
  ${SKILL_SOURCE_FIELDS}
`
export const IMPORT_GITHUB_SKILL_SOURCE = gql`
  mutation ImportGitHubSkillSource($repositoryUrl: String!) {
    importGitHubSkillSource(repositoryUrl: $repositoryUrl) { sources { ...SkillSourceFields } warnings }
  }
  ${SKILL_SOURCE_FIELDS}
`
export const CHECK_GITHUB_SKILL_SOURCES = gql`
  mutation CheckGitHubSkillSourceUpdates($sourceIds: [String!]) {
    checkGitHubSkillSourceUpdates(sourceIds: $sourceIds) { sources { ...SkillSourceFields } warnings }
  }
  ${SKILL_SOURCE_FIELDS}
`
export const UPDATE_GITHUB_SKILL_SOURCE = gql`
  mutation UpdateGitHubSkillSource($sourceId: String!) {
    updateGitHubSkillSource(sourceId: $sourceId) { sources { ...SkillSourceFields } warnings }
  }
  ${SKILL_SOURCE_FIELDS}
`
export const REMOVE_GITHUB_SKILL_SOURCE = gql`
  mutation RemoveGitHubSkillSource($sourceId: String!) {
    removeGitHubSkillSource(sourceId: $sourceId) { sources { ...SkillSourceFields } warnings }
  }
  ${SKILL_SOURCE_FIELDS}
`
