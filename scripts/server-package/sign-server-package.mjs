#!/usr/bin/env node
// Signs a server package description with the AutoByteus release key (Ed25519) and writes the
// signature next to it as `<description>.sig`: the base64 signature over the file's exact bytes, with
// no line break.
// The private key comes only from the environment variable SERVER_PACKAGE_SIGNING_KEY (PEM, the
// GitHub Actions secret of the same name); it is never printed, written or put into a message.
// The signature is then checked with the public key the image carries, so a secret that does not
// match it fails the release instead of producing packages no node accepts. Node built-ins only.
//
//   SERVER_PACKAGE_SIGNING_KEY=… node sign-server-package.mjs --description <file> --public-key <pem>
import { createPrivateKey, createPublicKey, sign, verify } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'

function fail(message) {
  console.error(`sign-server-package: ${message}`)
  process.exit(1)
}

const argv = process.argv.slice(2)
const option = (name) => {
  const index = argv.indexOf(`--${name}`)
  const value = index < 0 ? undefined : argv[index + 1]
  if (!value) fail(`--${name} is required`)
  return value
}
const descriptionFile = option('description')
const publicKeyFile = option('public-key')

const secret = process.env.SERVER_PACKAGE_SIGNING_KEY
if (!secret) fail('SERVER_PACKAGE_SIGNING_KEY is not set')

let privateKey
try {
  privateKey = createPrivateKey(secret)
} catch {
  fail('SERVER_PACKAGE_SIGNING_KEY is not a readable private key')
}
if (privateKey.asymmetricKeyType !== 'ed25519') fail('SERVER_PACKAGE_SIGNING_KEY is not an Ed25519 key')

const description = readFileSync(descriptionFile)
const signature = sign(null, description, privateKey)
if (!verify(null, description, createPublicKey(readFileSync(publicKeyFile)), signature)) {
  fail(`SERVER_PACKAGE_SIGNING_KEY does not match the public key ${publicKeyFile}`)
}
writeFileSync(`${descriptionFile}.sig`, signature.toString('base64'))
console.log(`Signed ${descriptionFile}; the signature verifies with ${publicKeyFile}`)
