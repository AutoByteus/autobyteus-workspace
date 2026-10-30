#!/usr/bin/env node
// One-time creation (or rotation) of the server package signing key pair.
//
// Writes the Ed25519 public key to autobyteus-server-ts/docker/server-package-signing-key.pem,
// which images carry to verify server packages, and hands the private key on standard input to
// `gh secret set SERVER_PACKAGE_SIGNING_KEY`, the secret the Server Docker Release workflow signs
// with. The private key is never printed or written to disk. Needs `gh` signed in with rights to
// set repository secrets. A new key pair makes every older image refuse newer packages, so an
// existing public key is replaced only with --replace (rotation; users then need a new image).
// Node built-ins only.
//
//   node scripts/server-package/generate-signing-key.mjs [--repo AutoByteus/autobyteus-workspace] [--replace]
import { spawnSync } from 'node:child_process'
import { generateKeyPairSync } from 'node:crypto'
import { existsSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SECRET_NAME = 'SERVER_PACKAGE_SIGNING_KEY'
const publicKeyPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../autobyteus-server-ts/docker/server-package-signing-key.pem',
)

function fail(message) {
  console.error(`generate-signing-key: ${message}`)
  process.exit(1)
}

const argv = process.argv.slice(2)
const repoIndex = argv.indexOf('--repo')
const repo = repoIndex < 0 ? 'AutoByteus/autobyteus-workspace' : argv[repoIndex + 1]
if (!repo) fail('--repo needs a value')
if (existsSync(publicKeyPath) && !argv.includes('--replace')) {
  fail(`${publicKeyPath} exists; pass --replace to rotate the key (every older image then refuses newer packages)`)
}

const { publicKey, privateKey } = generateKeyPairSync('ed25519')
const setSecret = spawnSync('gh', ['secret', 'set', SECRET_NAME, '--repo', repo], {
  input: privateKey.export({ type: 'pkcs8', format: 'pem' }),
  stdio: ['pipe', 'inherit', 'inherit'],
})
if (setSecret.status !== 0) fail(`gh secret set ${SECRET_NAME} failed; the public key was not written`)

writeFileSync(publicKeyPath, publicKey.export({ type: 'spki', format: 'pem' }))
console.log(`Set the secret ${SECRET_NAME} on ${repo} and wrote the public key ${publicKeyPath}. Commit the public key.`)
