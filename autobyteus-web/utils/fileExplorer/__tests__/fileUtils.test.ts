import { describe, it, expect, beforeEach } from 'vitest'
import { TreeNode } from '~/utils/fileExplorer/TreeNode'
import {
  getFilePathsFromFolder,
  determineFileType,
  findNodeById,
  createNodeIdToNodeDictionary,
  handleFileSystemChange
} from '~/utils/fileExplorer/fileUtils'
import type {
  FileSystemChangeEvent,
  AddChange,
  DeleteChange,
  RenameChange,
  ModifyChange,
  MoveChange
} from '~/types/fileSystemChangeTypes'

describe('fileUtils', () => {
  let rootNode: TreeNode

  beforeEach(() => {
    // Set up a sample tree
    rootNode = new TreeNode('root', 'root', false, [], 'root-id')

    const folderA = new TreeNode('folderA', 'root/folderA', false, [], 'folderA-id')
    const file1 = new TreeNode('file1.txt', 'root/file1.txt', true, [], 'file1-id')
    const file2 = new TreeNode('file2.txt', 'root/folderA/file2.txt', true, [], 'file2-id')

    rootNode.addChild(folderA)
    rootNode.addChild(file1)
    folderA.addChild(file2)
  })

  describe('getFilePathsFromFolder', () => {
    it('should return all file paths from the tree', () => {
      const filePaths = getFilePathsFromFolder(rootNode)
      expect(filePaths).toContain('root/file1.txt')
      expect(filePaths).toContain('root/folderA/file2.txt')
      expect(filePaths).toHaveLength(2)
    })
  })

  describe('determineFileType', () => {
    it('should determine file type as Image for image files', async () => {
      const fileType = await determineFileType('image.jpg')
      expect(fileType).toBe('Image')
    })

    it('should determine file type as Text for text files', async () => {
      const fileType = await determineFileType('document.txt')
      expect(fileType).toBe('Text')
    })

    it('should determine file type as Audio for audio files', async () => {
      expect(await determineFileType('song.mp3')).toBe('Audio');
      expect(await determineFileType('sound.wav')).toBe('Audio');
      expect(await determineFileType('track.m4a')).toBe('Audio');
    });

    it('should determine file type as Video for video files', async () => {
      expect(await determineFileType('movie.mp4')).toBe('Video');
      expect(await determineFileType('clip.mov')).toBe('Video');
      expect(await determineFileType('film.mkv')).toBe('Video');
    });

    it('should determine file type as Excel for spreadsheet files', async () => {
      expect(await determineFileType('spreadsheet.xlsx')).toBe('Excel');
      expect(await determineFileType('data.xls')).toBe('Excel');
      expect(await determineFileType('report.xlsm')).toBe('Excel');
    });

    it('should be case-insensitive', async () => {
      const fileType = await determineFileType('PHOTO.PNG')
      expect(fileType).toBe('Image')
    })

    it('should default to Text for unknown extensions', async () => {
        const fileType = await determineFileType('archive.zip');
        expect(fileType).toBe('Text');
    });
  })

  describe('findNodeById', () => {
    it('should find a node by its id', () => {
      const node = findNodeById(rootNode, 'file1-id')
      expect(node).toBeDefined()
      expect(node?.name).toBe('file1.txt')
    })

    it('should return null if node is not found', () => {
      const node = findNodeById(rootNode, 'non-existent-id')
      expect(node).toBeNull()
    })
  })

  describe('createNodeIdToNodeDictionary', () => {
    it('should create a dictionary mapping node ids to nodes', () => {
      const dict = createNodeIdToNodeDictionary(rootNode)
      expect(Object.keys(dict)).toHaveLength(4)
      expect(dict['root-id']).toBe(rootNode)
      expect(dict['folderA-id']).toBe(rootNode.children[0])
      expect(dict['file1-id']).toBe(rootNode.children[1])
      expect(dict['file2-id']).toBe(rootNode.children[0].children[0])
    })
  })

  describe('handleFileSystemChange', () => {
    let nodeIdToNode: Record<string, TreeNode>

    beforeEach(() => {
      nodeIdToNode = createNodeIdToNodeDictionary(rootNode)
    })

    it('should handle add change', () => {
      const newFile = new TreeNode('newFile.txt', 'root/newFile.txt', true, [], 'newFile-id')
      const addChange: AddChange = {
        type: 'add',
        node: newFile,
        parent_id: 'root-id'
      }
      const event: FileSystemChangeEvent = { changes: [addChange] }

      handleFileSystemChange(rootNode, nodeIdToNode, event)

      expect(nodeIdToNode['newFile-id']).toBeDefined()
      expect(rootNode.children.find(child => child.id === 'newFile-id')).toBeDefined()
    })

    it('should handle delete change', () => {
      const deleteChange: DeleteChange = {
        type: 'delete',
        node_id: 'file1-id',
        parent_id: 'root-id'
      }
      const event: FileSystemChangeEvent = { changes: [deleteChange] }

      handleFileSystemChange(rootNode, nodeIdToNode, event)

      expect(nodeIdToNode['file1-id']).toBeUndefined()
      expect(rootNode.children.find(child => child.id === 'file1-id')).toBeUndefined()
    })

    it('should handle rename change', () => {
      const renamedNode = new TreeNode('renamedFile.txt', 'root/renamedFile.txt', true, [], 'file1-id')
      const renameChange: RenameChange = {
        type: 'rename',
        node: renamedNode,
        parent_id: 'root-id'
      }
      const event: FileSystemChangeEvent = { changes: [renameChange] }

      handleFileSystemChange(rootNode, nodeIdToNode, event)

      expect(nodeIdToNode['file1-id']).toBeDefined()
      expect(nodeIdToNode['file1-id'].name).toBe('renamedFile.txt')
      expect(nodeIdToNode['file1-id'].path).toBe('root/renamedFile.txt')
    })

    it('should handle rename change and update child paths', () => {
      const folderToRename = nodeIdToNode['folderA-id'];
      expect(folderToRename.children[0].path).toBe('root/folderA/file2.txt');
    
      const renamedNode = new TreeNode('folderA_renamed', 'root/folderA_renamed', false, [], 'folderA-id');
      const renameChange: RenameChange = {
        type: 'rename',
        node: renamedNode,
        parent_id: 'root-id'
      };
      const event: FileSystemChangeEvent = { changes: [renameChange] };
    
      handleFileSystemChange(rootNode, nodeIdToNode, event);
    
      const renamedFolderInTree = nodeIdToNode['folderA-id'];
      expect(renamedFolderInTree.name).toBe('folderA_renamed');
      expect(renamedFolderInTree.path).toBe('root/folderA_renamed');
      
      // THE CRITICAL CHECK:
      expect(renamedFolderInTree.children[0].path).toBe('root/folderA_renamed/file2.txt');
    });

    it('should handle move change and update child paths', () => {
      // Create a new target folder
      const targetFolder = new TreeNode('targetFolder', 'root/targetFolder', false, [], 'targetFolder-id');
      nodeIdToNode['targetFolder-id'] = targetFolder;
      rootNode.addChild(targetFolder);
  
      const folderToMove = nodeIdToNode['folderA-id'];
      expect(folderToMove.children[0].path).toBe('root/folderA/file2.txt');
  
      // The node in the event has the new path
      const movedNode = new TreeNode('folderA', 'root/targetFolder/folderA', false, [], 'folderA-id');
  
      const moveChange: MoveChange = {
          type: 'move',
          node: movedNode,
          old_parent_id: 'root-id',
          new_parent_id: 'targetFolder-id'
      };
      const event: FileSystemChangeEvent = { changes: [moveChange] };
  
      handleFileSystemChange(rootNode, nodeIdToNode, event);
      
      const movedFolderInTree = nodeIdToNode['folderA-id'];
      expect(movedFolderInTree.path).toBe('root/targetFolder/folderA');
      
      // THE CRITICAL CHECK:
      expect(movedFolderInTree.children[0].path).toBe('root/targetFolder/folderA/file2.txt');
  
      // Check parents
      expect(rootNode.children.find(c => c.id === 'folderA-id')).toBeUndefined();
      expect(targetFolder.children.find(c => c.id === 'folderA-id')).toBeDefined();
    });

    it('should handle modify change without altering the tree', () => {
      const originalTreeJson = JSON.stringify(rootNode); // Snapshot of tree before change

      const modifyChange: ModifyChange = {
        type: 'modify',
        node_id: 'file1-id',
        parent_id: 'root-id'
      };
      const event: FileSystemChangeEvent = { changes: [modifyChange] };

      handleFileSystemChange(rootNode, nodeIdToNode, event);

      const modifiedTreeJson = JSON.stringify(rootNode);
      
      // The tree structure and nodes should be identical.
      expect(modifiedTreeJson).toEqual(originalTreeJson);
      expect(nodeIdToNode['file1-id']).toBeDefined();
    });

    it('should handle multiple changes', () => {
      const newFolder = new TreeNode('newFolder', 'root/newFolder', false, [], 'newFolder-id')
      const newFileInFolder = new TreeNode('newFile.txt', 'root/newFolder/newFile.txt', true, [], 'newFileInFolder-id')

      const addFolderChange: AddChange = {
        type: 'add',
        node: newFolder,
        parent_id: 'root-id'
      }

      const addFileChange: AddChange = {
        type: 'add',
        node: newFileInFolder,
        parent_id: 'newFolder-id'
      }

      const event: FileSystemChangeEvent = { changes: [addFolderChange, addFileChange] }

      handleFileSystemChange(rootNode, nodeIdToNode, event)

      expect(nodeIdToNode['newFolder-id']).toBeDefined()
      expect(nodeIdToNode['newFileInFolder-id']).toBeDefined()
      expect(nodeIdToNode['newFolder-id'].children.find(child => child.id === 'newFileInFolder-id')).toBeDefined()
    })

    it('should handle add change when parent does not exist', () => {
      // Simulate a case where the parent node does not exist yet
      const newFolder = new TreeNode('nonExistentFolder', 'root/nonExistentFolder', false, [], 'nonExistentFolder-id')
      const newFile = new TreeNode('newFile.txt', 'root/nonExistentFolder/newFile.txt', true, [], 'newFile-id')
      
      const addFolderChange: AddChange = {
        type: 'add',
        node: newFolder,
        parent_id: 'root-id'
      }
      const addFileChange: AddChange = {
        type: 'add',
        node: newFile,
        parent_id: 'nonExistentFolder-id'
      }

      const event: FileSystemChangeEvent = { changes: [addFolderChange, addFileChange] }

      handleFileSystemChange(rootNode, nodeIdToNode, event)

      expect(nodeIdToNode['nonExistentFolder-id']).toBeDefined()
      expect(nodeIdToNode['newFile-id']).toBeDefined()
      expect(nodeIdToNode['nonExistentFolder-id'].children.find(child => child.id === 'newFile-id')).toBeDefined()
    })

    // NEW TEST: handle adding nested folders
    it('should handle nested folder additions similarly to server-side nested creation', () => {
      // For instance, adding "root/level1/level2/level3"
      const level3Node = new TreeNode(
        'level3',
        'root/level1/level2/level3',
        false,
        [],
        'level3-id'
      )
      const addChange: AddChange = {
        type: 'add',
        node: level3Node,
        parent_id: 'level2-id'
      }
      // We also need to simulate that level1 and level2 might be newly added in the same event
      const level1Node = new TreeNode('level1', 'root/level1', false, [], 'level1-id')
      const level2Node = new TreeNode('level2', 'root/level1/level2', false, [], 'level2-id')

      const addLevel1: AddChange = {
        type: 'add',
        node: level1Node,
        parent_id: 'root-id'
      }
      const addLevel2: AddChange = {
        type: 'add',
        node: level2Node,
        parent_id: 'level1-id'
      }

      const event: FileSystemChangeEvent = {
        changes: [addLevel1, addLevel2, addChange]
      }

      handleFileSystemChange(rootNode, nodeIdToNode, event)

      // Check that all nodes exist in the dictionary
      expect(nodeIdToNode['level1-id']).toBeDefined()
      expect(nodeIdToNode['level2-id']).toBeDefined()
      expect(nodeIdToNode['level3-id']).toBeDefined()

      // Check correct parent-child relationships
      expect(rootNode.children.find(child => child.id === 'level1-id')).toBeDefined()
      const level1InTree = nodeIdToNode['level1-id']
      expect(level1InTree.children.find(child => child.id === 'level2-id')).toBeDefined()
      const level2InTree = nodeIdToNode['level2-id']
      expect(level2InTree.children.find(child => child.id === 'level3-id')).toBeDefined()
    })
  })
})
