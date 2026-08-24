/**
 * GraphQL queries and mutations for Skills
 */
import { gql } from 'graphql-tag'

export const GET_SKILLS = gql`
  query GetSkills {
    skills {
      name
      description
      content
      rootPath
      fileCount
      isReadonly
      isDisabled
    }
  }
`

export const GET_SKILL = gql`
  query GetSkill($name: String!) {
    skill(name: $name) {
      name
      description
      content
      rootPath
      fileCount
      isReadonly
      isDisabled
    }
  }
`

export const GET_SKILL_FILE_TREE = gql`
  query GetSkillFileTree($name: String!) {
    skillFileTree(name: $name)
  }
`

export const GET_SKILL_FILE_CONTENT = gql`
  query GetSkillFileContent($skillName: String!, $path: String!) {
    skillFileContent(skillName: $skillName, path: $path)
  }
`

export const CREATE_SKILL = gql`
  mutation CreateSkill($input: CreateSkillInput!) {
    createSkill(input: $input) {
      name
      description
      content
      rootPath
      fileCount
    }
  }
`

export const UPDATE_SKILL = gql`
  mutation UpdateSkill($input: UpdateSkillInput!) {
    updateSkill(input: $input) {
      name
      description
      content
      rootPath
      fileCount
    }
  }
`

export const DELETE_SKILL = gql`
  mutation DeleteSkill($name: String!) {
    deleteSkill(name: $name) {
      success
      message
    }
  }
`

export const UPLOAD_SKILL_FILE = gql`
  mutation UploadSkillFile($skillName: String!, $path: String!, $content: String!) {
    uploadSkillFile(skillName: $skillName, path: $path, content: $content)
  }
`

export const DELETE_SKILL_FILE = gql`
  mutation DeleteSkillFile($skillName: String!, $path: String!) {
    deleteSkillFile(skillName: $skillName, path: $path)
  }
`

export const DISABLE_SKILL = gql`
  mutation DisableSkill($name: String!) {
    disableSkill(name: $name) {
      name
      isDisabled
    }
  }
`

export const ENABLE_SKILL = gql`
  mutation EnableSkill($name: String!) {
    enableSkill(name: $name) {
      name
      isDisabled
    }
  }
`
