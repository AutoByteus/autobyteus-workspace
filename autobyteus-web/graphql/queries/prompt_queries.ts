import gql from 'graphql-tag';

export const GET_PROMPTS = gql`
  query GetPrompts($isActive: Boolean) {
    prompts(isActive: $isActive) {
      __typename
      id
      name
      category
      promptContent
      description
      suitableForModels
      version
      createdAt
      updatedAt
      parentPromptId
      isActive
    }
  }
`;

export const GET_PROMPT_BY_ID = gql`
  query GetPromptById($id: String!) {
    promptDetails(id: $id) {
      __typename
      id
      name
      category
      promptContent
      description
      suitableForModels
      version
      createdAt
      updatedAt
      parentPromptId
      isActive
    }
  }
`;

export const GetPromptDetailsByNameAndCategory = gql`
  query GetPromptDetailsByNameAndCategory($category: String!, $name: String!) {
    promptDetailsByNameAndCategory(category: $category, name: $name) {
      __typename
      description
      promptContent
    }
  }
`;
