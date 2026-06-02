import type { TreeNode } from '~/utils/fileExplorer/TreeNode'

export type FileExplorerContextNodeTarget = {
  kind: 'node'
  nodeId: string
  path: string
  name: string
  isFile: boolean
}

export type FileExplorerContextRootTarget = {
  kind: 'root'
}

export type FileExplorerContextTarget =
  | FileExplorerContextNodeTarget
  | FileExplorerContextRootTarget

export type FileExplorerContextMenuPosition = {
  top: number
  left: number
}

export type FileExplorerContextRequest = {
  target: FileExplorerContextTarget
  position: FileExplorerContextMenuPosition
}

export type FileExplorerContextActionId =
  | 'add-file'
  | 'add-folder'
  | 'rename'
  | 'delete'

export type FileExplorerContextMenuItem = {
  id: FileExplorerContextActionId
  label: string
  icon: string
}

export type RequestFileExplorerContextMenu = (request: FileExplorerContextRequest) => void

export type FileExplorerRenameRequest = {
  requestId: number
  nodeId: string
  path: string
  name: string
}

const CREATE_ACTIONS: FileExplorerContextMenuItem[] = [
  { id: 'add-file', label: 'Add File', icon: 'heroicons:plus' },
  { id: 'add-folder', label: 'Add Folder', icon: 'heroicons:plus' },
]

const NODE_ACTIONS: FileExplorerContextMenuItem[] = [
  ...CREATE_ACTIONS,
  { id: 'rename', label: 'Rename', icon: 'heroicons:pencil-square' },
  { id: 'delete', label: 'Delete', icon: 'heroicons:trash' },
]

export const createFileExplorerNodeContextTarget = (file: TreeNode): FileExplorerContextNodeTarget => ({
  kind: 'node',
  nodeId: file.id,
  path: file.path,
  name: file.name,
  isFile: file.is_file,
})

export const getFileExplorerContextMenuItems = (
  target: FileExplorerContextTarget | null,
): FileExplorerContextMenuItem[] => {
  if (!target) return []
  return target.kind === 'root' ? [...CREATE_ACTIONS] : [...NODE_ACTIONS]
}

export const getCreateParentPath = (target: FileExplorerContextTarget): string => {
  if (target.kind === 'root') return ''
  if (!target.isFile) return normalizeWorkspacePath(target.path)
  return getContainingFolderPath(target.path)
}

export const resolveCreatePath = (
  target: FileExplorerContextTarget,
  name: string,
): string => {
  const childName = normalizeWorkspacePath(name)
  const parentPath = getCreateParentPath(target)
  return parentPath ? `${parentPath}/${childName}` : childName
}

const getContainingFolderPath = (path: string): string => {
  const normalizedPath = normalizeWorkspacePath(path)
  const segments = normalizedPath.split('/').filter(Boolean)
  segments.pop()
  return segments.join('/')
}

const normalizeWorkspacePath = (path: string): string =>
  path
    .trim()
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
