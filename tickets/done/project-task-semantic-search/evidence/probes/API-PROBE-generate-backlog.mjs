// API/E2E probe (ticket evidence, not product code): a deterministic synthetic backlog for AC-015 / QR-001…QR-005
// and the realistic-backlog quality check (C-08, AC-001/AC-004).
//
// Output JSON: { targets: [...60 fixture Tasks], targetsLong: [...the same 60 with realistic-length process text
// appended], distractors: [...940 generated Tasks], unrelatedExtended: [...] }.
// Distractors are software-project Tasks of realistic length (≈1,200–3,500 characters; the user's real backlog has a
// median of 2,461) built from area/symptom/feature pools, so they compete with the targets the way a real backlog does.
// No user data is used. Usage: node API-PROBE-generate-backlog.mjs <fixture dir> <out.json>
import fs from 'node:fs'
import path from 'node:path'

const [fixtureDir, outFile] = process.argv.slice(2)
if (!fixtureDir || !outFile) throw new Error('usage: node API-PROBE-generate-backlog.mjs <fixture dir> <out.json>')

let seed = 20261018
const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
const pick = (list) => list[Math.floor(rnd() * list.length)]
const some = (list, n) => { const copy = [...list]; const out = []; while (out.length < n && copy.length) out.push(copy.splice(Math.floor(rnd() * copy.length), 1)[0]); return out }

const AREAS = [
  ['agent run view', 'autobyteus-web/components/agents/AgentRunView.vue', 'agentRunStore'],
  ['team conversation view', 'autobyteus-web/components/teams/TeamConversation.vue', 'teamRunStore'],
  ['terminal panel', 'autobyteus-web/components/terminal/TerminalPanel.vue', 'terminalSessionStore'],
  ['file explorer', 'autobyteus-web/components/workspace/FileExplorer.vue', 'fileExplorerStore'],
  ['code editor tabs', 'autobyteus-web/components/editor/EditorTabs.vue', 'editorTabsStore'],
  ['server settings page', 'autobyteus-web/components/settings/ServerSettingsManager.vue', 'serverSettingsStore'],
  ['provider API key form', 'autobyteus-web/components/settings/ProviderKeys.vue', 'providerConfigStore'],
  ['model picker', 'autobyteus-web/components/models/ModelPicker.vue', 'modelCatalogStore'],
  ['agent definition editor', 'autobyteus-web/components/agents/AgentDefinitionForm.vue', 'agentDefinitionStore'],
  ['team definition editor', 'autobyteus-web/components/teams/TeamDefinitionForm.vue', 'teamDefinitionStore'],
  ['skills page', 'autobyteus-web/pages/skills.vue', 'skillStore'],
  ['MCP server configuration', 'autobyteus-server-ts/src/mcp-server-management/mcp-config-service.ts', 'McpConfigService'],
  ['tool approval dialog', 'autobyteus-web/components/agents/ToolApprovalDialog.vue', 'toolApprovalStore'],
  ['artifact viewer', 'autobyteus-web/components/artifacts/ArtifactViewer.vue', 'artifactStore'],
  ['workspace selector', 'autobyteus-web/components/workspace/WorkspaceSelector.vue', 'workspaceStore'],
  ['Task detail page', 'autobyteus-web/pages/projects/[id]/tasks/[taskId].vue', 'projectTaskStore'],
  ['Temp tasks list', 'autobyteus-web/components/projects/TempTaskBoard.vue', 'projectTaskStore'],
  ['memory inspector', 'autobyteus-web/components/memory/MemoryInspector.vue', 'memoryViewStore'],
  ['conversation history list', 'autobyteus-web/components/history/RunHistoryList.vue', 'runHistoryStore'],
  ['desktop updater', 'autobyteus-web/electron/updater/updateManager.ts', 'UpdateManager'],
  ['remote node connection', 'autobyteus-web/stores/nodeConnectionStore.ts', 'nodeConnectionStore'],
  ['message gateway', 'autobyteus-message-gateway/src/gateway-service.ts', 'GatewayService'],
  ['Telegram bridge', 'autobyteus-message-gateway/src/channels/telegram/telegram-channel.ts', 'TelegramChannel'],
  ['notification center', 'autobyteus-web/components/notifications/NotificationCenter.vue', 'notificationStore'],
  ['markdown renderer', 'autobyteus-web/components/conversation/MarkdownRenderer.vue', 'markdownRenderer'],
  ['diff viewer', 'autobyteus-web/components/editor/DiffViewer.vue', 'diffViewerStore'],
  ['image generation tool', 'autobyteus-ts/src/tools/multimedia/image-generation-tool.ts', 'ImageGenerationTool'],
  ['browser automation tool', 'autobyteus-server-ts/src/agent-tools/browser/browser-tool-service.ts', 'BrowserToolService'],
  ['application SDK', 'autobyteus-application-backend-sdk/src/index.ts', 'ApplicationBackend'],
  ['iOS wrapper', 'autobyteus-ios/App/ContentView.swift', 'ContentView'],
  ['localization catalog', 'autobyteus-web/localization/messages/en/index.ts', 'localizationRuntime'],
  ['agent package import', 'autobyteus-server-ts/src/agent-packages/package-import-service.ts', 'PackageImportService'],
  ['run log viewer', 'autobyteus-web/components/logs/RunLogViewer.vue', 'runLogStore'],
  ['server startup', 'autobyteus-server-ts/src/app.ts', 'startServer'],
  ['database layer', 'autobyteus-server-ts/prisma/schema.prisma', 'PrismaClient'],
  ['backup export', 'autobyteus-server-ts/src/backup/backup-service.ts', 'BackupService'],
  ['CI pipeline', '.github/workflows/ci.yml', 'ci workflow'],
  ['release workflow', '.github/workflows/release-desktop.yml', 'release workflow'],
  ['documentation site', 'docs/README.md', 'docs index'],
  ['agent prompt builder', 'autobyteus-ts/src/agent/prompt/prompt-builder.ts', 'PromptBuilder'],
  ['LLM provider adapter', 'autobyteus-ts/src/llm/providers/openai-compatible-llm.ts', 'OpenAICompatibleLLM'],
  ['WebSocket event stream', 'autobyteus-server-ts/src/api/websocket/agent-stream.ts', 'AgentStreamHandler'],
  ['task delegation flow', 'autobyteus-server-ts/src/agent-tools/delegation/delegate-task-tool.ts', 'DelegateTaskTool'],
  ['workspace file watcher', 'autobyteus-server-ts/src/workspaces/file-watcher.ts', 'WorkspaceFileWatcher'],
  ['agent avatar picker', 'autobyteus-web/components/agents/AvatarPicker.vue', 'avatarStore'],
  ['keyboard shortcut handler', 'autobyteus-web/composables/useShortcuts.ts', 'useShortcuts'],
  ['Projects list page', 'autobyteus-web/pages/projects/index.vue', 'projectStore'],
  ['scheduled runs', 'autobyteus-server-ts/src/schedules/schedule-service.ts', 'ScheduleService'],
  ['plugin loader', 'autobyteus-server-ts/src/plugins/plugin-loader.ts', 'PluginLoader'],
  ['audit log', 'autobyteus-server-ts/src/audit/audit-log-service.ts', 'AuditLogService'],
]
const SYMPTOMS = [
  'shows stale data after the server reconnects', 'becomes slow when the list has several hundred entries',
  'loses keyboard focus after a dialog closes', 'renders blank on the first open after an upgrade',
  'ignores the configured timeout', 'logs every request at info level', 'fails without any message when the node is offline',
  'shows duplicate entries after a refresh', 'overflows its container on narrow windows', 'throws on empty input',
  'keeps growing in memory during long sessions', 'reports times in the wrong time zone', 'breaks after the dependency upgrade',
  'shows an English label in the Chinese locale', 'does not update when another window changes the same item',
  'spins forever when the request is cancelled', 'sorts items in an unexpected order', 'drops the last character of pasted text',
  'opens two copies when clicked twice quickly', 'loses unsaved changes on navigation',
]
const FEATURES = [
  'export to CSV', 'filtering by status', 'a confirmation before deleting', 'drag-and-drop reordering', 'copy to clipboard',
  'pagination for long lists', 'a retry action after failures', 'inline help text', 'an audit trail of changes', 'a configurable limit',
  'bulk selection', 'a compact density option', 'search within the list', 'a summary header', 'undo for the last change',
]
const REFACTORS = [
  'Split the {a} into smaller components', 'Move the {a} state into its own store', 'Remove the legacy code path in the {a}',
  'Replace the hand-written types of the {a} with generated ones', 'Make the {a} use the shared request-error pattern',
]
const DOCS = ['Document how the {a} works for contributors', 'Add end-to-end coverage for the {a}', 'Write a troubleshooting section for the {a}']
const CONTEXT = [
  'Several users reported this in the community channel over the last two weeks.', 'It was first noticed in the 1.4 beta on macOS and later confirmed on Windows.',
  'The behavior is intermittent: it happens roughly one time in five.', 'It is most visible on machines with many projects and long-running agents.',
  'A related report mentions that restarting the app makes it go away until the next session.', 'The issue predates the recent refactor of the stores.',
  'Support asked for this twice this month, both times from teams that work with remote nodes.', 'The current behavior surprised a new user during onboarding.',
  'Nothing in the server log points at the cause yet.', 'The same pattern exists in two neighbouring components, which behave correctly.',
  'It blocks the planned walkthrough video for the next release.', 'The fix should not change how existing data is stored.',
]
const INVESTIGATION = [
  'The component reads its data once on mount and never subscribes to later changes.', 'The request is issued twice because two watchers react to the same change.',
  'The service catches the error and returns an empty list instead of reporting it.', 'The store keeps a reference to every closed item, so nothing is released.',
  'The layout uses a fixed width that predates the container queries used elsewhere.', 'The timestamp is formatted with the server time zone instead of the viewer\'s.',
  'A race between the initial read and the change feed leaves the older value on screen.', 'The handler assumes the payload always has at least one entry.',
  'The setting is read at startup only, so a change takes effect after a restart.', 'The translation key exists in English but not in the Chinese catalog.',
]
const DONE_WHEN = [
  'a unit test reproduces the problem and passes after the fix', 'the behavior is the same on macOS, Windows and Linux',
  'the module documentation describes the new behavior', 'no new warning appears in the server log during the scenario',
  'the change is covered by the existing end-to-end suite or a new case', 'the empty, loading and error states are all handled',
  'keyboard and screen-reader users can complete the flow', 'performance with 500 entries stays under 200 ms per interaction',
]
const PROCESS = [
  'Context: this came up while reviewing the open backlog; it has been reproduced on a fresh install and on an upgraded one. The change should follow the existing patterns of the module, reuse the shared helpers where they fit and avoid new dependencies.',
  'Investigation notes: start from the owning component and its store, check the request lifecycle and the change feed, and confirm the cause with a failing test before changing code. Keep the fix inside the owner; do not add a second path for the same behavior.',
  'Acceptance criteria: the reported scenario works; existing tests stay green; a new test covers the case; the module documentation is updated where it describes this behavior; the change is reviewed and the release notes mention it when users can see it.',
  'Out of scope: unrelated clean-ups in the same files, visual redesigns and changes to how data is stored. Record anything else found on the way as a follow-up Task instead of growing this one.',
  'Notes for the reviewer: the risk is low and confined to the module; check the error and empty states, keyboard use and the Chinese locale. Screenshots of the before and after state are attached to the pull request.',
]

const titleCase = (s) => s[0].toUpperCase() + s.slice(1)
const distractor = (i) => {
  const [area, file, owner] = pick(AREAS)
  const kind = rnd()
  let title
  if (kind < 0.55) title = `${titleCase(area)} ${pick(SYMPTOMS)}`
  else if (kind < 0.8) title = `Add ${pick(FEATURES)} to the ${area}`
  else if (kind < 0.92) title = pick(REFACTORS).replace('{a}', area)
  else title = pick(DOCS).replace('{a}', area)
  const parts = [title, '', `${some(CONTEXT, 3 + Math.floor(rnd() * 3)).join(' ')} The affected area is the ${area} (\`${file}\`, owned by \`${owner}\`).`]
  if (kind < 0.55) parts.push('', `Steps to reproduce:\n1. Open the ${area}.\n2. ${pick(['Switch to another Project and back.', 'Leave it open for an hour.', 'Resize the window to its narrowest width.', 'Disconnect the node and reconnect it.', 'Create twenty items quickly.'])}\n3. Observe the result.\n\nExpected: it keeps working as before. Actual: it ${pick(SYMPTOMS)}.`)
  parts.push('', `Investigation: ${some(INVESTIGATION, 2 + Math.floor(rnd() * 3)).join(' ')}`)
  parts.push('', `Done when:\n${some(DONE_WHEN, 3).map((d) => `- ${d};`).join('\n')}`)
  const extra = 2 + Math.floor(rnd() * 4)
  for (const p of some(PROCESS, extra)) parts.push('', p)
  const status = (() => { const r = rnd(); return r < 0.45 ? 'DONE' : r < 0.75 ? 'TODO' : r < 0.88 ? 'IN_PROGRESS' : 'CANCELLED' })()
  return { id: `d${String(i).padStart(3, '0')}`, status, description: parts.join('\n') }
}

const targets = JSON.parse(fs.readFileSync(path.join(fixtureDir, 'tasks.json'), 'utf8'))
const queries = JSON.parse(fs.readFileSync(path.join(fixtureDir, 'queries.json'), 'utf8'))
const targetsLong = targets.map((t) => ({ ...t, description: `${t.description}\n\n${PROCESS.join('\n\n')}` }))
const distractors = Array.from({ length: 940 }, (_, i) => distractor(i + 1))
const unrelatedExtended = [
  ...queries.unrelated,
  // written for this validation run (the design probes' genuine off-topic queries are already in the fixture's list)
  'how do I bake sourdough', 'translate good morning into Japanese',
  'how to change a flat tyre on a bicycle', 'best time of year to plant tomatoes', 'convert 5 miles to kilometers',
  'qwertyuiop asdfgh', 'who painted the Mona Lisa', 'symptoms of a common cold', 'train timetable from Munich to Vienna',
  'how many calories in an avocado', 'rules of chess castling', 'top rated sushi restaurants nearby',
]
const lengths = distractors.map((d) => d.description.length).sort((a, b) => a - b)
const longLengths = targetsLong.map((d) => d.description.length).sort((a, b) => a - b)
fs.writeFileSync(outFile, JSON.stringify({ targets, targetsLong, distractors, paraphrases: queries.paraphrases, unrelated: queries.unrelated, unrelatedExtended }, null, 1))
console.log(JSON.stringify({ distractors: distractors.length, distractorChars: { min: lengths[0], median: lengths[lengths.length >> 1], max: lengths.at(-1) },
  targetsLongChars: { min: longLengths[0], median: longLengths[longLengths.length >> 1], max: longLengths.at(-1) },
  statuses: distractors.reduce((acc, d) => ({ ...acc, [d.status]: (acc[d.status] ?? 0) + 1 }), {}), unrelatedExtended: unrelatedExtended.length }))
