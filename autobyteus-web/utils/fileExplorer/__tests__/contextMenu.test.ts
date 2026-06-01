import { describe, expect, it } from 'vitest'
import {
  getCreateParentPath,
  getFileExplorerContextMenuItems,
  resolveCreatePath,
  type FileExplorerContextTarget,
} from '~/utils/fileExplorer/contextMenu'

const folderTarget: FileExplorerContextTarget = {
  kind: 'node',
  nodeId: 'folder-id',
  path: 'docs/guides',
  name: 'guides',
  isFile: false,
}

const fileTarget: FileExplorerContextTarget = {
  kind: 'node',
  nodeId: 'file-id',
  path: 'docs/guides/readme.md',
  name: 'readme.md',
  isFile: true,
}

const rootTarget: FileExplorerContextTarget = { kind: 'root' }

describe('file explorer context menu helpers', () => {
  it('returns node actions for file and folder targets', () => {
    expect(getFileExplorerContextMenuItems(folderTarget).map((item) => item.id)).toEqual([
      'add-file',
      'add-folder',
      'rename',
      'delete',
    ])
    expect(getFileExplorerContextMenuItems(fileTarget).map((item) => item.id)).toEqual([
      'add-file',
      'add-folder',
      'rename',
      'delete',
    ])
  })

  it('returns only root-safe create actions for root targets', () => {
    expect(getFileExplorerContextMenuItems(rootTarget).map((item) => item.id)).toEqual([
      'add-file',
      'add-folder',
    ])
  })

  it('resolves folder-target creates under the folder', () => {
    expect(getCreateParentPath(folderTarget)).toBe('docs/guides')
    expect(resolveCreatePath(folderTarget, 'new-folder')).toBe('docs/guides/new-folder')
  })

  it('resolves file-target creates beside the file', () => {
    expect(getCreateParentPath(fileTarget)).toBe('docs/guides')
    expect(resolveCreatePath(fileTarget, 'sibling-folder')).toBe('docs/guides/sibling-folder')
  })

  it('resolves root-target creates at workspace root without a leading slash', () => {
    expect(getCreateParentPath(rootTarget)).toBe('')
    expect(resolveCreatePath(rootTarget, '/root-folder/')).toBe('root-folder')
  })
})
