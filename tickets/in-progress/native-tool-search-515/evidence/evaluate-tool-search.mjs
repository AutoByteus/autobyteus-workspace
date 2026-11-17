// Evaluation of native tool search on real agents' tool sets (autobyteus-515 AC-008, AC-009).
//
// Runs the Project Task Manager's and the Daily Assistant's tool sets through the real native agent loop
// (autobyteus-ts AgentFactory, memory, tool search) on a real model, one fresh conversation per task, and
// records per request the provider-reported prompt tokens and cache reads, and per task the request count
// and whether the task succeeded, judged by the resulting state (the Task closed, the file written).
//
// The tool definitions are the real ones (registered from the server build, resolved as the native runtime
// resolves them, so the model sees exactly what a native run sends). The tools' behavior is a test-owned,
// stateful in-memory world (Projects, Tasks, agents, web pages) and a temporary workspace folder: nothing
// outside this process changes. run_bash and edit_file answer that they are not available here.
// The system prompts are short stand-ins, not the user's agent definitions.
//
// Old against new: run it once with <root> = a build of the base branch (old: every tool listed) and once with
// <root> = this ticket's build (new: base tools listed, the rest searchable). On a build without tool search
// `listedToolNames` does not exist and every tool is listed; the output records which behavior ran
// (`toolSearch`). `--listed all` on the new build sends every definition too (the old request contract).
//
// Usage (build first: pnpm -C autobyteus-ts build && pnpm -C autobyteus-server-ts build, in <root>):
//   AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault node evaluate-tool-search.mjs <root> <out.json> \
//     [--model deepseek-v4-flash] [--listed base|all] [--agents pm,da] [--tasks <id,...>] [--reps 1]
import { mkdtempSync, mkdirSync, readFileSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [root, outPath, ...rest] = process.argv.slice(2);
if (!root || !outPath) throw new Error('Usage: node evaluate-tool-search.mjs <root> <out.json> [options]');
const option = (name, fallback) => { const i = rest.indexOf(`--${name}`); return i >= 0 ? rest[i + 1] : fallback; };
const MODEL = option('model', 'deepseek-v4-flash');
const LISTED = option('listed', 'base');
const AGENTS = option('agents', 'pm,da').split(',');
const ONLY_TASKS = option('tasks', '') ? option('tasks', '').split(',') : null;
const REPS = Number(option('reps', '1'));
const TASK_TIMEOUT_MS = 240_000;

const ts = (p) => import(pathToFileURL(path.join(root, 'autobyteus-ts/dist', p)).href);
const server = (p) => import(pathToFileURL(path.join(root, 'autobyteus-server-ts/dist', p)).href);
const { registerTools } = await ts('tools/register-tools.js');
registerTools();
for (const [mod, fn] of [
  ['agent-tools/project-tasks/project-task-native-tools.js', 'registerProjectTaskTools'],
  ['agent-tools/memory/memory-native-tools.js', 'registerMemoryTools'],
  ['agent-tools/browser/register-browser-tools.js', 'registerAllBrowserTools'],
  ['agent-tools/task-delegation/register-task-delegation-tools.js', 'registerTaskDelegationTools'],
  ['agent-tools/agent-communication/register-agent-communication-tools.js', 'registerAgentCommunicationTools'],
  ['agent-tools/agent-discovery/register-agent-discovery-tools.js', 'registerAgentDiscoveryTools'],
  ['agent-tools/media/register-media-tools.js', 'registerMediaTools'],
  ['agent-tools/search/register-search-tool.js', 'registerProvisionedSearchTool'],
]) await (await server(mod))[fn]();
const { resolveAutoByteusRuntimeAgentToolExposure } = await server('agent-execution/backends/autobyteus/autobyteus-runtime-tool-exposure.js');
const { defaultToolRegistry } = await ts('tools/registry/tool-registry.js');
const { BaseTool } = await ts('tools/base-tool.js');
const { AgentConfig } = await ts('agent/context/agent-config.js');
const { AgentFactory } = await ts('agent/factory/agent-factory.js');
const { AgentInputUserMessage } = await ts('agent/message/agent-input-user-message.js');
const { AgentStatus } = await ts('agent/status/status-enum.js');
const { EventType } = await ts('events/event-types.js');
const { LLMFactory } = await ts('llm/llm-factory.js');

const BASE = ['run_bash', 'read_file', 'edit_file', 'write_file'];
// The definitions' tool names, as in the ticket's measurement (dump-agent-tool-schemas.mjs).
const AGENT_TOOLS = {
  pm: ['list_projects', 'create_project', 'update_project', 'list_project_tasks', 'search_project_tasks', 'search_memory', 'get_project_task', 'create_task', 'update_task', 'list_available_agents', 'list_peer_nodes', 'delegate_task', 'send_message_to', 'read_file', 'write_file', 'edit_file', 'run_bash'],
  da: ['run_bash', 'read_file', 'read_url', 'search_web', 'close_tab', 'dom_snapshot', 'list_tabs', 'navigate_to', 'open_tab', 'run_script', 'screenshot', 'download_media', 'edit_image', 'generate_image', 'generate_speech', 'list_available_agents'],
};
const SYSTEM = {
  pm: 'You are the Project Task Manager. You manage the Projects and Tasks on this node and give Tasks to agents. Do what the user asks with your tools, then reply briefly.',
  da: 'You are the Daily Assistant. You help with everyday work: files in your workspace, the web, images and speech. Do what the user asks with your tools, then reply briefly.',
};

// ---- the in-memory world the tools act on --------------------------------------------------------------

const PAGES = {
  'https://example.com': { title: 'Example Domain', text: 'Example Domain. This domain is for use in illustrative examples in documents.' },
  'https://github.com/AutoByteus/autobyteus': { title: 'AutoByteus/autobyteus on GitHub', text: 'AutoByteus: agents that build software.' },
};
const newWorld = () => ({
  projects: { project_a1: { projectId: 'project_a1', name: 'AutoByteus', description: 'The AutoByteus product.' } },
  tasks: {
    'autobyteus-77': { taskId: 'autobyteus-77', projectId: 'project_a1', title: 'Fix the login redirect', status: 'IN_PROGRESS', comments: [] },
    'autobyteus-78': { taskId: 'autobyteus-78', projectId: 'project_a1', title: 'Ship the export button', status: 'TODO', comments: [] },
    'autobyteus-79': { taskId: 'autobyteus-79', projectId: 'project_a1', title: 'Add dark mode to settings', status: 'TODO', comments: [] },
    'autobyteus-80': { taskId: 'autobyteus-80', projectId: 'project_a1', title: 'Document the release process', status: 'DONE', comments: [] },
  },
  nextTask: 81,
  delegations: [],
  messages: [],
  tabs: {},
  nextTab: 1,
});

const inWorkspace = (workspace, p) => {
  const resolved = path.resolve(workspace, String(p ?? ''));
  if (!resolved.startsWith(workspace + path.sep) && resolved !== workspace) throw new Error(`Path is outside the workspace: ${p}`);
  return resolved;
};
const writeIn = (workspace, p, content) => {
  const file = inWorkspace(workspace, p);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
  return file;
};
const json = (value) => JSON.stringify(value);
const findTask = (world, args) => {
  const task = world.tasks[String(args.task_id ?? '')];
  if (!task) throw new Error(`Task '${args.task_id}' not found.`);
  return task;
};

const handlers = (world, workspace) => ({
  run_bash: () => { throw new Error('run_bash is not available in this run; use the other tools.'); },
  edit_file: () => { throw new Error('edit_file is not available in this run; use write_file.'); },
  read_file: (a) => readFileSync(inWorkspace(workspace, a.path), 'utf8'),
  write_file: (a) => `Wrote ${writeIn(workspace, a.path, String(a.content ?? ''))}.`,
  list_projects: () => json({ projects: Object.values(world.projects) }),
  create_project: (a) => { const id = `project_${Object.keys(world.projects).length + 1}`; world.projects[id] = { projectId: id, name: a.name, description: a.description ?? '' }; return json(world.projects[id]); },
  update_project: (a) => { const p = world.projects[a.project_id]; if (!p) throw new Error(`Project '${a.project_id}' not found.`); Object.assign(p, a.name ? { name: a.name } : {}, a.description ? { description: a.description } : {}); return json(p); },
  list_project_tasks: (a) => json({ tasks: Object.values(world.tasks).filter((t) => t.projectId === a.project_id && (!a.status || t.status === a.status)) }),
  search_project_tasks: (a) => { const words = String(a.query).toLowerCase().split(/\W+/).filter(Boolean); return json({ tasks: Object.values(world.tasks).filter((t) => t.projectId === a.project_id && words.some((w) => t.title.toLowerCase().includes(w))) }); },
  get_project_task: (a) => json(findTask(world, a)),
  create_task: (a) => { const id = `autobyteus-${world.nextTask++}`; world.tasks[id] = { taskId: id, projectId: a.project_id, title: a.title, description: a.description, status: 'TODO', comments: [] }; return json(world.tasks[id]); },
  update_task: (a) => { const t = findTask(world, a); if (a.status) t.status = a.status; if (a.title) t.title = a.title; if (a.add_comment) t.comments.push(a.add_comment); return json(t); },
  list_available_agents: () => json([{ address: '/coder', name: 'Coder', description: 'Writes and changes code.' }, { address: '/writer', name: 'Writer', description: 'Writes documents.' }]),
  list_peer_nodes: () => json({ nodes: [] }),
  delegate_task: (a) => { world.delegations.push(a); return json({ delegated: true, target_agent_run_id: `run_${world.delegations.length}` }); },
  send_message_to: (a) => { world.messages.push(a); return json({ delivered: true }); },
  search_memory: () => json({ results: [] }),
  read_url: (a) => PAGES[String(a.url).replace(/\/$/, '')]?.text ?? 'Page not found.',
  search_web: () => json({ results: [{ title: 'AutoByteus/autobyteus on GitHub', url: 'https://github.com/AutoByteus/autobyteus' }, { title: 'AutoByteus', url: 'https://autobyteus.com' }] }),
  open_tab: (a) => { const id = `tab_${world.nextTab++}`; world.tabs[id] = String(a.url).replace(/\/$/, ''); return json({ tab_id: id, url: a.url, title: PAGES[world.tabs[id]]?.title ?? '' }); },
  navigate_to: (a) => { world.tabs[a.tab_id] = String(a.url).replace(/\/$/, ''); return json({ ok: true }); },
  list_tabs: () => json(Object.entries(world.tabs).map(([tab_id, url]) => ({ tab_id, url }))),
  close_tab: (a) => { delete world.tabs[a.tab_id]; return json({ closed: true }); },
  dom_snapshot: (a) => json({ title: PAGES[world.tabs[a.tab_id]]?.title ?? '', elements: [{ tag: 'h1', text: PAGES[world.tabs[a.tab_id]]?.title ?? '' }] }),
  run_script: (a) => /title/.test(String(a.javascript)) ? json(PAGES[world.tabs[a.tab_id]]?.title ?? '') : json(null),
  screenshot: () => json({ artifact_path: '/tmp/screenshot.png' }),
  // As the real tool: `filename` is a base name; the extension comes from the content type, else the URL (API/E2E fix).
  download_media: (a) => {
    const name = String(a.filename);
    const ext = path.extname(name) ? '' : path.extname(new URL(String(a.url)).pathname);
    return json({ file_path: writeIn(workspace, path.join(String(a.folder ?? 'downloads'), name + ext), 'media') });
  },
  generate_image: (a) => json({ file_path: writeIn(workspace, a.output_file_path, 'png') }),
  edit_image: (a) => json({ file_path: writeIn(workspace, a.output_file_path, 'png') }),
  generate_speech: (a) => json({ file_path: writeIn(workspace, a.output_file_path, 'mp3') }),
});

class WorldTool extends BaseTool {
  constructor(name, handler) { super(); this.toolName = name; this.handler = handler; }
  getName() { return this.toolName; }
  getArgumentSchema() { return defaultToolRegistry.getToolDefinition(this.toolName)?.argumentSchema ?? null; }
  async _execute(_context, args = {}) { return this.handler(args); }
}

// ---- tasks (each judged by the state it leaves) ----------------------------------------------------------

const fileHas = (workspace, p, text) => { const f = path.join(workspace, p); return existsSync(f) && (!text || readFileSync(f, 'utf8').includes(text)); };
const TASKS = {
  pm: [
    ['pm-close', 'Close Task autobyteus-77 as DONE with the comment "Delivered and verified".', (w) => w.tasks['autobyteus-77'].status === 'DONE' && w.tasks['autobyteus-77'].comments.some((c) => /delivered/i.test(c))],
    ['pm-create', 'Create a Task "Write the 1.6 release notes" in the AutoByteus Project; its description: the notes cover native tool search.', (w) => Object.values(w.tasks).some((t) => /release notes/i.test(t.title))],
    ['pm-rename', 'Rename the Project AutoByteus to "AutoByteus Core".', (w) => w.projects.project_a1.name === 'AutoByteus Core'],
    ['pm-start', 'Find the Task about the export button in the AutoByteus Project and mark it in progress.', (w) => w.tasks['autobyteus-78'].status === 'IN_PROGRESS'],
    ['pm-report', 'Write the titles of the AutoByteus Project\'s TODO Tasks to open-tasks.md, one per line.', (w, ws) => fileHas(ws, 'open-tasks.md', 'Ship the export button') && fileHas(ws, 'open-tasks.md', 'Add dark mode to settings')],
    ['pm-delegate', 'Give Task autobyteus-79 to the agent /coder.', (w) => w.delegations.some((d) => d.task_id === 'autobyteus-79' && /coder/.test(String(d.recipient_address ?? '')))],
  ],
  da: [
    ['da-note', 'Write "Buy milk" into notes/today.md.', (w, ws) => fileHas(ws, 'notes/today.md', 'Buy milk')],
    ['da-image', 'Generate an image of a red circle on a white background and save it as images/circle.png.', (w, ws) => fileHas(ws, 'images/circle.png')],
    ['da-title', 'Open https://example.com in the browser and write its page title into title.txt.', (w, ws) => fileHas(ws, 'title.txt', 'Example Domain')],
    ['da-search', 'Search the web for the AutoByteus GitHub repository and write its URL into repo.txt.', (w, ws) => fileHas(ws, 'repo.txt', 'github.com/AutoByteus/autobyteus')],
    ['da-speech', 'Say "Good morning" as speech and save it as audio/morning.mp3.', (w, ws) => fileHas(ws, 'audio/morning.mp3')],
    ['da-download', 'Download https://example.com/logo.png into the downloads folder as logo.png.', (w, ws) => fileHas(ws, 'downloads/logo.png')],
  ],
};

// ---- one task in a fresh agent ----------------------------------------------------------------------------

const createLlm = async () => {
  const isGemini = await LLMFactory.requiresGeminiRuntimeResolver(MODEL);
  return LLMFactory.createLLM(MODEL, undefined, undefined, isGemini ? async () => ({ kind: process.env.GEMINI_MODE ?? 'vertexExpress' }) : undefined);
};
const waitFor = async (predicate, timeoutMs) => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) { if (predicate()) return true; await new Promise((r) => setTimeout(r, 200)); }
  return false;
};

async function runTask(agentKey, [taskId, prompt, succeeded]) {
  const exposure = resolveAutoByteusRuntimeAgentToolExposure({ id: agentKey, toolNames: AGENT_TOOLS[agentKey] }, { teamScoped: false });
  const toolNames = exposure.requestedToolNames.filter((name) => defaultToolRegistry.getToolDefinition(name));
  const world = newWorld();
  const workspace = mkdtempSync(path.join(os.tmpdir(), `eval-${taskId}-`));
  const memoryDir = mkdtempSync(path.join(os.tmpdir(), `eval-memory-${taskId}-`));
  const handle = handlers(world, workspace);
  const calls = [];
  const tools = toolNames.map((name) => new WorldTool(name, (args) => { calls.push(name); if (!handle[name]) throw new Error(`${name} is not available in this run.`); return handle[name](args); }));
  const llm = await createLlm();
  const config = new AgentConfig(agentKey, agentKey, 'evaluation', llm, `${SYSTEM[agentKey]} Your workspace folder is ${workspace}.`, tools, true, null, null, null, null, workspace);
  config.memoryDir = memoryDir;
  config.listedToolNames = LISTED === 'base' ? BASE : null;
  const toolSearch = 'listedToolNames' in new AgentConfig('probe', 'probe', 'probe', llm) && LISTED === 'base';
  const agent = new AgentFactory().createAgent(config);
  const usages = [];
  const errors = [];
  let completed = false;
  agent.start();
  await waitFor(() => agent.context.currentStatus === AgentStatus.IDLE, 30_000);
  const notifier = agent.context.statusManager.notifier;
  notifier.subscribeFrom(notifier, EventType.AGENT_TOKEN_USAGE_UPDATED, (p) => usages.push({ prompt: p.latest_prompt_tokens ?? null, cacheRead: p.usage?.cache_read_input_tokens ?? null }));
  notifier.subscribeFrom(notifier, EventType.AGENT_ERROR_OUTPUT_GENERATION, (p) => errors.push(String(p?.message ?? p).slice(0, 300)));
  notifier.subscribeFrom(notifier, EventType.AGENT_TURN_COMPLETED, () => { completed = true; });
  const started = Date.now();
  await agent.postUserMessage(new AgentInputUserMessage(prompt));
  const finished = await waitFor(() => completed && agent.context.state.activeTurn === null, TASK_TIMEOUT_MS);
  let success = false;
  try { success = Boolean(succeeded(world, workspace)); } catch { success = false; }
  await agent.stop(5).catch(() => undefined);
  rmSync(workspace, { recursive: true, force: true });
  rmSync(memoryDir, { recursive: true, force: true });
  const prompts = usages.map((u) => u.prompt).filter((n) => typeof n === 'number');
  return {
    agent: agentKey, task: taskId, toolSearch, success, finished, seconds: Math.round((Date.now() - started) / 1000),
    requests: usages.length, firstPromptTokens: prompts[0] ?? null,
    meanPromptTokens: prompts.length ? Math.round(prompts.reduce((s, n) => s + n, 0) / prompts.length) : null,
    usages, toolsCalled: calls, errors,
  };
}

const results = [];
for (let rep = 0; rep < REPS; rep += 1) {
  for (const agentKey of AGENTS) {
    for (const task of TASKS[agentKey].filter(([id]) => !ONLY_TASKS || ONLY_TASKS.includes(id))) {
      (AgentFactory).instance = undefined;
      const row = await runTask(agentKey, task).catch((error) => ({ agent: agentKey, task: task[0], success: false, error: String(error?.message ?? error) }));
      results.push({ rep, model: MODEL, listed: LISTED, root, ...row });
      console.log(JSON.stringify({ rep, task: row.task, toolSearch: row.toolSearch, success: row.success, requests: row.requests, firstPromptTokens: row.firstPromptTokens, meanPromptTokens: row.meanPromptTokens, error: row.error }));
      writeFileSync(outPath, JSON.stringify(results, null, 2));
    }
  }
}
const summary = {};
for (const agentKey of AGENTS) {
  const rows = results.filter((r) => r.agent === agentKey && r.usages);
  const all = rows.flatMap((r) => r.usages);
  const mean = (values) => values.length ? Math.round(values.reduce((s, n) => s + n, 0) / values.length) : null;
  summary[agentKey] = {
    tasks: rows.length, succeeded: rows.filter((r) => r.success).length,
    meanFirstPromptTokens: mean(rows.map((r) => r.firstPromptTokens).filter((n) => typeof n === 'number')),
    meanPromptTokensPerRequest: mean(all.map((u) => u.prompt).filter((n) => typeof n === 'number')),
    meanCacheReadPerRequest: mean(all.map((u) => u.cacheRead).filter((n) => typeof n === 'number')),
    meanRequestsPerTask: rows.length ? Math.round((rows.reduce((s, r) => s + r.requests, 0) / rows.length) * 10) / 10 : null,
  };
}
writeFileSync(outPath, JSON.stringify({ model: MODEL, listed: LISTED, root, summary, results }, null, 2));
console.log(JSON.stringify(summary, null, 2));
process.exit(0);
