// Live probe (2026-11-17): can a model on each native provider find a hidden tool by search and then call it?
// Mode "proxy": tools = [search_tools, call_tool]; the found tool is called through call_tool{name, arguments}.
// Mode "direct": tools = [search_tools]; the found tool is called by its own name although it is not declared.
// Also measures the provider-reported prompt tokens of one request with the agent's full tool list vs the reduced list.
// Usage: AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault node probe-search-then-call.mjs <worktree> <schemas json> <out json> [model ...]
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const [root, schemasPath, outPath, ...modelArgs] = process.argv.slice(2);
const ts = (p) => pathToFileURL(path.join(root, 'autobyteus-ts/dist', p)).href;
const { LLMFactory } = await import(ts('llm/llm-factory.js'));
const { Message, MessageRole, ToolCallPayload, ToolResultPayload } = await import(ts('llm/utils/messages.js'));
const { LLMProvider } = await import(ts('llm/providers.js'));

const agentSchemas = JSON.parse(readFileSync(schemasPath, 'utf8'))['project-task-manager'];
const models = modelArgs.length ? modelArgs : ['deepseek-v4-flash', 'deepseek-v4-pro', 'gemini-3.8-flash', 'kimi-k3', 'glm-5.3', 'grok-4.7', 'gpt-5.4-mini', 'claude-sonnet-5-5'];
const DEFERRED = ['update_task', 'create_task', 'get_project_task', 'search_project_tasks', 'create_project', 'update_project', 'list_peer_nodes', 'search_memory'];
const ALWAYS = ['list_projects', 'list_project_tasks', 'delegate_task', 'send_message_to', 'list_available_agents', 'read_file', 'write_file', 'edit_file', 'run_bash'];

const generic = (name, description, parameters) => ({ name, description, parameters });
const SEARCH = generic('search_tools',
  `Find tools that are not listed here and get their full definitions. Searchable tools: ${DEFERRED.join(', ')}. ` +
  'Give a few words or exact tool names; the result lists each matching tool with its description and argument schema. ' +
  'Then call a found tool with call_tool.',
  { type: 'object', properties: { query: { type: 'string', description: 'Words or exact tool names, e.g. "update_task" or "close a task".' } }, required: ['query'] });
const SEARCH_DIRECT = { ...SEARCH, description: SEARCH.description.replace('Then call a found tool with call_tool.', 'Then call a found tool by its name.') };
const CALL = generic('call_tool',
  'Call a tool that search_tools found. name: the tool\'s exact name; arguments: an object matching that tool\'s argument schema.',
  { type: 'object', properties: { name: { type: 'string' }, arguments: { type: 'object', description: "The found tool's arguments." } }, required: ['name', 'arguments'] });

const format = (provider, t) => provider === LLMProvider.ANTHROPIC ? { name: t.name, description: t.description, input_schema: t.parameters }
  : provider === LLMProvider.GEMINI ? { name: t.name, description: t.description, parameters: t.parameters }
  : { type: 'function', function: { name: t.name, description: t.description, parameters: t.parameters } };
const pick = (provider, names) => {
  const key = provider === LLMProvider.ANTHROPIC ? 'ANTHROPIC' : provider === LLMProvider.GEMINI ? 'GEMINI' : 'DEEPSEEK';
  const list = agentSchemas.schemas[key];
  return names.map((n) => list[agentSchemas.toolNames.indexOf(n)]);
};
const definitionText = (n) => JSON.stringify(pick(LLMProvider.DEEPSEEK, [n])[0].function);

const SYSTEM = 'You are the Project Task Manager. You work with tools. Project: project_a1. When a tool you need is not listed, search for it with search_tools.';
const USER = 'Close Task autobyteus-77 in Project project_a1 as DONE, with the comment "Delivered and verified". Do it now with your tools; do not ask me.';

async function call(llm, messages, tools) {
  const calls = new Map(); let text = ''; let usage = null; let reasoning = '';
  for await (const chunk of llm.streamMessages(messages, tools.length ? { tools } : {}, { promptCacheScope: 'conversation', signal: AbortSignal.timeout(180000), turnId: 't1' })) {
    text += chunk.content ?? ''; reasoning += chunk.reasoning ?? '';
    for (const d of chunk.tool_calls ?? []) {
      const c = calls.get(d.index) ?? { id: null, name: '', args: '', native: null };
      if (d.call_id) c.id = d.call_id; if (d.name) c.name = d.name; if (d.arguments_delta) c.args += d.arguments_delta; if (d.native_context) c.native = d.native_context;
      calls.set(d.index, c);
    }
    if (chunk.usage) usage = chunk.usage;
  }
  return { text, reasoning, usage, calls: [...calls.values()].map((c) => ({ ...c, parsed: (() => { try { return JSON.parse(c.args || '{}'); } catch { return null; } })() })) };
}

async function makeLlm(model) {
  const isGemini = await LLMFactory.requiresGeminiRuntimeResolver(model);
  return LLMFactory.createLLM(model, undefined, undefined, isGemini ? async () => ({ kind: process.env.GEMINI_MODE ?? 'vertexExpress' }) : undefined);
}

const TASK = { taskId: 'autobyteus-77', projectId: 'project_a1', title: 'Ship the export button', status: 'IN_PROGRESS' };
const fakeResult = (name, args) => {
  if (name === 'search_tools') {
    const q = String(args?.query ?? '').toLowerCase();
    const names = DEFERRED.filter((n) => q.includes(n) || (n === 'update_task' && /close|status|done|update|comment/.test(q)));
    const found = names.length ? names : ['update_task'];
    return `Found ${found.length} tool(s):\n` + found.map(definitionText).join('\n');
  }
  if (name === 'list_project_tasks') return JSON.stringify({ tasks: [TASK] });
  if (name === 'get_project_task') return JSON.stringify(TASK);
  if (name === 'list_projects') return JSON.stringify({ projects: [{ projectId: 'project_a1', name: 'AutoByteus' }] });
  if (name === 'update_task') return JSON.stringify({ taskId: 'autobyteus-77', status: args?.status ?? null });
  return 'OK';
};

async function episode(model, mode) {
  const llm = await makeLlm(model); const p = llm.model.provider;
  const tools = [...pick(p, ALWAYS), ...(mode === 'proxy' ? [format(p, SEARCH), format(p, CALL)] : [format(p, SEARCH_DIRECT)])];
  const messages = [new Message(MessageRole.SYSTEM, SYSTEM), new Message(MessageRole.USER, USER)];
  const rounds = []; let searched = false;
  for (let i = 0; i < 6; i += 1) {
    let r;
    try { r = await call(llm, messages, tools); } catch (e) { return { model, mode, rounds, outcome: searched ? 'error_after_search' : 'error', error: String(e?.message ?? e).slice(0, 400) }; }
    rounds.push({ calls: r.calls.map((c) => ({ name: c.name, args: c.parsed })), text: r.text.slice(0, 200), promptTokens: r.usage?.input_tokens ?? null, cacheRead: r.usage?.cache_read_input_tokens ?? null });
    if (!r.calls.length) return { model, mode, rounds, outcome: searched ? 'stopped_without_call' : 'no_search' };
    if (r.calls.some((c) => c.name === 'search_tools')) searched = true;
    for (const c of r.calls) {
      const target = mode === 'proxy' ? (c.name === 'call_tool' && c.parsed?.name === 'update_task' ? c.parsed.arguments : null) : (c.name === 'update_task' ? c.parsed : null);
      if (target) {
        const ok = String(target.task_id ?? '').toLowerCase() === 'autobyteus-77' && String(target.status ?? '').toUpperCase() === 'DONE';
        return { model, mode, rounds, searched, outcome: ok ? 'called_correctly' : 'called_wrong_args', targetArgs: target };
      }
    }
    messages.push(new Message(MessageRole.ASSISTANT, { content: r.text || null, reasoning_content: r.reasoning || null,
      tool_payload: new ToolCallPayload(r.calls.map((c) => ({ id: c.id, name: c.name, arguments: c.parsed ?? {}, ...(c.native ? { nativeToolCallContext: c.native } : {}) }))) }));
    for (const c of r.calls) {
      const isProxy = c.name === 'call_tool';
      const result = isProxy ? fakeResult(c.parsed?.name, c.parsed?.arguments) : fakeResult(c.name, c.parsed);
      messages.push(new Message(MessageRole.TOOL, { tool_payload: new ToolResultPayload(c.id, c.name, result) }));
    }
  }
  return { model, mode, rounds, searched, outcome: 'not_called_in_6_rounds' };
}

async function tokens(model) {
  const llm = await makeLlm(model); const p = llm.model.provider;
  const messages = [new Message(MessageRole.SYSTEM, SYSTEM), new Message(MessageRole.USER, 'Reply with the single word OK. Do not use tools.')];
  const all = pick(p, agentSchemas.toolNames);
  const reduced = [...pick(p, ALWAYS), format(p, SEARCH), format(p, CALL)];
  const res = {};
  for (const [k, t] of Object.entries({ none: [], all, reduced })) {
    try { const r = await call(llm, messages, t); res[k] = r.usage?.input_tokens ?? null; res[k + '_usage'] = r.usage; } catch (e) { res[k] = 'error: ' + String(e?.message ?? e).slice(0, 200); }
  }
  return res;
}

const reps = Number(process.env.PROBE_REPS ?? 1);
const results = [];
for (const model of models) {
  const entry = { model };
  try { entry.tokens = await tokens(model); } catch (e) { entry.tokens = { error: String(e?.message ?? e).slice(0, 300) }; }
  for (const mode of ['proxy', 'direct']) {
    entry[mode] = [];
    for (let k = 0; k < reps; k += 1) {
      try { entry[mode].push(await episode(model, mode)); } catch (e) { entry[mode].push({ outcome: 'error', error: String(e?.message ?? e).slice(0, 400) }); }
    }
  }
  results.push(entry);
  console.log(JSON.stringify({ model, tokens: { none: entry.tokens.none, all: entry.tokens.all, reduced: entry.tokens.reduced }, proxy: entry.proxy.map((e) => e.outcome), direct: entry.direct.map((e) => e.outcome), errors: [...entry.proxy, ...entry.direct].map((e) => e.error).filter(Boolean) }));
  writeFileSync(outPath, JSON.stringify(results, null, 2));
}
process.exit(0);
