"""ab208 temporary: add a name observer to an untracked copy of delegated-launch-defaults-probe.mjs.

Every 300 ms the page logs (on change) the names it shows for delegated copies:
- Settings rows: [data-test="run-member-<address>@<runId>"] -> the row's name span;
- sidebar copy rows of Team and Agent roots: [data-test="workspace-team-transient-execution-row"]
  (data-agent-run-id / data-team-run-id / data-member-address) -> span.block.truncate;
- sidebar copy rows of Org roots: [data-test^="agent-org-task-agent-row-"] -> its last text span;
- the conversation title: [data-test="agent-workspace-title"].
Usage: python3 -I apply-name-observer.py <probe copy path>
"""
import pathlib
import sys

p = pathlib.Path(sys.argv[1])
s = p.read_text()
anchor = "  page.setDefaultTimeout(30000)\n"
assert s.count(anchor) == 1
obs = r'''  page.setDefaultTimeout(30000)
  // ab208 TEMPORARY NAME OBSERVER (untracked copy only).
  const obsFile = path.join(outDir, 'name-observer.log'); await fs.mkdir(outDir, { recursive: true })
  page.on('console', (m) => { const t = m.text(); if (t.startsWith('[NAMES]')) { try { require('node:fs').appendFileSync(obsFile, `${new Date().toISOString()} ${t}\n`) } catch {} } })
  await context.addInitScript(() => { let last = null; setInterval(() => {
    const text = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
    const settings = [...document.querySelectorAll('[data-test^="run-member-"]')].map((el) => el.getAttribute('data-test').slice('run-member-'.length))
      .filter((key) => key.includes('@')).map((key) => {
        const el = document.querySelector(`[data-test="run-member-${CSS.escape(key)}"]`)
        const nameEl = el?.querySelector('span.text-sm.font-medium'); const initials = el?.querySelector('span[aria-hidden="true"]')
        return { key, name: text(nameEl), initials: text(initials) } })
    const sidebar = [...document.querySelectorAll('[data-test="workspace-team-transient-execution-row"]')].map((el) => ({
      agentRunId: el.getAttribute('data-agent-run-id'), teamRunId: el.getAttribute('data-team-run-id'), address: el.getAttribute('data-member-address'),
      kind: el.getAttribute('data-transient-kind'), name: text(el.querySelector('span.block.truncate')) }))
    const org = [...document.querySelectorAll('[data-test^="agent-org-task-agent-row-"]')].map((el) => {
      const spans = [...el.querySelectorAll('span')].map(text).filter(Boolean)
      return { agentRunId: el.getAttribute('data-agent-run-id'), name: spans[spans.length - 1] ?? text(el) } })
    const title = text(document.querySelector('[data-test="agent-workspace-title"]')) || null
    const snapshot = JSON.stringify({ settings, sidebar, org, title, url: location.pathname + location.search + location.hash })
    if (snapshot !== last) { last = snapshot; console.log(`[NAMES] ${snapshot}`) } }, 300) })
'''
p.write_text(s.replace(anchor, obs))
print("patched")
