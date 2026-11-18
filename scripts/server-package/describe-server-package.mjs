#!/usr/bin/env node
// The one writer of a server package's own description (`server-package.json`) and of its
// published package description (`autobyteus-server-<version>-linux-<arch>.json`). Both are
// frozen cross-version contracts (DESIGN.md rule 9, node-update exception): fields may be
// added as optional values, never renamed or removed. Node built-ins only.
//
//   node describe-server-package.mjs package-json --package-dir <dir> --version <X.Y.Z[-beta.N]>
//       --system-level-file <system-level.json>
//     Writes <dir>/server-package.json for the package built in this process's Node and
//     architecture (run in the image build, where the package's native modules are built).
//     Refuses a package with a symbolic link that points outside it.
//
//   node describe-server-package.mjs description --package-dir <dir> --archive <file>
//       --version <X.Y.Z[-beta.N]> --out <file>
//     Writes the package description: server-package.json plus `archive`. Refuses when the
//     package is not of that version or the archive is not named for it.
import { createHash } from 'node:crypto'
import { createReadStream, readdirSync, readlinkSync, lstatSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import path from 'node:path'

const RELEASE_VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-beta\.[1-9]\d*)?$/
const PACKAGE_JSON_FILE = 'server-package.json'

function fail(message) {
  console.error(`describe-server-package: ${message}`)
  process.exit(1)
}

function parseOptions(argv, names) {
  const options = {}
  for (let i = 0; i < argv.length; i += 2) {
    const name = argv[i]?.replace(/^--/, '')
    if (!names.includes(name) || argv[i + 1] === undefined) fail(`unknown or incomplete option '${argv[i]}'`)
    options[name] = argv[i + 1]
  }
  for (const name of names) if (!options[name]) fail(`--${name} is required`)
  return options
}

function releaseVersion(value) {
  if (!RELEASE_VERSION.test(value)) fail(`'${value}' is not a release version (X.Y.Z or X.Y.Z-beta.N)`)
  return value
}

function archiveName(version, arch) {
  return `autobyteus-server-${version}-linux-${arch}.tar.gz`
}

function directoryNames(folder) {
  let entries
  try {
    entries = readdirSync(folder, { withFileTypes: true })
  } catch {
    fail(`migration folder ${folder} is missing`)
  }
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name)
}

/** One entry per migration the package carries: Prisma (database) and app-data migrations. */
function dataMigrations(packageDir) {
  return [
    ...directoryNames(path.join(packageDir, 'prisma', 'migrations')).map((name) => `prisma/${name}`),
    ...directoryNames(path.join(packageDir, 'dist', 'app-data-migrations', 'migrations')).map((name) => `app-data/${name}`),
  ].sort()
}

/** Symbolic links that point outside the package: they break once the folder is moved or unpacked. */
function escapingLinks(packageDir, folder = packageDir) {
  const found = []
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    const entryPath = path.join(folder, entry.name)
    if (entry.isDirectory()) found.push(...escapingLinks(packageDir, entryPath))
    else if (entry.isSymbolicLink() && !path.resolve(folder, readlinkSync(entryPath)).startsWith(packageDir + path.sep)) {
      found.push(path.relative(packageDir, entryPath))
    }
  }
  return found
}

function writePackageJson({ 'package-dir': packageDir, version, 'system-level-file': systemLevelFile }) {
  const outside = escapingLinks(path.resolve(packageDir))
  if (outside.length > 0) fail(`the package must be self-contained; these links point outside it: ${outside.join(', ')}`)
  const systemLevel = JSON.parse(readFileSync(systemLevelFile, 'utf8')).level
  if (!Number.isInteger(systemLevel) || systemLevel < 1) fail(`${systemLevelFile} has no whole-number level`)
  const description = {
    version: releaseVersion(version),
    arch: process.arch,
    nodeModuleVersion: process.versions.modules,
    systemLevel,
    dataMigrations: dataMigrations(packageDir),
  }
  writeFileSync(path.join(packageDir, PACKAGE_JSON_FILE), `${JSON.stringify(description, null, 2)}\n`)
  console.log(`Wrote ${PACKAGE_JSON_FILE}: ${description.version} linux-${description.arch}, ` +
    `Node modules ${description.nodeModuleVersion}, system level ${systemLevel}, ${description.dataMigrations.length} migrations`)
}

/** Bytes of the regular files in a folder, as unpacked (symbolic links counted as nothing). */
function unpackedSize(folder) {
  let total = 0
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    const entryPath = path.join(folder, entry.name)
    if (entry.isDirectory()) total += unpackedSize(entryPath)
    else if (entry.isFile()) total += lstatSync(entryPath).size
  }
  return total
}

function sha256(file) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    createReadStream(file).on('error', reject).on('data', (chunk) => hash.update(chunk)).on('end', () => resolve(hash.digest('hex')))
  })
}

async function writeDescription({ 'package-dir': packageDir, archive, version, out }) {
  const packageJson = JSON.parse(readFileSync(path.join(packageDir, PACKAGE_JSON_FILE), 'utf8'))
  if (packageJson.version !== releaseVersion(version)) {
    fail(`the package is version ${packageJson.version}, not ${version}`)
  }
  const expectedName = archiveName(version, packageJson.arch)
  if (path.basename(archive) !== expectedName) fail(`the archive must be named ${expectedName}`)
  const description = {
    ...packageJson,
    archive: {
      name: expectedName,
      sha256: await sha256(archive),
      size: statSync(archive).size,
      unpackedSize: unpackedSize(packageDir),
    },
  }
  writeFileSync(out, `${JSON.stringify(description, null, 2)}\n`)
  console.log(`Wrote ${path.basename(out)}: ${expectedName}, ${description.archive.size} bytes, sha256 ${description.archive.sha256}`)
}

const [command, ...argv] = process.argv.slice(2)
if (command === 'package-json') {
  writePackageJson(parseOptions(argv, ['package-dir', 'version', 'system-level-file']))
} else if (command === 'description') {
  await writeDescription(parseOptions(argv, ['package-dir', 'archive', 'version', 'out']))
} else {
  fail('usage: describe-server-package.mjs package-json|description [options]')
}
