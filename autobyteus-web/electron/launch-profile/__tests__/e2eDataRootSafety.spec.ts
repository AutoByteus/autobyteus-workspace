import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  getResolvedSafeE2EDataRootPath,
  projectCanonicalPathWithoutMutation,
  resolveExistingSafeE2EDataRoot,
} from '../e2eDataRootSafety'

describe('E2E data-root safety', () => {
  const cleanupRoots: string[] = []

  const tempRoot = (): string => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'autobyteus-safe-root-test-'))
    cleanupRoots.push(root)
    return root
  }

  afterEach(() => {
    for (const root of cleanupRoots.splice(0)) {
      fs.rmSync(root, { recursive: true, force: true })
    }
  })

  it('authorizes an existing canonical directory disjoint from production paths', () => {
    const fixture = tempRoot()
    const selected = path.join(fixture, 'selected')
    const production = path.join(fixture, 'production')
    fs.mkdirSync(selected)
    fs.mkdirSync(production)

    const resolved = resolveExistingSafeE2EDataRoot({
      selectedPath: selected,
      protectedPaths: [production],
    })

    expect(getResolvedSafeE2EDataRootPath(resolved)).toBe(fs.realpathSync(selected))
  })

  it('rejects missing roots without creating through a symlinked ancestor', () => {
    const fixture = tempRoot()
    const production = path.join(fixture, 'production')
    const alias = path.join(fixture, 'alias')
    const missing = path.join(alias, 'new-root')
    fs.mkdirSync(production)
    fs.writeFileSync(path.join(production, 'sentinel.txt'), 'unchanged')
    fs.symlinkSync(production, alias, 'dir')

    expect(projectCanonicalPathWithoutMutation(missing)).toBe(
      path.join(fs.realpathSync(production), 'new-root'),
    )
    expect(() => resolveExistingSafeE2EDataRoot({
      selectedPath: missing,
      protectedPaths: [production],
    })).toThrow('must already exist')
    expect(fs.existsSync(missing)).toBe(false)
    expect(fs.readFileSync(path.join(production, 'sentinel.txt'), 'utf8')).toBe('unchanged')
  })

  it('rejects selected-root symlinks and protected ancestors', () => {
    const fixture = tempRoot()
    const production = path.join(fixture, 'production')
    const selected = path.join(fixture, 'selected')
    const selectedAlias = path.join(fixture, 'selected-alias')
    fs.mkdirSync(production)
    fs.mkdirSync(selected)
    fs.symlinkSync(selected, selectedAlias, 'dir')

    expect(() => resolveExistingSafeE2EDataRoot({
      selectedPath: selectedAlias,
      protectedPaths: [production],
    })).toThrow('must not be a symbolic link')

    const protectedChild = path.join(production, 'child')
    fs.mkdirSync(protectedChild)
    expect(() => resolveExistingSafeE2EDataRoot({
      selectedPath: protectedChild,
      protectedPaths: [production],
    })).toThrow('overlaps protected production path')
  })
})
