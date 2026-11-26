// API-02 (autobyteus-657): independent check of the built-in key against what AutoByteus/autobyteus-extensions publishes,
// with Node's crypto only (not the app's verifier). Downloads go to argv[3]; nothing downloaded is executed.
import { createHash, createPublicKey, verify } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
const [worktree, dl] = process.argv.slice(2)
const source = await fs.readFile(path.join(worktree, 'autobyteus-server-ts/src/extensions/catalog/extension-catalog-source.ts'), 'utf8')
const builtIn = source.match(/EXTENSIONS_CATALOG_PUBLIC_KEY_PEM = `([^`]*)`/)[1]
const get = async (url) => { const r = await fetch(url, { redirect: 'follow' }); if (!r.ok) throw new Error(`${url} → HTTP ${r.status}`); return Buffer.from(await r.arrayBuffer()) }
const out = {}
const repoKey = await get('https://raw.githubusercontent.com/AutoByteus/autobyteus-extensions/main/catalog-public-key.pem')
out.keyEqualsRepositoryBytes = repoKey.toString('utf8') === builtIn
const der = createPublicKey(builtIn).export({ type: 'spki', format: 'der' })
out.keyType = createPublicKey(builtIn).asymmetricKeyType
out.fingerprint = createHash('sha256').update(der).digest('hex')
const base = 'https://github.com/AutoByteus/autobyteus-extensions/releases/download/catalog/extensions-catalog.json'
const catalog = await get(base), sig = await get(`${base}.sig`)
await fs.writeFile(path.join(dl, 'extensions-catalog.json'), catalog); await fs.writeFile(path.join(dl, 'extensions-catalog.json.sig'), sig)
out.catalogBytes = catalog.length
out.signatureVerifiesWithBuiltInKey = verify(null, catalog, createPublicKey(builtIn), Buffer.from(sig.toString('utf8').trim(), 'base64'))
const fixture = path.join(worktree, 'autobyteus-server-ts/tests/fixtures/published-extensions-catalog')
out.fixtureEqualsPublished = { catalog: (await fs.readFile(path.join(fixture, 'extensions-catalog.json'))).equals(catalog), sig: (await fs.readFile(path.join(fixture, 'extensions-catalog.json.sig'))).equals(sig) }
const tampered = Buffer.concat([catalog, Buffer.from(' ')])
out.tamperedVerifies = verify(null, tampered, createPublicKey(builtIn), Buffer.from(sig.toString('utf8').trim(), 'base64'))
const entries = JSON.parse(catalog.toString('utf8')).extensions
out.entries = entries.map((e) => ({ id: e.id, version: e.version, offeredOn: e.offeredOn, platforms: e.platforms, contractVersion: e.contractVersion, packageUrl: e.packageUrl, sha256: e.sha256 }))
for (const e of entries) {
  const pkg = await get(e.packageUrl)
  const file = path.join(dl, path.basename(e.packageUrl)); await fs.writeFile(file, pkg)
  const sha = createHash('sha256').update(pkg).digest('hex')
  const listing = execFileSync('tar', ['-tzf', file], { encoding: 'utf8' }).trim().split('\n')
  const inner = JSON.parse(execFileSync('tar', ['-xzOf', file, 'extension.json'], { encoding: 'utf8' }))
  const { packageUrl, sha256, ...entryDescription } = e
  out[`package ${e.id}`] = { bytes: pkg.length, sha256Matches: sha === e.sha256, files: listing, extensionJsonEqualsEntry: JSON.stringify(inner) === JSON.stringify(entryDescription) || JSON.stringify(Object.entries(inner).sort()) === JSON.stringify(Object.entries(entryDescription).sort()) }
  const server = execFileSync('tar', ['-xzOf', file, 'server/index.mjs'], { encoding: 'utf8' })
  out[`package ${e.id}`].pinnedRuntime = server.match(/const RUNTIME_VERSION = '([^']+)'/)?.[1]
}
console.log(JSON.stringify(out, null, 2))
