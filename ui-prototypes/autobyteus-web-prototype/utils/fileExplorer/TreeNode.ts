export class TreeNode {
  name: string
  path: string
  is_file: boolean
  children: TreeNode[]
  id: string
  /**
   * Tracks whether children have been loaded from the server.
   * For lazy loading: folders start with childrenLoaded=false and are loaded on-demand.
   * Files always have childrenLoaded=true since they have no children.
   */
  childrenLoaded: boolean

  constructor(
    name: string,
    path: string,
    is_file: boolean = false,
    children: TreeNode[] = [],
    id: string = '',
    childrenLoaded: boolean = false
  ) {
    this.name = name
    this.path = path
    this.is_file = is_file
    this.children = children
    this.id = id
    // Files always have children loaded (they have none), folders depend on server data
    this.childrenLoaded = is_file ? true : childrenLoaded
  }

  static fromObject(obj: any): TreeNode {
    const children = obj.children
      ? obj.children.map((child: any) => TreeNode.fromObject(child))
      : []
    // If a folder has children from the server, it means children are loaded
    // If a folder has no children, it might be empty OR not yet loaded
    // We rely on the childrenLoaded flag from the server or default to false for folders
    const childrenLoaded = obj.childrenLoaded !== undefined 
      ? obj.childrenLoaded 
      : (obj.is_file || (obj.children && obj.children.length > 0))
    return new TreeNode(
      obj.name,
      obj.path,
      obj.is_file,
      children,
      obj.id || '',
      childrenLoaded
    )
  }


  /**
   * Adds a child in a sorted position, avoiding a full re-sort of `children`.
   * The ordering rule is:
   *   1) Directories (is_file=false) come before files (is_file=true).
   *   2) Among directories (or among files), sort by name ignoring case.
   */
  addChild(node: TreeNode): void {
    const insertIndex = this.findInsertIndex(node)
    this.children.splice(insertIndex, 0, node)
  }

  /**
   * A helper method to find the correct insertion index for `node`
   * via binary search, based on the comparison logic:
   *
   *  1) Directories before files
   *  2) Among directories or among files, compare by lowercase name
   */
  private findInsertIndex(node: TreeNode): number {
    let low = 0
    let high = this.children.length
    while (low < high) {
      const mid = (low + high) >>> 1
      if (this.compareNodes(node, this.children[mid]) < 0) {
        high = mid
      } else {
        low = mid + 1
      }
    }
    return low
  }

  /**
   * Compare function that ensures directories appear first,
   * then files, then name-based comparison ignoring case.
   */
  private compareNodes(a: TreeNode, b: TreeNode): number {
    if (a.is_file !== b.is_file) {
      return a.is_file ? 1 : -1
    }
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase())
  }

  /**
   * Re-sorts the entire children array. Only use this if absolutely necessary,
   * as addChild provides more efficient sorted insertion.
   */
  sortChildren(): void {
    this.children.sort((a, b) => this.compareNodes(a, b))
  }
}

export function convertJsonToTreeNode(json: string): TreeNode {
  const obj = JSON.parse(json)
  return TreeNode.fromObject(obj)
}
