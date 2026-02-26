import gql from 'graphql-tag';

export const CREATE_PROMPT = gql`
  mutation CreatePrompt($input: CreatePromptInput!) {
    createPrompt(input: $input) {
      __typename
      id
      name
      category
      promptContent
      description
      suitableForModels
      version
      createdAt
      parentPromptId
      isActive
    }
  }
`;

export const UPDATE_PROMPT = gql`
  mutation UpdatePrompt($input: UpdatePromptInput!) {
    updatePrompt(input: $input) {
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

export const ADD_NEW_PROMPT_REVISION = gql`
  mutation AddNewPromptRevision($input: AddNewPromptRevisionInput!) {
    addNewPromptRevision(input: $input) {
      __typename
      id
      name
      category
      promptContent
      description
      suitableForModels
      version
      createdAt
      parentPromptId
      isActive
    }
  }
`;

export const MARK_ACTIVE_PROMPT = gql`
  mutation MarkActivePrompt($input: MarkActivePromptInput!) {
    markActivePrompt(input: $input) {
      __typename
      id
      isActive
    }
  }
`;

export const DELETE_PROMPT = gql`
  mutation DeletePrompt($input: DeletePromptInput!) {
    deletePrompt(input: $input) {
      __typename
      success
      message
    }
  }
`;
