// Dumps the provider-formatted tool schemas the native runtime sends for real agents' tool sets.
// Usage: node dump-agent-tool-schemas.mjs <worktree root> <output json>
// Read-only: registers tools in this process's in-memory registry only.
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const [root, out] = process.argv.slice(2);
const dist = (p) => pathToFileURL(path.join(root, 'autobyteus-server-ts/dist', p)).href;
const ts = (p) => pathToFileURL(path.join(root, 'autobyteus-ts/dist', p)).href;

const { registerTools } = await import(ts('tools/register-tools.js'));
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
]) {
  const m = await import(dist(mod));
  await m[fn]();
}
const { resolveAutoByteusRuntimeAgentToolExposure } = await import(dist('agent-execution/backends/autobyteus/autobyteus-runtime-tool-exposure.js'));
const { ToolSchemaProvider } = await import(ts('tools/usage/providers/tool-schema-provider.js'));
const { defaultToolRegistry } = await import(ts('tools/registry/tool-registry.js'));
const { LLMProvider } = await import(ts('llm/providers.js'));

const agents = {
  'project-task-manager': ["list_projects","create_project","update_project","list_project_tasks","search_project_tasks","search_memory","get_project_task","create_task","update_task","list_available_agents","list_peer_nodes","delegate_task","send_message_to","read_file","write_file","edit_file","run_bash"],
  'autobyteus-daily-assistant': ["run_bash","read_file","read_url","search_web","close_tab","dom_snapshot","list_tabs","navigate_to","open_tab","run_script","screenshot","download_media","edit_image","generate_image","generate_speech","list_available_agents"],
};
// A standalone run (not team-scoped) with a member context: send_message_to + delegate_task + search_memory are automatic.
const memberContext = { teamScoped: false };
const result = {};
for (const [agent, names] of Object.entries(agents)) {
  const exposure = resolveAutoByteusRuntimeAgentToolExposure({ id: agent, toolNames: names }, memberContext);
  const toolNames = exposure.requestedToolNames.filter((n) => defaultToolRegistry.getToolDefinition(n));
  const missing = exposure.requestedToolNames.filter((n) => !defaultToolRegistry.getToolDefinition(n));
  const perProvider = {};
  for (const provider of [LLMProvider.OPENAI, LLMProvider.DEEPSEEK, LLMProvider.ANTHROPIC, LLMProvider.GEMINI]) {
    perProvider[provider] = new ToolSchemaProvider().buildSchema(toolNames, provider);
  }
  const tools = toolNames.map((name, i) => {
    const def = defaultToolRegistry.getToolDefinition(name);
    const description = def.description ?? '';
    const openAi = perProvider.DEEPSEEK[i];
    return { name, descriptionChars: description.length, formattedJsonChars: JSON.stringify(openAi).length };
  });
  result[agent] = { toolNames, missing, tools, totalFormattedJsonChars: tools.reduce((s, t) => s + t.formattedJsonChars, 0), schemas: perProvider };
}
writeFileSync(out, JSON.stringify(result, null, 2));
for (const [agent, r] of Object.entries(result)) {
  console.log(`\n${agent}: ${r.toolNames.length} tools, ${r.totalFormattedJsonChars} JSON chars (OpenAI-compatible format); missing: ${r.missing.join(',') || 'none'}`);
  for (const t of [...r.tools].sort((a, b) => b.formattedJsonChars - a.formattedJsonChars)) console.log(`  ${t.name.padEnd(24)} ${String(t.formattedJsonChars).padStart(6)}  (description ${t.descriptionChars})`);
}
process.exit(0);
