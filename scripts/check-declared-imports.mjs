#!/usr/bin/env node
// Fails when a workspace package imports a package its own package.json does not declare (autobyteus-345, REQ-008).
//
// Why: pnpm links only the declared packages into a package's node_modules; everything else a file imports resolves through
// pnpm's hidden hoist (node_modules/.pnpm/node_modules) or the repository root, which a bundler or the workspace install
// happens to reach but a `pnpm deploy --prod` package does not. An undeclared import therefore works in development and
// breaks in a release.
//
// Rules, per package given on the command line (a folder relative to the repository root):
//   1. Every package a file imports is declared in dependencies, devDependencies, peerDependencies or optionalDependencies.
//      Node built-ins, the package itself, relative paths, `node:`/`#`/`~`/`@/`/`virtual:` specifiers are not packages.
//   2. The production-only packages: the runtime code of `autobyteus-server-ts` (`src/`, outside test files) may import only
//      dependencies, optionalDependencies and peerDependencies: its release package is made with `pnpm deploy --prod`, which
//      leaves devDependencies out. Tests, scripts and configs may use devDependencies. Type-only imports are exempt (they
//      leave no runtime import).
//   3. An exemption is written in EXEMPT with its reason; there is no other way to silence a finding.
//
// Usage: node scripts/check-declared-imports.mjs [--root <repoRoot>] <pkgDir> [<pkgDir> ...]
import fs from 'node:fs'
import path from 'node:path'
import { builtinModules } from 'node:module'
import { fileURLToPath } from 'node:url'

/** Packages whose runtime code runs from a `--prod` deploy: `src/` may import production dependencies only. */
const PRODUCTION_ONLY_RUNTIME = { 'autobyteus-server-ts': 'src' }

/**
 * Imports that are deliberately not declared by the package that contains the file. Each entry: package folder -> package
 * name -> reason.
 */
const EXEMPT = {
  'autobyteus-web': {
    '@huggingface/tokenizers': 'imported by scripts that run inside the SERVER package folder (packaging validation), where the server declares it',
    'onnxruntime-web': 'same: the packaging scripts validate the server package\'s embedding runtime',
    'type-graphql': 'same: the Windows staging validation imports it from the staged server package',
    '@prisma/client': 'tests/e2e/token-statistics-seed.mjs seeds the server database with the server\'s own client',
  },
}

const SKIP_DIRS = new Set([
  'node_modules', '.nuxt', '.output', 'dist', 'dist-electron', 'dist-mobile', 'electron-dist', 'release', 'tickets', 'docs', '.git',
  'coverage', 'resources', 'build', '.server-packaging-stage', 'generated',
])
const SOURCE_FILE = /\.(m?[jt]sx?|vue|cjs|mts|cts)$/
const TEST_FILE = /(\.(test|spec)\.[cm]?[jt]sx?$)|(^|\/)(__tests__|tests|test)\//
const BUILTINS = new Set(builtinModules)

// A static statement starts its line (so text inside a string, such as a fixture file's source, is not an import); a call
// (`import(...)`, `require(...)`, `vi.mock(...)`) is not a method of something else and not inside a quoted string.
const STATEMENT = /^[ \t]*(import|export)\s+(type\s+)?(?:([\w*${}\s,]*?)\s+from\s+)?(['"])([^'"\n]+)\4|(?<![.\w'"`$])(?:import|require|vi\.mock|vi\.doMock)\s*\(\s*(['"])([^'"\n]+)\6/gm

function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

function packageNameOf(specifier) {
  if (specifier.startsWith('.') || specifier.startsWith('/') || specifier.startsWith('~') || specifier.startsWith('#') ||
      specifier.startsWith('node:') || specifier.startsWith('virtual:') || specifier.includes('${')) return null
  const name = specifier.startsWith('@') ? specifier.split('/').slice(0, 2).join('/') : specifier.split('/')[0]
  if (!/^(@[a-z0-9._-]+\/)?[a-z0-9._-]+$/i.test(name) || BUILTINS.has(name)) return null
  return name
}

/** True when every specifier inside the braces carries `type` (`import { type A, type B } from 'x'`). */
function onlyTypeSpecifiers(clause) {
  const braces = clause?.match(/\{([^}]*)\}/)
  if (!braces || clause.replace(braces[0], '').replace(/[\s,]/g, '')) return false
  const specifiers = braces[1].split(',').map(part => part.trim()).filter(Boolean)
  return specifiers.length > 0 && specifiers.every(part => /^type\s/.test(part))
}

export function importsOf(text) {
  const found = []
  for (const match of stripComments(text).matchAll(STATEMENT)) {
    const specifier = match[5] ?? match[7]
    const name = packageNameOf(specifier ?? '')
    if (!name) continue
    const typeOnly = Boolean(match[2]) || onlyTypeSpecifiers(match[3])
    found.push({ name, typeOnly })
  }
  return found
}

function* walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) yield* walk(fullPath)
    else if (SOURCE_FILE.test(entry.name)) yield fullPath
  }
}

/** The findings for one package folder: `{ file, name, problem }`. */
export function checkPackage(repoRoot, packageDir) {
  const root = path.join(repoRoot, packageDir)
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
  const production = new Set([
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.optionalDependencies ?? {}),
    ...Object.keys(manifest.peerDependencies ?? {}),
  ])
  const declared = new Set([...production, ...Object.keys(manifest.devDependencies ?? {})])
  const exempt = EXEMPT[packageDir] ?? {}
  const runtimeFolder = PRODUCTION_ONLY_RUNTIME[packageDir]
  const findings = []

  for (const file of walk(root)) {
    const relative = path.relative(root, file).split(path.sep).join('/')
    const isRuntime = runtimeFolder !== undefined && relative.startsWith(`${runtimeFolder}/`) && !TEST_FILE.test(relative)
    for (const { name, typeOnly } of importsOf(fs.readFileSync(file, 'utf8'))) {
      if (name === manifest.name || exempt[name]) continue
      if (!declared.has(name)) {
        findings.push({ file: `${packageDir}/${relative}`, name, problem: 'is imported but not declared in package.json' })
      } else if (isRuntime && !typeOnly && !production.has(name)) {
        findings.push({
          file: `${packageDir}/${relative}`,
          name,
          problem: 'is a development dependency but runtime code imports it (the --prod release package would not contain it)',
        })
      }
    }
  }
  return findings
}

function main() {
  const args = process.argv.slice(2)
  const rootFlag = args.indexOf('--root')
  const repoRoot = rootFlag >= 0
    ? path.resolve(args.splice(rootFlag, 2)[1])
    : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  if (args.length === 0) {
    console.error('Usage: node scripts/check-declared-imports.mjs [--root <repoRoot>] <pkgDir> [<pkgDir> ...]')
    process.exit(2)
  }
  const findings = args.flatMap(packageDir => checkPackage(repoRoot, packageDir))
  for (const finding of findings) console.error(`${finding.file}: ${finding.name} ${finding.problem}`)
  if (findings.length > 0) {
    console.error(`\n${findings.length} undeclared or misclassified import(s). Declare the package in the importing package's package.json.`)
    process.exit(1)
  }
  console.log(`Imports are declared: ${args.join(', ')}`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
