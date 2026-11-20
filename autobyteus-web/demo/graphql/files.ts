/**
 * The demo folder's GraphQL answers (autobyteus-279), as the node's file explorer resolver gives them
 * (`file-explorer.ts`): a workspace the node does not have is its "Workspace not found" error (search: none).
 */
import { fileContentText, folderChildrenJson, searchFolder } from '../world/folder';
import { DEMO_WORKSPACE_ID } from './definitions';
import type { DemoGraphqlHandlers } from './operations';

const WORKSPACE_NOT_FOUND = JSON.stringify({ error: 'Workspace not found' });

export const fileHandlers = {
  GetFolderChildren: ({ workspaceId, folderPath }) => ({
    __typename: 'Query', folderChildren: workspaceId === DEMO_WORKSPACE_ID ? folderChildrenJson(folderPath) : WORKSPACE_NOT_FOUND,
  }),
  GetFileContent: ({ workspaceId, filePath }) => ({
    __typename: 'Query', fileContent: workspaceId === DEMO_WORKSPACE_ID ? fileContentText(filePath) : WORKSPACE_NOT_FOUND,
  }),
  SearchFiles: ({ workspaceId, query }) => ({ __typename: 'Query', searchFiles: workspaceId === DEMO_WORKSPACE_ID ? searchFolder(query) : [] }),
} satisfies Partial<DemoGraphqlHandlers>;
