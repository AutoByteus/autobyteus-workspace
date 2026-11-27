// Exchanges a setup code (made by the node's own CLI) for an owner credential; writes {name: {url, credential}} to secrets.json (0600). Never prints a secret.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
const [file, ...specs] = process.argv.slice(2)
const out = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {}
for (const spec of specs) {
  const [name, container, url] = spec.split(',')
  const printed = execFileSync('docker', ['exec', container, 'node', '/opt/autobyteus/server-package/dist/node-access-cli.js', 'setup-code', '--data-dir', '/home/autobyteus/data'], { encoding: 'utf8' })
  const code = printed.match(/Setup code:\s*(\S+)/)?.[1]
  const r = await fetch(`${url}/rest/node-access/setup-exchanges`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ setupCode: code, desktopName: 'api-e2e desktop' }) })
  const body = await r.json()
  if (r.status !== 201 || !body.credential) throw new Error(`${name}: exchange HTTP ${r.status}`)
  out[name] = { url, credential: body.credential }
  console.log(`${name}: owner credential stored`)
}
fs.writeFileSync(file, JSON.stringify(out), { mode: 0o600 })
