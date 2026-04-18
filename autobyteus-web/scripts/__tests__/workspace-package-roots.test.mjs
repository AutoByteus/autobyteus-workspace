import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import {
  buildWorkspacePackageRootMap,
  clearWorkspacePackageRootMapCache,
  resolveWorkspacePackageRoot,
} from '../../../scripts/workspace-package-roots.mjs'

const workspaceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../..',
)

describe('workspace-package-roots', () => {
  afterEach(() => {
    clearWorkspacePackageRootMapCache()
  })

  it('resolves scoped workspace package names to their actual package directories', async () => {
    const packageRoot = await resolveWorkspacePackageRoot(
      workspaceRoot,
      '@autobyteus/application-sdk-contracts',
    )

    expect(packageRoot).toBe(
      path.join(workspaceRoot, 'autobyteus-application-sdk-contracts'),
    )
  })

  it('resolves workspace entries discovered through wildcard package patterns', async () => {
    const packageRoot = await resolveWorkspacePackageRoot(
      workspaceRoot,
      '@autobyteus-example/brief-studio-authoring',
    )

    expect(packageRoot).toBe(
      path.join(workspaceRoot, 'applications', 'brief-studio'),
    )
  })

  it('builds a package-name map keyed by package manifest names', async () => {
    const packageRootMap = await buildWorkspacePackageRootMap(workspaceRoot)

    expect(packageRootMap.get('autobyteus-server-ts')).toBe(
      path.join(workspaceRoot, 'autobyteus-server-ts'),
    )
    expect(packageRootMap.get('@autobyteus/application-backend-sdk')).toBe(
      path.join(workspaceRoot, 'autobyteus-application-backend-sdk'),
    )
  })
})
