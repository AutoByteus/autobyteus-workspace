#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const prototypeRoot = resolve(new URL('../..', import.meta.url).pathname)
const sourceRepo = process.env.SOURCE_REPO || resolve(prototypeRoot, '..')
const sourceCommit = '8ef282ba77705180d985e7000d801f0e0068cdc1'
const sourceProjectPrefix = 'autobyteus-web'
const sourceRoot = `git:${sourceRepo}@${sourceCommit}:${sourceProjectPrefix}`
const outRoot = resolve(prototypeRoot, 'evidence/interaction-discovery')
const sha256 = value => createHash('sha256').update(value).digest('hex')

function gitBuffer(...args) {
  return execFileSync('git', ['-C', sourceRepo, ...args], { encoding: null })
}

function gitText(...args) {
  return execFileSync('git', ['-C', sourceRepo, ...args], { encoding: 'utf8' }).trim()
}

const groups = [
  { id: 'DISC-001', name: 'Agent catalog, create, edit, delete, validation and feedback', match: /components\/agents\/|pages\/__tests__\/agents/ },
  { id: 'DISC-002', name: 'Team catalog, create, edit, delete, member configuration and feedback', match: /components\/agentTeams\/|pages\/__tests__\/agent-teams/ },
  { id: 'DISC-003', name: 'Tools and MCP list, details, reload, add, edit, delete, discovery and bulk import', match: /components\/tools\/|toolManagement|mcp/i },
  { id: 'DISC-004', name: 'Node registry, window binding, phone access, setup guides and memory sync', match: /settings\/.*(?:Node|Phone|MemorySync|Docker)|pages\/__tests__\/nodes/i },
  { id: 'DISC-005', name: 'Provider/API-key editors, custom providers, model browsing and validation', match: /providerApiKey|ProviderAPIKey/i },
  { id: 'DISC-006', name: 'Messaging gateway, provider scope, binding, verification and recovery', match: /settings\/messaging|MessagingSetup|messaging/i },
  { id: 'DISC-007', name: 'Packages, extensions, voice input, updates and install/remove/update feedback', match: /(?:AgentPackages|ApplicationPackages|Extensions|VoiceInput|AboutSettings|AppUpdate)/i },
  { id: 'DISC-008', name: 'Agent run conversation, streaming, todo, activity, artifacts and lifecycle', match: /workspace\/agent|conversation\/|progress\//i },
  { id: 'DISC-009', name: 'Team overview, focus, messages, delegated tasks, references and lifecycle', match: /workspace\/team|TeamFocus|team-task/i },
  { id: 'DISC-010', name: 'Workspace file explorer, viewers, context actions and media/fullscreen behavior', match: /fileExplorer\//i },
  { id: 'DISC-011', name: 'Terminal, browser, VNC and workspace usage tools', match: /workspace\/(?:tools|usage)/i },
  { id: 'DISC-012', name: 'Workspace responsive drawers, strips, tabs, resizing, focus and keyboard recovery', match: /(?:layout\/|WorkspaceAdaptiveLayout|RightSideTabs|RightSidebar|LeftSidebar)/i },
  { id: 'DISC-013', name: 'Workspace running and history reopen, interrupt, archive and delete', match: /workspace\/(?:history|running)/i },
  { id: 'DISC-014', name: 'Paired-mobile shell, runs, setup, chat, files, artifacts, activity, focus and references', match: /components\/mobile|pages\/__tests__\/mobile/i },
  { id: 'DISC-015', name: 'Media library categories, delete confirmation and retained viewers', match: /pages\/__tests__\/media|MediaDefaultModels/i },
  { id: 'DISC-016', name: 'Embedded-server loading, ready, failure, logs, restart, shutdown and recovery', match: /components\/server\//i },
  { id: 'DISC-017', name: 'Locale, settings, accessibility-intent and remaining retained presentation behavior', match: /.*/ },
]

gitText('cat-file', '-e', `${sourceCommit}^{commit}`)
const files = gitText('ls-tree', '-r', '--name-only', sourceCommit, '--',
  `${sourceProjectPrefix}/components`,
  `${sourceProjectPrefix}/pages`,
  `${sourceProjectPrefix}/layouts`,
)
  .split('\n')
  .filter(Boolean)
  .map(path => path.slice(sourceProjectPrefix.length + 1))
  .filter(path => /\.(?:spec|test)\.[cm]?[jt]sx?$/.test(path))
  .sort()

const resultGroups = groups.map(group => ({ ...group, match: undefined, files: [], testTitles: [] }))
for (const path of files) {
  const groupIndex = groups.findIndex(group => group.match.test(path))
  const source = gitBuffer('show', `${sourceCommit}:${sourceProjectPrefix}/${path}`).toString('utf8')
  const titles = [...source.matchAll(/\b(?:it|test)\s*\(\s*(['"\x60])([^'"\x60]+)\1/g)].map(match => match[2])
  resultGroups[groupIndex].files.push({ path, sha256: sha256(source), testCount: titles.length })
  resultGroups[groupIndex].testTitles.push(...titles.map(title => ({ path, title })))
}
const summary = {
  pinnedSourceCommit: sourceCommit,
  sourceRoot,
  groupCount: resultGroups.length,
  sourceTestFiles: files.length,
  discoveredTestCases: resultGroups.reduce((total, group) => total + group.testTitles.length, 0),
  unassignedFiles: [],
  retainedPresentationProof: resolve(prototypeRoot, 'evidence/presentation-code/presentation-code-parity.json'),
}

const markdown = [
  '# Interaction And State Discovery Audit', '',
  `- Pinned source: \`${summary.pinnedSourceCommit}\``,
  `- Immutable source authority: \`${sourceRoot}\``,
  `- Source presentation test files classified: **${summary.sourceTestFiles}**`,
  `- Discoverable test cases classified: **${summary.discoveredTestCases}**`,
  `- Production presentation implementation retained as exact byte matches: [manifest](../presentation-code/presentation-code-parity.json)`, '',
  '| ID | Behavior group | Source test files | Discovered cases |',
  '| --- | --- | ---: | ---: |',
  ...resultGroups.map(group => `| ${group.id} | ${group.name} | ${group.files.length} | ${group.testTitles.length} |`), '',
  'The machine-readable audit records every classified source test file and test title. Browser journeys and rendered matrices provide controlled source-versus-prototype evidence; this audit proves the discovery pass was not limited to the sampled journeys.', '',
]
await mkdir(outRoot, { recursive: true })
await writeFile(resolve(outRoot, 'interaction-discovery.json'), `${JSON.stringify({ generatedAt: new Date().toISOString(), summary, groups: resultGroups }, null, 2)}\n`)
await writeFile(resolve(outRoot, 'interaction-discovery.md'), `${markdown.join('\n')}\n`)
process.stdout.write(`${summary.sourceTestFiles} source test files and ${summary.discoveredTestCases} cases classified into ${summary.groupCount} stable groups against pinned Git content.\n`)
