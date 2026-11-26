#!/usr/bin/env node
// API/E2E (autobyteus-516) temporary probe: a development extension catalog for the packaged desktop and a Docker node.
//
//   node dev-catalog.mjs --extensions-repo=<autobyteus-extensions checkout> --state-dir=<new folder> [--port=<n>]
//
// Signs two catalogs with one throwaway Ed25519 key (generated here, kept only in memory):
//   /host/extensions-catalog.json    for the desktop's own node: voice-input only (the Stage 1 catalog), URLs on 127.0.0.1
//   /docker/extensions-catalog.json  for a Docker node: voice-input + three test extensions, URLs on host.docker.internal
// Voice Input packages: 1.0.0 (the repository's pack), 1.0.1 (version changed), 1.0.2 (broken: pins voice runtime 0.3.99,
// which does not exist, so install(ctx) fails). The catalogs start at 1.0.0; POST /control/voice?version=1.0.1 publishes
// another version (a catalog release). Writes <state-dir>/catalog.json (URLs, public key PEM, digests) and serves until killed.
import fs from 'node:fs/promises'
import http from 'node:http'
import path from 'node:path'
import { createHash, generateKeyPairSync, sign } from 'node:crypto'
import { fileURLToPath, pathToFileURL } from 'node:url'

const arg = (name, fallback) => process.argv.find((item) => item.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback
const repo = arg('extensions-repo')
const stateDir = arg('state-dir')
const port = Number(arg('port', '0'))
const here = path.dirname(fileURLToPath(import.meta.url))
if (!repo || !stateDir) { console.error('usage: dev-catalog.mjs --extensions-repo=<dir> --state-dir=<dir>'); process.exit(2) }

const { packageFiles } = await import(pathToFileURL(path.join(repo, 'scripts', 'lib', 'extension-package.mjs')).href)
const { packTarGz } = await import(pathToFileURL(path.join(repo, 'scripts', 'lib', 'tar-gz.mjs')).href)
const { packExtension } = await import(pathToFileURL(path.join(repo, 'scripts', 'pack.mjs')).href)
await fs.mkdir(stateDir, { recursive: true })
const work = path.join(stateDir, 'packages')

const packFolder = async (folder) => {
  const description = JSON.parse(await fs.readFile(path.join(folder, 'extension.json'), 'utf8'))
  const bytes = packTarGz(await packageFiles(folder))
  return { name: `${description.id}-${description.version}.tar.gz`, bytes, sha256: createHash('sha256').update(bytes).digest('hex'), description }
}
const voiceVariant = async (version, runtimeVersion) => {
  const folder = path.join(work, `voice-input-${version}`)
  await fs.cp(path.join(repo, 'voice-input'), folder, { recursive: true })
  const file = path.join(folder, 'extension.json')
  await fs.writeFile(file, `${JSON.stringify({ ...JSON.parse(await fs.readFile(file, 'utf8')), version }, null, 2)}\n`)
  if (runtimeVersion) {
    const server = path.join(folder, 'server', 'index.mjs')
    const source = await fs.readFile(server, 'utf8')
    const pinned = source.replace(/const RUNTIME_VERSION = '[^']+'/, `const RUNTIME_VERSION = '${runtimeVersion}'`)
    if (pinned === source) throw new Error('RUNTIME_VERSION not found')
    await fs.writeFile(server, pinned)
  }
  return packFolder(folder)
}

const released = await packExtension('voice-input', { outDir: work })
const voice = {
  '1.0.0': { name: path.basename(released.file), bytes: await fs.readFile(released.file), sha256: released.sha256, description: released.description },
  '1.0.1': await voiceVariant('1.0.1'),
  '1.0.2': await voiceVariant('1.0.2', '0.3.99'),
}
const testExtensions = await Promise.all(['hello-node', 'no-arm-build', 'broken-status'].map((id) => packFolder(path.join(here, 'test-extensions', id))))
const keys = generateKeyPairSync('ed25519')
const files = new Map()
for (const pkg of [...Object.values(voice), ...testExtensions]) files.set(pkg.name, pkg.bytes)

const server = http.createServer()
await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve))
const bound = server.address().port
const bases = { host: `http://127.0.0.1:${bound}`, docker: `http://host.docker.internal:${bound}` }
let voiceVersion = '1.0.0'
const entry = (pkg, base) => ({ ...pkg.description, packageUrl: `${base}/pkg/${pkg.name}`, sha256: pkg.sha256 })
const publish = () => {
  for (const [kind, base] of Object.entries(bases)) {
    const list = [entry(voice[voiceVersion], base), ...(kind === 'docker' ? testExtensions.map((pkg) => entry(pkg, base)) : [])]
    const bytes = Buffer.from(JSON.stringify({ extensions: list }))
    files.set(`${kind}/extensions-catalog.json`, bytes)
    files.set(`${kind}/extensions-catalog.json.sig`, Buffer.from(sign(null, bytes, keys.privateKey).toString('base64')))
  }
}
publish()
const requests = []
server.on('request', (request, response) => {
  const url = new URL(request.url, bases.host)
  requests.push(`${new Date().toISOString()} ${request.method} ${url.pathname}${url.search}`)
  if (request.method === 'POST' && url.pathname === '/control/voice') {
    const version = url.searchParams.get('version')
    if (!voice[version]) { response.statusCode = 400; response.end('unknown version'); return }
    voiceVersion = version
    publish()
    response.end(JSON.stringify({ voiceVersion }))
    return
  }
  if (url.pathname === '/control/requests') { response.end(requests.join('\n')); return }
  const key = url.pathname.startsWith('/pkg/') ? url.pathname.slice(5) : url.pathname.slice(1)
  const body = files.get(key)
  if (!body) { response.statusCode = 404; response.end(); return }
  response.end(body)
})
const info = {
  pid: process.pid, port: bound,
  hostCatalogUrl: `${bases.host}/host/extensions-catalog.json`, dockerCatalogUrl: `${bases.docker}/docker/extensions-catalog.json`,
  publicKeyPem: keys.publicKey.export({ type: 'spki', format: 'pem' }).toString(),
  packages: Object.fromEntries([...Object.values(voice), ...testExtensions].map((pkg) => [pkg.name, pkg.sha256])),
}
await fs.writeFile(path.join(stateDir, 'catalog.json'), JSON.stringify(info, null, 2))
console.log(JSON.stringify({ ready: true, port: bound }))
