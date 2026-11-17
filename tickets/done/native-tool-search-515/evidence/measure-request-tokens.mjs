// Provider-reported prompt tokens of one minimal request per tool set, for real agents' native tool sets.
// Sets: none, all (today), usage (rarely used tools searchable), base (only run_bash/read_file/write_file/edit_file listed).
// The search_tools + call_tool definitions are added to every reduced set.
// Usage: AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault node measure-request-tokens.mjs <worktree> <schemas json> <out json> [model ...]
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const [root, schemasPath, outPath, ...modelArgs] = process.argv.slice(2);
const ts = (p) => pathToFileURL(path.join(root, 'autobyteus-ts/dist', p)).href;
const { LLMFactory } = await import(ts('llm/llm-factory.js'));
const { Message, MessageRole } = await import(ts('llm/utils/messages.js'));
const { LLMProvider } = await import(ts('llm/providers.js'));
const schemas = JSON.parse(readFileSync(schemasPath, 'utf8'));
const models = modelArgs.length ? modelArgs : ['deepseek-v4-flash'];
const BASE = ['run_bash', 'read_file', 'write_file', 'edit_file'];
const USAGE_LISTED = {
  'project-task-manager': [...BASE, 'list_projects', 'list_project_tasks', 'delegate_task', 'send_message_to', 'list_available_agents'],
  'autobyteus-daily-assistant': [...BASE, 'open_tab', 'screenshot', 'run_script', 'read_url', 'search_web', 'dom_snapshot', 'close_tab', 'navigate_to', 'list_tabs', 'generate_image'],
};
const meta = (names) => [
  { name: 'search_tools', description: `Find tools that are not listed here and get their full definitions. Searchable tools: ${names.join(', ')}. Give a few words or exact tool names; the result lists each matching tool with its description and argument schema. Then call a found tool with call_tool.`,
    parameters: { type: 'object', properties: { query: { type: 'string', description: 'Words or exact tool names, e.g. "update_task" or "close a task".' } }, required: ['query'] } },
  { name: 'call_tool', description: "Call a tool that search_tools found. name: the tool's exact name; arguments: an object matching that tool's argument schema.",
    parameters: { type: 'object', properties: { name: { type: 'string' }, arguments: { type: 'object', description: "The found tool's arguments." } }, required: ['name', 'arguments'] } },
];
const format = (p, t) => p === LLMProvider.ANTHROPIC ? { name: t.name, description: t.description, input_schema: t.parameters }
  : p === LLMProvider.GEMINI ? { name: t.name, description: t.description, parameters: t.parameters }
  : { type: 'function', function: { name: t.name, description: t.description, parameters: t.parameters } };
const key = (p) => p === LLMProvider.ANTHROPIC ? 'ANTHROPIC' : p === LLMProvider.GEMINI ? 'GEMINI' : 'DEEPSEEK';
async function promptTokens(llm, tools) {
  const messages = [new Message(MessageRole.SYSTEM, 'You are an assistant.'), new Message(MessageRole.USER, 'Reply with the single word OK. Do not use tools.')];
  let usage = null;
  for await (const c of llm.streamMessages(messages, tools.length ? { tools } : {}, { promptCacheScope: 'conversation', signal: AbortSignal.timeout(120000), turnId: 't' })) if (c.usage) usage = c.usage;
  return usage?.input_tokens ?? null;
}
const out = [];
for (const model of models) {
  const isGemini = await LLMFactory.requiresGeminiRuntimeResolver(model);
  const llm = await LLMFactory.createLLM(model, undefined, undefined, isGemini ? async () => ({ kind: process.env.GEMINI_MODE ?? 'vertexExpress' }) : undefined);
  const p = llm.model.provider;
  for (const [agent, a] of Object.entries(schemas)) {
    const byName = (names) => names.map((n) => a.schemas[key(p)][a.toolNames.indexOf(n)]);
    const searchable = (listed) => a.toolNames.filter((n) => !listed.includes(n));
    const sets = { none: [], all: byName(a.toolNames) };
    for (const [label, listed] of [['usage', USAGE_LISTED[agent]], ['base', BASE]]) sets[label] = [...byName(listed), ...meta(searchable(listed)).map((t) => format(p, t))];
    const row = { model, agent };
    for (const [label, tools] of Object.entries(sets)) {
      try { row[label] = await promptTokens(llm, tools); } catch (e) { row[label] = 'error: ' + String(e?.message ?? e).slice(0, 160); }
    }
    out.push(row); console.log(JSON.stringify(row)); writeFileSync(outPath, JSON.stringify(out, null, 2));
  }
}
process.exit(0);
