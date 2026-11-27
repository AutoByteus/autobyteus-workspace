// Compares the other .env lines before/after exactly: the released sha256 was of the non-switch lines joined by \n.
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
const released = Object.fromEntries(fs.readFileSync('released-snapshot.json', 'utf8').split(/\n(?=\{)/).map((t) => JSON.parse(t)).map((o) => [o.label.split('-')[1], o.envOtherLinesSha256]))
for (const n of ['a', 'b', 'c']) {
  const env = execFileSync('docker', ['exec', `661-api-new-${n}`, 'cat', '/home/autobyteus/data/.env'], { encoding: 'utf8' })
  const withoutFinalNewline = env.endsWith('\n') ? env.slice(0, -1) : env
  const sha = createHash('sha256').update(withoutFinalNewline).digest('hex')
  console.log(`${n}: after = released other lines + one final newline: ${sha === released[n]} (lines ${env.split('\n').length - 1}, bytes ${env.length})`)
}
