// API-13 (autobyteus-515, API/E2E): upgrade restore. A native run written by the OLD build (every tool listed, tools called
// directly, raw traces without `called_through`) is restored by the NEW build with tool search on, as after an app update.
// Expected (requirements "Data Continuity", design "Persisted Data": Directly Usable — No Migration): the restored run's
// first request carries the new split (base tools + search_tools + call_tool), the provider accepts the history that holds
// direct calls of tools that are no longer declared, the agent finds and calls a searchable tool, and every request after
// the restore carries identical tools.
//
// Two processes, as an app restart is: `write` runs on <oldRoot>'s dist, `restore` on <newRoot>'s dist, same memory folder.
// The tool definitions are the real ones (server registration, as evaluate-tool-search.mjs does); their behavior is an
// in-memory world saved between the two processes. Nothing outside the temp folders changes.
//
// Usage: AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault node API-13-upgrade-restore-probe.mjs <oldRoot> <newRoot> <model> <out.json>
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const [mode, ...args] = process.argv.slice(2);

const PM_TOOLS = ['list_projects', 'update_project', 'list_project_tasks', 'get_project_task', 'create_task', 'update_task', 'search_memory', 'read_file', 'write_file', 'edit_file', 'run_bash'];
const BASE = ['run_bash', 'read_file', 'edit_file', 'write_file'];
const SYSTEM = 'You are the Project Task Manager. You manage the Projects and Tasks on this node. Do what the user asks with your tools, then reply briefly.';

if (mode !== 'write' && mode !== 'restore') {
  // Driver: old build writes, new build restores.
  const [oldRoot, newRoot, model, out] = [mode, ...args];
  if (!oldRoot || !newRoot || !model || !out) throw new Error('Usage: node API-13-upgrade-restore-probe.mjs <oldRoot> <newRoot> <model> <out.json>');
  const work = mkdtempSync(path.join(os.tmpdir(), 'nts515-upgrade-'));
  const self = fileURLToPath(import.meta.url);
  const run = (phase, root) => {
    const result = spawnSync(process.execPath, [self, phase, root, model, work], { encoding: 'utf8', env: process.env, timeout: 600_000 });
    return { status: result.status, stderrTail: (result.stderr ?? '').split('\n').filter((l) => /error|Error/.test(l)).slice(-15) };
  };
  const write = run('write', oldRoot);
  const restore = run('restore', newRoot);
  const read = (name) => existsSync(path.join(work, name)) ? JSON.parse(readFileSync(path.join(work, name), 'utf8')) : null;
  const memoryFiles = existsSync(path.join(work, 'memory')) ? readdirSync(path.join(work, 'memory'), { recursive: true }).map(String) : [];
  const rawTraces = memoryFiles.filter((f) => /raw_traces.*\.jsonl$/.test(f)).flatMap((f) => readFileSync(path.join(work, 'memory', f), 'utf8')
    .split('\n').filter(Boolean).map((line) => JSON.parse(line)))
    .filter((t) => t.trace_type === 'tool_call' || t.trace_type === 'tool_result')
    .map((t) => ({ type: t.trace_type, tool: t.tool_name, called_through: t.called_through ?? null, turn: t.turn_id }));
  const report = { model, oldRoot, newRoot, write: { ...write, ...read('write.json') }, restore: { ...restore, ...read('restore.json') }, rawTraces };
  writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ model, write: report.write.summary, restore: report.restore.summary }, null, 2));
  rmSync(work, { recursive: true, force: true });
  process.exit(0);
}

// ---- one phase in one build ------------------------------------------------------------------------------------------
const [root, model, work] = args;
const ts = (p) => import(pathToFileURL(path.join(root, 'autobyteus-ts/dist', p)).href);
const server = (p) => import(pathToFileURL(path.join(root, 'autobyteus-server-ts/dist', p)).href);
const { registerTools } = await ts('tools/register-tools.js');
registerTools();
await (await server('agent-tools/project-tasks/project-task-native-tools.js')).registerProjectTaskTools();
await (await server('agent-tools/memory/memory-native-tools.js')).registerMemoryTools();
const { defaultToolRegistry } = await ts('tools/registry/tool-registry.js');
const { BaseTool } = await ts('tools/base-tool.js');
const { AgentConfig } = await ts('agent/context/agent-config.js');
const { AgentFactory } = await ts('agent/factory/agent-factory.js');
const { AgentInputUserMessage } = await ts('agent/message/agent-input-user-message.js');
const { AgentStatus } = await ts('agent/status/status-enum.js');
const { EventType } = await ts('events/event-types.js');
const { LLMFactory } = await ts('llm/llm-factory.js');

const worldFile = path.join(work, 'world.json');
const world = existsSync(worldFile) ? JSON.parse(readFileSync(worldFile, 'utf8')) : {
  projects: { project_a1: { projectId: 'project_a1', name: 'AutoByteus' } },
  tasks: {
    'autobyteus-77': { taskId: 'autobyteus-77', projectId: 'project_a1', title: 'Fix the login redirect', status: 'IN_PROGRESS', comments: [] },
    'autobyteus-78': { taskId: 'autobyteus-78', projectId: 'project_a1', title: 'Ship the export button', status: 'TODO', comments: [] },
  },
};
const calls = [];
const findTask = (a) => { const t = world.tasks[String(a.task_id ?? '')]; if (!t) throw new Error(`Task '${a.task_id}' not found.`); return t; };
const handlers = {
  list_projects: () => JSON.stringify({ projects: Object.values(world.projects) }),
  update_project: (a) => { const p = world.projects[a.project_id]; if (!p) throw new Error(`Project '${a.project_id}' not found.`); if (a.name) p.name = a.name; return JSON.stringify(p); },
  list_project_tasks: (a) => JSON.stringify({ tasks: Object.values(world.tasks).filter((t) => t.projectId === a.project_id) }),
  get_project_task: (a) => JSON.stringify(findTask(a)),
  create_task: () => 'Created.',
  update_task: (a) => { const t = findTask(a); if (a.status) t.status = a.status; if (a.add_comment) t.comments.push(a.add_comment); return JSON.stringify(t); },
  search_memory: () => JSON.stringify({ results: [] }),
};
class WorldTool extends BaseTool {
  constructor(name) { super(); this.toolName = name; }
  getName() { return this.toolName; }
  getArgumentSchema() { return defaultToolRegistry.getToolDefinition(this.toolName)?.argumentSchema ?? null; }
  async _execute(_c, a = {}) { calls.push(this.toolName); const h = handlers[this.toolName]; if (!h) throw new Error(`${this.toolName} is not available in this run; use the other tools.`); return h(a); }
}

const isGemini = await LLMFactory.requiresGeminiRuntimeResolver(model);
const llm = await LLMFactory.createLLM(model, undefined, undefined, isGemini ? async () => ({ kind: process.env.GEMINI_MODE ?? 'vertexExpress' }) : undefined);
const requests = [];
const original = llm.streamMessages.bind(llm);
llm.streamMessages = (messages, kwargs, options) => { requests.push(JSON.stringify(kwargs?.tools ?? [])); return original(messages, kwargs, options); };
const tools = PM_TOOLS.filter((n) => defaultToolRegistry.getToolDefinition(n)).map((n) => new WorldTool(n));
const memoryDir = path.join(work, 'memory');
const config = new AgentConfig('pm', 'pm', 'upgrade restore probe', llm, SYSTEM, tools);
config.memoryDir = memoryDir;
const toolSearchBuild = 'listedToolNames' in config;
if (mode === 'restore') config.listedToolNames = BASE; // the server's native policy on the new build
const factory = new AgentFactory();
const agentId = 'upgrade_probe_pm';
const agent = mode === 'write' ? factory.createAgentWithId(agentId, config) : factory.restoreAgent(agentId, config, memoryDir);
const waitFor = async (p, ms) => { const s = Date.now(); while (Date.now() - s < ms) { if (p()) return true; await new Promise((r) => setTimeout(r, 200)); } return false; };
agent.start();
await waitFor(() => agent.context.currentStatus === AgentStatus.IDLE, 60_000);
const notifier = agent.context.statusManager.notifier;
const usages = [];
const errors = [];
let completed = 0;
notifier.subscribeFrom(notifier, EventType.AGENT_TOKEN_USAGE_UPDATED, (p) => usages.push({ prompt: p.latest_prompt_tokens ?? null, cacheRead: p.usage?.cache_read_input_tokens ?? null }));
notifier.subscribeFrom(notifier, EventType.AGENT_ERROR_OUTPUT_GENERATION, (p) => errors.push(String(p?.message ?? p).slice(0, 400)));
notifier.subscribeFrom(notifier, EventType.AGENT_TURN_COMPLETED, () => { completed += 1; });
const turn = async (text) => {
  const before = completed; const requestsBefore = requests.length; const callsBefore = calls.length;
  await agent.postUserMessage(new AgentInputUserMessage(text));
  const finished = await waitFor(() => completed > before && agent.context.state.activeTurn === null, 240_000);
  return { text, finished, requests: requests.length - requestsBefore, calls: calls.slice(callsBefore) };
};
const turns = [];
if (mode === 'write') {
  turns.push(await turn('Close Task autobyteus-77 as DONE with the comment "Delivered and verified".'));
} else {
  turns.push(await turn('Rename the Project project_a1 to "AutoByteus Core".'));
  turns.push(await turn('Mark Task autobyteus-78 as IN_PROGRESS.'));
}
await agent.stop(10).catch(() => undefined);
writeFileSync(worldFile, JSON.stringify(world));
const names = requests.map((r) => JSON.parse(r).map((t) => t.function?.name ?? t.name ?? t.functionDeclarations?.map((f) => f.name).join('+')));
const summary = mode === 'write'
  ? { toolSearchBuild, listedToolNames: config.listedToolNames ?? null, success: world.tasks['autobyteus-77'].status === 'DONE', calls, requests: requests.length, errors: errors.length }
  : { toolSearchBuild, success: { rename: world.projects.project_a1.name === 'AutoByteus Core', start: world.tasks['autobyteus-78'].status === 'IN_PROGRESS' },
      calls, requests: requests.length, identicalTools: new Set(requests).size === 1, firstRequestTools: names[0] ?? null, errors: errors.length };
writeFileSync(path.join(work, `${mode}.json`), JSON.stringify({ summary, turns, requestToolNames: names, usages, errors }, null, 2));
process.exit(0);
