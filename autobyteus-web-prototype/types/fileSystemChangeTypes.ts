import { TreeNode } from '~/utils/fileExplorer/TreeNode'

export interface FileSystemChangeEvent {
  changes: Array<AddChange | DeleteChange | RenameChange | MoveChange | ModifyChange>
}

export interface AddChange {
  type: 'add'
  node: TreeNode
  parent_id: string
}

export interface DeleteChange {
  type: 'delete'
  node_id: string
  parent_id: string
}

export interface RenameChange {
  type: 'rename'
  node: TreeNode
  parent_id: string
}

export interface MoveChange {
  type: 'move'
  node: TreeNode
  old_parent_id: string
  new_parent_id: string
}

export interface ModifyChange {
  type: 'modify'
  node_id: string
  parent_id: string
}
