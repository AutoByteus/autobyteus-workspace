// Probe: cost of the Org-tab perspective projection (one crypto-js SHA-256 per reference file)
// against a real AgentOrg communication-messages file. Usage:
//   node reference-projection-bench.mjs <agent_org_communication_messages.json> <crypto-js dir>
import fs from 'node:fs'
import { createRequire } from 'node:module'
const [file, cryptoDir] = process.argv.slice(2)
const require = createRequire(import.meta.url)
const sha256 = require(cryptoDir + '/sha256')
const { messages } = JSON.parse(fs.readFileSync(file, 'utf8'))
const members = [...new Set(messages.flatMap((m) => [m.senderAgentRunId, m.receiverAgentRunId]))]
const project = (focused) => messages.flatMap((m) => {
  if (m.senderAgentRunId !== focused && m.receiverAgentRunId !== focused) return []
  return [{ ...m, referenceFiles: m.referenceFiles.map((p) => ({ referenceId: sha256(`${m.messageId}\0${p}`).toString(), path: p })) }]
})
for (const member of members) {
  const t0 = performance.now()
  const rows = project(member)
  const t1 = performance.now()
  const refs = rows.reduce((n, r) => n + r.referenceFiles.length, 0)
  console.log(`${member.replace(/_[0-9a-f]{32}$/, '').padEnd(24)} messages=${String(rows.length).padStart(3)} referenceRows=${String(refs).padStart(6)} oneProjectionMs=${(t1 - t0).toFixed(0)}`)
}
