// Server packaging without the Claude Agent SDK's platform binaries (autobyteus-514). Used by prepare-server.mjs
// (Windows) through its export, and by prepare-server.sh (macOS, Linux) and the Docker server package
// (Dockerfile.monorepo) as `node claude-agent-sdk-binary-packaging.mjs <stage>`.
//
// `@anthropic-ai/claude-agent-sdk` lists one optional package per platform (`@anthropic-ai/claude-agent-sdk-darwin-arm64`
// and the like, ~200 MB each) holding Anthropic's Claude Code program. The SDK looks for it only when no
// `pathToClaudeCodeExecutable` is given, and the server always gives one: Claude runs use the user's installed
// `claude` (`claude-sdk-executable-path.ts`). So the packaged copy is never loaded (and the re-signed macOS copy
// cannot even run). The prune removes every such package, folder and link, in the pnpm layout (`node_modules/.pnpm`)
// and the flat npm layout (Windows), and fails the build if the SDK package itself is gone.
import { lstat, readdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const SDK_SCOPE = '@anthropic-ai'
const SDK_PACKAGE = 'claude-agent-sdk'
/** A platform package's name inside the `@anthropic-ai` scope; never the SDK package `claude-agent-sdk` itself. */
const PLATFORM_PACKAGE = /^claude-agent-sdk-(darwin|linux|win32|android)-/
/** A platform package's folder in `node_modules/.pnpm` (`@anthropic-ai+claude-agent-sdk-darwin-arm64@0.3.280`). */
const PLATFORM_PNPM_FOLDER = /^@anthropic-ai\+claude-agent-sdk-(darwin|linux|win32|android)-/

const entriesOf = (dir) => readdir(dir, { withFileTypes: true }).catch(() => [])

/** Bytes of a file, a link (its own size) or a folder, never following links. */
async function sizeOf(target) {
  const info = await lstat(target)
  if (!info.isDirectory()) return info.size
  let total = 0
  for (const entry of await entriesOf(target)) total += await sizeOf(path.join(target, entry.name))
  return total
}

async function remove(target) {
  const size = await sizeOf(target)
  await rm(target, { recursive: true, force: true })
  return size
}

/** Walks a `node_modules` folder: its scopes, its packages' own `node_modules`, and pnpm's `.pnpm` store. */
async function pruneNodeModules(dir) {
  let removed = 0
  for (const entry of await entriesOf(dir)) {
    const entryPath = path.join(dir, entry.name)
    if (entry.isSymbolicLink() || !entry.isDirectory()) continue
    if (entry.name === '.pnpm') removed += await prunePnpmStore(entryPath)
    else if (entry.name.startsWith('@')) removed += await pruneScope(entryPath, entry.name)
    else removed += await pruneNodeModules(path.join(entryPath, 'node_modules'))
  }
  return removed
}

async function pruneScope(dir, scope) {
  let removed = 0
  for (const entry of await entriesOf(dir)) {
    const entryPath = path.join(dir, entry.name)
    if (scope === SDK_SCOPE && PLATFORM_PACKAGE.test(entry.name)) removed += await remove(entryPath)
    else if (entry.isDirectory()) removed += await pruneNodeModules(path.join(entryPath, 'node_modules'))
  }
  return removed
}

async function prunePnpmStore(dir) {
  let removed = 0
  for (const entry of await entriesOf(dir)) {
    const entryPath = path.join(dir, entry.name)
    if (PLATFORM_PNPM_FOLDER.test(entry.name)) removed += await remove(entryPath)
    else if (entry.name === 'node_modules') removed += await pruneNodeModules(entryPath)
    else if (entry.isDirectory()) removed += await pruneNodeModules(path.join(entryPath, 'node_modules'))
  }
  return removed
}

/**
 * Removes every Claude Agent SDK platform binary package (folders and links, any depth) from the stage's
 * `node_modules`; returns the bytes removed. Throws when `@anthropic-ai/claude-agent-sdk` is not in the stage afterwards.
 */
export async function pruneClaudeAgentSdkBinaries(stageDir) {
  const nodeModules = path.join(stageDir, 'node_modules')
  const removed = await pruneNodeModules(nodeModules)
  const sdkManifest = path.join(nodeModules, SDK_SCOPE, SDK_PACKAGE, 'package.json')
  if (!(await lstat(sdkManifest).catch(() => null))) {
    throw new Error(`${SDK_SCOPE}/${SDK_PACKAGE} is missing from ${nodeModules}`)
  }
  return removed
}

// CLI (prepare-server.sh, Dockerfile.monorepo): prune the stage's Claude Agent SDK platform binaries.
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const stage = process.argv[2]
  if (!stage) throw new Error('Usage: node claude-agent-sdk-binary-packaging.mjs <server stage dir>')
  const removed = await pruneClaudeAgentSdkBinaries(stage)
  console.log(`Removed ${Math.round(removed / 1e6)} MB of Claude Agent SDK platform binaries`)
}
