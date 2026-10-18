// API/E2E probe (ticket evidence): adds `repoDistractors` (940 Task-like texts from this repository's finished tickets,
// the same selection as API-PROBE-score-analysis.mjs and tests/helpers/project-task-search-backlogs.ts) to a backlog
// JSON written by API-PROBE-generate-backlog.mjs, so the app can be seeded with the real-text backlog.
// Usage: node API-PROBE-add-repo-backlog.mjs <backlog.json> <worktreeRoot>
import fs from 'node:fs'
import path from 'node:path'
const [backlogFile, worktree] = process.argv.slice(2)
const repoTasks = () => {
  // Up to 940 Task-like texts: per finished ticket, its requirements doc, design spec and investigation notes (in that
  // order of preference), each giving one Task: title from the folder name + the document's problem/goal/intent section
  // (or its opening text), ≤ 2,400 characters.
  const done = path.join(worktree, 'tickets/done')
  const out = []
  const docs = [['requirements-doc.md', /##\s+(Problem And Desired Outcome|Problem|Goal|Summary|Context)[^\n]*\n([\s\S]*?)(\n##\s|$)/i],
    ['design-spec.md', /##\s+(Intended Change|Current-State Read|Summary|Problem)[^\n]*\n([\s\S]*?)(\n##\s|$)/i],
    ['investigation-notes.md', /##\s+(Summary|Request|Problem|Findings|Context)[^\n]*\n([\s\S]*?)(\n##\s|$)/i]]
  for (const [docName, sectionRe] of docs) {
    for (const name of fs.readdirSync(done).sort()) {
      if (out.length >= 940) return out
      const file = path.join(done, name, docName)
      if (!fs.existsSync(file)) continue
      const text = fs.readFileSync(file, 'utf8')
      const section = text.match(sectionRe)?.[2] ?? text.split('\n').slice(3).join('\n')
      const title = name.replace(/[-_]+/g, ' ').replace(/^./, (c) => c.toUpperCase())
      const body = section.replace(/\|/g, ' ').replace(/[ \t]+/g, ' ').trim()
      if (body.length < 300) continue
      out.push({ id: `r${String(out.length + 1).padStart(3, '0')}`, source: `${name}/${docName}`, description: `${title}\n\n${body}`.slice(0, 2400) })
    }
  }
  return out
}

const backlog = JSON.parse(fs.readFileSync(backlogFile, 'utf8'))
backlog.repoDistractors = repoTasks()
fs.writeFileSync(backlogFile, JSON.stringify(backlog))
console.log(JSON.stringify({ repoDistractors: backlog.repoDistractors.length, sources: [...new Set(backlog.repoDistractors.map((t) => t.source.split('/')[1]))] }))
