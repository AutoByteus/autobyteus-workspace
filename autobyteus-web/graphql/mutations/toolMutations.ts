import { gql } from 'graphql-tag'

export const RELOAD_TOOL_SCHEMA = gql`
  mutation ReloadToolSchema($name: String!) {
    reloadToolSchema(name: $name) {
      success
      message
      tool {
        __typename
        name
        description
        origin
        category
        argumentSchema {
          __typename
          parameters {
            __typename
            name
            paramType
            description
            required
            defaultValue
            enumValues
          }
        }
      }
    }
  }
`
