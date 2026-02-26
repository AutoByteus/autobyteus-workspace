import gql from 'graphql-tag'

export const GET_SKILL_SOURCES = gql`
  query GetSkillSources {
    skillSources {
      path
      skillCount
      isDefault
    }
  }
`

export const ADD_SKILL_SOURCE = gql`
  mutation AddSkillSource($path: String!) {
    addSkillSource(path: $path) {
      path
      skillCount
      isDefault
    }
  }
`

export const REMOVE_SKILL_SOURCE = gql`
  mutation RemoveSkillSource($path: String!) {
    removeSkillSource(path: $path) {
      path
      skillCount
      isDefault
    }
  }
`
