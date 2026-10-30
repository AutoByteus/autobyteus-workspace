// Test fixtures: temporary starter folders and fake server packages whose dist/app.js is a tiny
// HTTP server that takes the C4 arguments. A package's dist/behavior.json can make it exit at once
// (exitImmediately), write into its data folder or exit when the starter runs it (writeDataFile,
// exitWhenSupervised: not in a self-check, which has no starter socket) or listen late
// (listenAfterMs). The test process can also set these environment variables:
//   FAKE_SERVER_IGNORE_SIGTERM=1   ignores SIGTERM (a server that does not stop)
//   FAKE_SERVER_CHILD_PID_FILE=…   starts a long-lived child in its process group, writes its pid
//   FAKE_SERVER_EXIT_CODE=…        exits with this code right after it starts listening
import { generateKeyPairSync } from 'node:crypto'
import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const FAKE_SERVER = `
import http from 'node:http'
import { spawn } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
const arg = (name) => process.argv[process.argv.indexOf(name) + 1]
const behaviorFile = new URL('./behavior.json', import.meta.url)
const behavior = existsSync(behaviorFile) ? JSON.parse(readFileSync(behaviorFile, 'utf8')) : {}
const supervised = Boolean(process.env.AUTOBYTEUS_STARTER_SOCKET)
if (behavior.exitImmediately !== undefined) { console.error('fake server: cannot start'); process.exit(behavior.exitImmediately) }
if (behavior.writeDataFile && supervised) writeFileSync(path.join(arg('--data-dir'), behavior.writeDataFile), 'written by the new version')
if (behavior.exitWhenSupervised !== undefined && supervised) process.exit(behavior.exitWhenSupervised)
const server = http.createServer((request, response) => {
  response.writeHead(200, { 'content-type': 'application/json' })
  response.end(JSON.stringify({ status: 'ok', socket: process.env.AUTOBYTEUS_STARTER_SOCKET, args: process.argv.slice(2), cwd: process.cwd() }))
})
if (process.env.FAKE_SERVER_IGNORE_SIGTERM === '1') process.on('SIGTERM', () => {})
else process.on('SIGTERM', () => server.close(() => process.exit(0)))
if (process.env.FAKE_SERVER_CHILD_PID_FILE) {
  const child = spawn(process.execPath, ['-e', 'process.on("SIGTERM", () => {}); setInterval(() => {}, 1000)'], { stdio: 'ignore' })
  writeFileSync(process.env.FAKE_SERVER_CHILD_PID_FILE, String(child.pid))
}
setTimeout(() => server.listen(Number(arg('--port')), arg('--host'), () => {
  if (process.env.FAKE_SERVER_EXIT_CODE) process.exit(Number(process.env.FAKE_SERVER_EXIT_CODE))
}), behavior.listenAfterMs ?? 0)
`

export function tempDir(prefix) {
  return realpathSync(mkdtempSync(path.join(os.tmpdir(), prefix)))
}

/** A fake server package folder with its server-package.json. */
export function makePackage(dir, { version, arch = process.arch, nodeModuleVersion = process.versions.modules, systemLevel = 1, dataMigrations = [], behavior }) {
  mkdirSync(path.join(dir, 'dist'), { recursive: true })
  writeFileSync(path.join(dir, 'dist', 'app.js'), FAKE_SERVER)
  if (behavior) writeFileSync(path.join(dir, 'dist', 'behavior.json'), JSON.stringify(behavior))
  writeFileSync(path.join(dir, 'package.json'), '{"type":"module"}\n')
  writeFileSync(path.join(dir, 'server-package.json'),
    `${JSON.stringify({ version, arch, nodeModuleVersion, systemLevel, dataMigrations }, null, 2)}\n`)
  return dir
}

/**
 * The paths of one starter in a temporary root: built-in package, system level, public key, packages
 * root, socket and a mountinfo naming the packages root as its own mount (unless `ownVolume` is false).
 * Returns the matching private key for signing test packages.
 */
export function makeStarterRoot({ builtInVersion, builtInMigrations = [], systemLevel = 1, ownVolume = true }) {
  const root = tempDir('starter-')
  const paths = {
    builtInPackage: makePackage(path.join(root, 'opt', 'server-package'), { version: builtInVersion, dataMigrations: builtInMigrations }),
    systemLevelFile: path.join(root, 'opt', 'system-level'),
    publicKey: path.join(root, 'opt', 'signing-key.pem'),
    packagesRoot: path.join(root, 'server-packages'),
    socket: path.join(root, 'run', 'starter.sock'),
    mountinfo: path.join(root, 'mountinfo'),
  }
  writeFileSync(paths.systemLevelFile, `${systemLevel}\n`)
  const { publicKey, privateKey } = generateKeyPairSync('ed25519')
  writeFileSync(paths.publicKey, publicKey.export({ type: 'spki', format: 'pem' }))
  writeFileSync(paths.mountinfo, [
    '22 1 0:21 / / rw,relatime - overlay overlay rw',
    ...(ownVolume ? [`88 22 254:1 /volumes/sp ${paths.packagesRoot} rw,relatime - ext4 /dev/vda1 rw`] : []),
  ].join('\n') + '\n')
  mkdirSync(path.join(root, 'data'), { recursive: true })
  return { root, paths, dataDir: path.join(root, 'data'), privateKey }
}

export function writeState(paths, state) {
  mkdirSync(paths.packagesRoot, { recursive: true })
  writeFileSync(path.join(paths.packagesRoot, 'state.json'), `${JSON.stringify(state)}\n`)
}

export function installPackage(paths, options) {
  return makePackage(path.join(paths.packagesRoot, 'packages', options.version), options)
}

/** A free TCP port on 127.0.0.1. */
export async function freePort() {
  const net = await import('node:net')
  return new Promise((resolve) => {
    const server = net.createServer()
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address()
      server.close(() => resolve(port))
    })
  })
}

export const memoryLog = () => {
  const entries = []
  const log = (event, fields = {}) => entries.push({ event, ...fields })
  log.entries = entries
  return log
}

/**
 * A local release source like GitHub's: <base>/download/v<version>/<asset>, <base>/latest (302 to the
 * newest stable tag) and <base>.atom. Files are served from `dir`. Returns { base, dir, close }.
 */
export async function startReleaseSource({ stable, feed = [] } = {}) {
  const http = await import('node:http')
  const { readFile } = await import('node:fs/promises')
  const dir = tempDir('release-source-')
  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url, 'http://source')
    if (url.pathname === '/releases/latest') {
      response.writeHead(302, { location: `http://source/releases/tag/v${stable}` })
      return response.end()
    }
    if (url.pathname === '/releases.atom') {
      response.writeHead(200, { 'content-type': 'application/atom+xml' })
      return response.end(feed.map((version) => `<entry><link href="https://github.com/o/r/releases/tag/v${version}"/></entry>`).join('\n'))
    }
    try {
      const bytes = await readFile(path.join(dir, decodeURIComponent(url.pathname.replace(/^\/releases\/download\//, ''))))
      response.writeHead(200)
      response.end(bytes)
    } catch {
      response.writeHead(404)
      response.end('Not Found')
    }
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  return { base: `http://127.0.0.1:${server.address().port}/releases`, dir, close: () => new Promise((resolve) => server.close(resolve)) }
}

/**
 * Builds a package, archives it with tar, and publishes archive, description and signature in the
 * release source for `version` (as the release workflow does). `describe` may change the description
 * before it is signed; `tamper` may change { descriptionBytes, archiveBytes } after. Returns the
 * description.
 */
export async function publishPackage(source, privateKey, { version, publishAs = version, tamper, describe = (d) => d, ...packageOptions }) {
  const { createHash, sign } = await import('node:crypto')
  const { execFileSync } = await import('node:child_process')
  const { readFileSync, statSync } = await import('node:fs')
  const work = tempDir('package-')
  const packageDir = makePackage(path.join(work, 'package'), { version, ...packageOptions })
  const arch = packageOptions.arch ?? process.arch
  const name = `autobyteus-server-${version}-linux-${arch}`
  const archiveFile = path.join(work, `${name}.tar.gz`)
  execFileSync('tar', ['-czf', archiveFile, '-C', packageDir, '.'])
  let archiveBytes = readFileSync(archiveFile)
  const unpackedSize = ['package.json', 'server-package.json', 'dist/app.js', 'dist/behavior.json']
    .map((file) => { try { return statSync(path.join(packageDir, file)).size } catch { return 0 } }).reduce((a, b) => a + b, 0)
  let description = {
    ...JSON.parse(readFileSync(path.join(packageDir, 'server-package.json'), 'utf8')),
    archive: { name: `${name}.tar.gz`, sha256: createHash('sha256').update(archiveBytes).digest('hex'), size: archiveBytes.length, unpackedSize },
  }
  description = describe(description)
  const descriptionBytes = Buffer.from(`${JSON.stringify(description, null, 2)}\n`)
  const signature = sign(null, descriptionBytes, privateKey).toString('base64')
  let publishedDescription = descriptionBytes
  if (tamper) ({ descriptionBytes: publishedDescription = descriptionBytes, archiveBytes = archiveBytes } = tamper({ descriptionBytes, archiveBytes }))
  const target = path.join(source.dir, `v${publishAs}`)
  mkdirSync(target, { recursive: true })
  const publishedName = `autobyteus-server-${publishAs}-linux-${arch}`
  writeFileSync(path.join(target, `${publishedName}.tar.gz`), archiveBytes)
  writeFileSync(path.join(target, `${publishedName}.json`), publishedDescription)
  writeFileSync(path.join(target, `${publishedName}.json.sig`), signature)
  return description
}

/** Runs cli.mjs against a socket: { exitCode, body } of its one JSON line. */
export async function runCli(socket, ...args) {
  const { execFile } = await import('node:child_process')
  const cliPath = new URL('../cli.mjs', import.meta.url).pathname
  return new Promise((resolve) => {
    execFile(process.execPath, [cliPath, ...args], { env: { ...process.env, AUTOBYTEUS_STARTER_SOCKET: socket } }, (error, stdout) => {
      const lines = stdout.trim().split('\n')
      resolve({ exitCode: error ? error.code : 0, lines, body: JSON.parse(lines[0]) })
    })
  })
}

export async function waitFor(check, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    const value = await check()
    if (value) return value
    if (Date.now() > deadline) throw new Error('condition not met in time')
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
}
