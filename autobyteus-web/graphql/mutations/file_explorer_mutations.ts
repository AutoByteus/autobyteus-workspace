import gql from 'graphql-tag'

export const WriteFileContent = gql`
  mutation WriteFileContent($workspaceId: String!, $filePath: String!, $content: String!) {
    writeFileContent(workspaceId: $workspaceId, filePath: $filePath, content: $content)
  }
`

export const DeleteFileOrFolder = gql`
  mutation DeleteFileOrFolder($workspaceId: String!, $path: String!) {
    deleteFileOrFolder(workspaceId: $workspaceId, path: $path)
  }
`

export const MoveFileOrFolder = gql`
  mutation MoveFileOrFolder($workspaceId: String!, $sourcePath: String!, $destinationPath: String!) {
    moveFileOrFolder(workspaceId: $workspaceId, sourcePath: $sourcePath, destinationPath: $destinationPath)
  }
`

export const RenameFileOrFolder = gql`
  mutation RenameFileOrFolder($workspaceId: String!, $targetPath: String!, $newName: String!) {
    renameFileOrFolder(workspaceId: $workspaceId, targetPath: $targetPath, newName: $newName)
  }
`

export const CreateFileOrFolder = gql`
  mutation CreateFileOrFolder($workspaceId: String!, $path: String!, $isFile: Boolean!) {
    createFileOrFolder(workspaceId: $workspaceId, path: $path, isFile: $isFile)
  }
`