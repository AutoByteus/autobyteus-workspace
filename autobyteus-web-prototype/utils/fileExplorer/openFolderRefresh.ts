import { TreeNode } from '~/utils/fileExplorer/TreeNode'

export const getOpenFolderPathsForRefresh = (openFolders: Record<string, boolean>): string[] =>
  Object.entries(openFolders)
    .filter(([folderPath, isOpen]) => isOpen && folderPath !== '' && folderPath !== '/')
    .map(([folderPath]) => folderPath)
    .sort((left, right) => folderDepth(left) - folderDepth(right) || left.localeCompare(right));

const folderDepth = (folderPath: string): number =>
  folderPath.split('/').filter(Boolean).length;

export const replaceFolderChildren = (
  folderNode: TreeNode,
  childDataList: any[],
  nodeIdToNode: Record<string, TreeNode>,
): void => {
  folderNode.children.forEach((child) => removeNodeTreeFromDictionary(child, nodeIdToNode));
  folderNode.children = [];
  childDataList.forEach((childData) => {
    const childNode = TreeNode.fromObject(childData);
    folderNode.addChild(childNode);
    indexNodeTree(childNode, nodeIdToNode);
  });
  folderNode.childrenLoaded = true;
};

const removeNodeTreeFromDictionary = (
  node: TreeNode,
  nodeIdToNode: Record<string, TreeNode>,
): void => {
  node.children.forEach((child) => removeNodeTreeFromDictionary(child, nodeIdToNode));
  if (nodeIdToNode[node.id] === node) {
    delete nodeIdToNode[node.id];
  }
};

const indexNodeTree = (
  node: TreeNode,
  nodeIdToNode: Record<string, TreeNode>,
): void => {
  nodeIdToNode[node.id] = node;
  node.children.forEach((child) => indexNodeTree(child, nodeIdToNode));
};
