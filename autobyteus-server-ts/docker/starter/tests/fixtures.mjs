// Test fixtures: temporary starter folders and fake server packages whose dist/app.js is a tiny
// HTTP server that takes the C4 arguments. Its behavior is chosen by environment variables:
//   FAKE_SERVER_IGNORE_SIGTERM=1   ignores SIGTERM (a server that does not stop)
//   FAKE_SERVER_CHILD_PID_FILE=…   starts a long-lived child in its process group, writes its pid
//   FAKE_SERVER_EXIT_CODE=…        exits with this code right after it starts listening
import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const FAKE_SERVER = `
import http from 'node:http'
import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'
const arg = (name) => process.argv[process.argv.indexOf(name) + 1]
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
server.listen(Number(arg('--port')), arg('--host'), () => {
  if (process.env.FAKE_SERVER_EXIT_CODE) process.exit(Number(process.env.FAKE_SERVER_EXIT_CODE))
})
`

export function tempDir(prefix) {
  return realpathSync(mkdtempSync(path.join(os.tmpdir(), prefix)))
}

/** A fake server package folder with its server-package.json. */
export function makePackage(dir, { version, arch = process.arch, nodeModuleVersion = process.versions.modules, systemLevel = 1 }) {
  mkdirSync(path.join(dir, 'dist'), { recursive: true })
  writeFileSync(path.join(dir, 'dist', 'app.js'), FAKE_SERVER)
  writeFileSync(path.join(dir, 'package.json'), '{"type":"module"}\n')
  writeFileSync(path.join(dir, 'server-package.json'),
    `${JSON.stringify({ version, arch, nodeModuleVersion, systemLevel, dataMigrations: [] }, null, 2)}\n`)
  return dir
}

/** The paths of one starter in a temporary root: built-in package, system level, packages root, socket. */
export function makeStarterRoot({ builtInVersion, systemLevel = 1 }) {
  const root = tempDir('starter-')
  const paths = {
    builtInPackage: makePackage(path.join(root, 'opt', 'server-package'), { version: builtInVersion }),
    systemLevelFile: path.join(root, 'opt', 'system-level'),
    packagesRoot: path.join(root, 'server-packages'),
    socket: path.join(root, 'run', 'starter.sock'),
  }
  writeFileSync(paths.systemLevelFile, `${systemLevel}\n`)
  return { root, paths, dataDir: path.join(root, 'data') }
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
