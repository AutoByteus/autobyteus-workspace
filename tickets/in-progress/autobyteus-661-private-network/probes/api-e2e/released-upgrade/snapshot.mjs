// Snapshot of a node's remote-collaboration files from its container: peers.json with every peerSecret redacted (length
// kept), file modes, and .env as key names with the ENABLE_REMOTE_COLLABORATION line verbatim plus a sha256 of the
// other lines. Never prints a secret value.
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
const [container, label] = process.argv.slice(2)
const sh = (cmd) => execFileSync('docker', ['exec', container, 'sh', '-c', cmd], { encoding: 'utf8' })
const peers = JSON.parse(sh('cat /home/autobyteus/data/remote-collaboration/peers.json'))
const redact = (row) => Object.fromEntries(Object.entries(row).map(([k, v]) => [k, /secret|privateKey/i.test(k) && typeof v === 'string' ? `<redacted ${v.length} chars>` : v]))
const env = sh('cat /home/autobyteus/data/.env')
const lines = env.split('\n')
const switchLines = lines.filter((l) => /ENABLE_REMOTE_COLLABORATION/.test(l))
const others = lines.filter((l) => !/ENABLE_REMOTE_COLLABORATION/.test(l))
console.log(JSON.stringify({ label, container, peersFile: Array.isArray(peers) ? peers.map(redact) : { ...peers, peers: (peers.peers ?? []).map(redact) },
  modes: sh('stat -c "%a %n" /home/autobyteus/data/remote-collaboration/* /home/autobyteus/data/.env').trim().split('\n'),
  envKeys: lines.filter(Boolean).map((l) => l.split('=')[0]), envSwitchLines: switchLines, envOtherLinesSha256: createHash('sha256').update(others.join('\n')).digest('hex'),
  envEndsWithNewline: env.endsWith('\n') }, null, 1))
