// File: autobyteus-web/graphql/queries/file_explorer_queries.ts

import gql from 'graphql-tag';

export const GetFileContent = gql`
  query GetFileContent($workspaceId: String!, $filePath: String!) {
    fileContent(workspaceId: $workspaceId, filePath: $filePath)
  }
`;

export const SearchFiles = gql`
  query SearchFiles($workspaceId: String!, $query: String!) {
    searchFiles(workspaceId: $workspaceId, query: $query)
  }
`;

/**
 * Query to fetch children of a specific folder for lazy loading.
 * Returns JSON with immediate children only (one level deep).
 */
export const GetFolderChildren = gql`
  query GetFolderChildren($workspaceId: String!, $folderPath: String!) {
    folderChildren(workspaceId: $workspaceId, folderPath: $folderPath)
  }
`;