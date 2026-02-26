import { gql } from 'graphql-tag'

export const GET_TOOLS = gql`
  query GetTools($origin: ToolOriginEnum, $sourceServerId: String) {
    tools(origin: $origin, sourceServerId: $sourceServerId) {
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
`

export const GET_TOOLS_GROUPED_BY_CATEGORY = gql`
  query GetToolsGroupedByCategory($origin: ToolOriginEnum!) {
    toolsGroupedByCategory(origin: $origin) {
      __typename
      categoryName
      tools {
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
