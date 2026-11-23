#!/usr/bin/env node
// Fails when a contract package's tracked `dist/` is not what a build of its current source produces (autobyteus-609 REQ-B).
//
// Why: the contract packages (`autobyteus-*-contracts`) commit their `dist/`, which other packages' builds and type checks
// import (TESTING.md, Build outputs). A change to one package's source can change a dependent package's `dist/` too (a
// declaration that inlines another package's types), so rebuilding only the changed package leaves its dependents stale.
//
// What it does:
//   1. Finds every `autobyteus-*-contracts` folder that has tracked files in `dist/` (`git ls-files`).
//   2. Builds them all in one `pnpm --filter … run build`, which runs in workspace dependency order.
//   3. Fails, naming each file, when `git status` shows any change or new file in one of those `dist/` folders: commit
//      what the build wrote (or fix the source), then run it again.
//
// Usage: pnpm check:contract-dist
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' })

const packages = fs.readdirSync(root, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && /^autobyteus-.+-contracts$/.test(entry.name))
  .map((entry) => entry.name)
  .filter((name) => git('ls-files', '--', `${name}/dist`).trim().length > 0)
  .sort()

if (packages.length === 0) {
  console.error('[check:contract-dist] no contract package with a tracked dist/ was found')
  process.exit(1)
}

console.log(`[check:contract-dist] building ${packages.join(', ')}`)
execFileSync('pnpm', [...packages.flatMap((name) => ['--filter', `./${name}`]), 'run', 'build'], { cwd: root, stdio: 'inherit' })

const changed = git('status', '--porcelain', '--untracked-files=all', '--', ...packages.map((name) => `${name}/dist`))
  .split('\n')
  .filter(Boolean)

if (changed.length > 0) {
  console.error(`[check:contract-dist] FAIL: the tracked dist/ differs from a build of the source (${changed.length} files):`)
  for (const line of changed) console.error(`  ${line}`)
  console.error('[check:contract-dist] commit these dist/ changes (every package named, dependents included), then run it again.')
  process.exit(1)
}
console.log(`[check:contract-dist] PASS: the tracked dist/ of ${packages.length} contract packages matches their source.`)
