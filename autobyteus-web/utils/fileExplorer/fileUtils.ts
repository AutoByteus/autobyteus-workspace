import { TreeNode } from '~/utils/fileExplorer/TreeNode'
import type { FileSystemChangeEvent, AddChange, DeleteChange, RenameChange, MoveChange, ModifyChange } from '~/types/fileSystemChangeTypes'

export function getFilePathsFromFolder(node: TreeNode): string[] {
  const filePaths: string[] = []
  function traverse(currentNode: TreeNode) {
    if (currentNode.is_file) {
      filePaths.push(currentNode.path)
    } else {
      currentNode.children.forEach(child => traverse(child))
    }
  }
  traverse(node)
  return filePaths
}

export async function determineFileType(filePath: string): Promise<'Text' | 'Image' | 'Audio' | 'Video' | 'Excel' | 'PDF'> {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
  const audioExtensions = ['.mp3', '.wav', '.m4a', '.flac', '.ogg', '.aac'];
  const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
  const excelExtensions = ['.xlsx', '.xls', '.xlsm', '.csv'];
  const lowercasePath = filePath.toLowerCase();
  
  for (const ext of imageExtensions) {
    if (lowercasePath.endsWith(ext)) {
      return 'Image';
    }
  }

  for (const ext of audioExtensions) {
    if (lowercasePath.endsWith(ext)) {
      return 'Audio';
    }
  }

  for (const ext of videoExtensions) {
    if (lowercasePath.endsWith(ext)) {
      return 'Video';
    }
  }

  for (const ext of excelExtensions) {
    if (lowercasePath.endsWith(ext)) {
      return 'Excel';
    }
  }

  if (lowercasePath.endsWith('.pdf')) {
    return 'PDF';
  }
  
  return 'Text';
}

export function findNodeById(root: TreeNode, id: string): TreeNode | null {
  if (root.id === id) return root
  for (const child of root.children) {
    const found = findNodeById(child, id)
    if (found) return found
  }
  return null
}

export function createNodeIdToNodeDictionary(root: TreeNode): Record<string, TreeNode> {
  const dictionary: Record<string, TreeNode> = {}
  
  function traverse(node: TreeNode) {
    dictionary[node.id] = node
    for (const child of node.children) {
      traverse(child)
    }
  }
  
  traverse(root)
  return dictionary
}

/**
 * Applies a series of changes (add, delete, rename, move) to the front-end tree.
 * Ensures that children remain sorted (directories first, then files) after each change.
 */
export function handleFileSystemChange(
  workspaceTree: TreeNode,
  nodeIdToNode: Record<string, TreeNode>,
  event: FileSystemChangeEvent
): void {
  event.changes.forEach(change => {
    try {
      switch (change.type) {
        case 'add':
          handleAddChange(nodeIdToNode, change)
          break
        case 'delete':
          handleDeleteChange(nodeIdToNode, change)
          break
        case 'rename':
          handleRenameChange(nodeIdToNode, change)
          break
        case 'move':
          handleMoveChange(nodeIdToNode, change)
          break
        case 'modify':
          handleModifyChange(nodeIdToNode, change)
          break
        default:
          console.warn(`Unhandled change type: ${(change as { type: string }).type}`)
      }
    } catch (error) {
      console.error('Error handling file system change:', error)
    }
  })
}

/**
 * Adds a new node under the specified parent, then ensures children are sorted.
 */
function handleAddChange(nodeIdToNode: Record<string, TreeNode>, change: AddChange): void {
  const parentNode = nodeIdToNode[change.parent_id]
  if (!parentNode) {
    throw new Error(`Parent node with id ${change.parent_id} not found`)
  }
  const newNode = TreeNode.fromObject(change.node)

  parentNode.addChild(newNode)
  nodeIdToNode[newNode.id] = newNode
}

/**
 * Removes a child by id from its parent, then removes from dictionary.
 */
function handleDeleteChange(nodeIdToNode: Record<string, TreeNode>, change: DeleteChange): void {
  const parentNode = nodeIdToNode[change.parent_id]
  if (!parentNode) {
    throw new Error(`Parent node with id ${change.parent_id} not found`)
  }
  parentNode.children = parentNode.children.filter(child => child.id !== change.node_id)
  delete nodeIdToNode[change.node_id]
}

/**
 * Recursively updates the file paths of all descendants of a given node.
 * This is necessary when a parent folder is renamed or moved.
 * @param node The parent node whose children need updating.
 * @param oldBasePath The old path prefix of the parent node.
 * @param newBasePath The new path prefix of the parent node.
 */
function updateDescendantPaths(node: TreeNode, oldBasePath: string, newBasePath: string): void {
  if (node.is_file || !node.children) {
    return; // Only applies to folders with children
  }

  node.children.forEach(child => {
    const oldChildPath = child.path; // Capture the original path before modification
    
    // Replace the start of the child's path
    if (child.path.startsWith(oldBasePath + '/')) {
      const relativePart = child.path.substring(oldBasePath.length);
      child.path = newBasePath + relativePart;
    } else {
      console.warn(`Child path "${child.path}" did not match old base path "${oldBasePath}".`);
      // No change if it doesn't match
    }

    // Recurse if it's a folder
    if (!child.is_file) {
      updateDescendantPaths(child, oldChildPath, child.path); // Use captured old path and new path for recursion
    }
  });
}

/**
 * Optimized rename operation that maintains sort order efficiently.
 * Removes node from current position and reinserts in correct sorted position.
 */
function handleRenameChange(nodeIdToNode: Record<string, TreeNode>, change: RenameChange): void {
  const node = nodeIdToNode[change.node.id]
  if (!node) {
    throw new Error(`Node with id ${change.node.id} not found`)
  }
  
  const parentNode = nodeIdToNode[change.parent_id]
  if (!parentNode) {
    throw new Error(`Parent node with id ${change.parent_id} not found`)
  }

  const oldPath = node.path;
  const newPath = change.node.path;

  // Remove the node from its current position
  const currentIndex = parentNode.children.findIndex(child => child.id === node.id)
  if (currentIndex === -1) {
    throw new Error(`Node ${node.id} not found in parent's children`)
  }
  parentNode.children.splice(currentIndex, 1)
  
  // Update the node's properties
  node.name = change.node.name
  node.path = newPath

  // Update paths of all children recursively
  updateDescendantPaths(node, oldPath, newPath);
  
  // Reinsert the node in its new sorted position using efficient addChild
  parentNode.addChild(node)
}

/**
 * Moves a node between parents, updating properties and maintaining sort order.
 */
function handleMoveChange(nodeIdToNode: Record<string, TreeNode>, change: MoveChange): void {
  const node = nodeIdToNode[change.node.id]
  const oldParent = nodeIdToNode[change.old_parent_id]
  const newParent = nodeIdToNode[change.new_parent_id]
  
  if (!node || !oldParent || !newParent) {
    throw new Error('One or more nodes not found during move operation')
  }

  const oldPath = node.path;
  const newPath = change.node.path;

  oldParent.children = oldParent.children.filter(child => child.id !== node.id)
  
  node.name = change.node.name
  node.path = newPath

  // Update paths of all children recursively
  updateDescendantPaths(node, oldPath, newPath);
  
  newParent.addChild(node)
}

/**
 * Handles a 'modify' event. This event signals a content change, not a structural
 * tree change, so the tree itself doesn't need to be mutated. We explicitly
 * handle it to prevent 'unhandled change type' warnings. State management stores
 * are responsible for reacting to this event (e.g., by invalidating cached file content).
 */
function handleModifyChange(nodeIdToNode: Record<string, TreeNode>, change: ModifyChange): void {
  if (!nodeIdToNode[change.node_id]) {
    console.warn(`Received modify event for an unknown node with id ${change.node_id}`);
  }
  // No structural changes are needed for the tree on a content modification.
}

export function findFileByPath(nodes: TreeNode[], path: string): TreeNode | null {
  for (const node of nodes) {
    if (node.path === path) {
      return node
    }
    if (node.children) {
      const found = findFileByPath(node.children, path)
      if (found) return found
    }
  }
  return null
}
