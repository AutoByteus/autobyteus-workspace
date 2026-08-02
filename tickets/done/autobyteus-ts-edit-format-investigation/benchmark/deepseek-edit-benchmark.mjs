#!/usr/bin/env node

/**
 * Investigation-only live benchmark for cross-provider file-edit mechanisms.
 *
 * This intentionally runs outside Vitest because the server Vitest global setup
 * resets db/test.db. The benchmark opens the isolated imported-secret database
 * read-only from the caller's perspective and never prints resolved secrets.
 */

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const ticketDir = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(ticketDir, '../../..');
const coreDist = path.join(repoRoot, 'autobyteus-ts', 'dist');
const serverDist = path.join(repoRoot, 'autobyteus-server-ts', 'dist');
const repositoryPrismaModule = path.join(
  repoRoot,
  'autobyteus-server-ts',
  'node_modules',
  'repository_prisma',
  'dist',
  'index.mjs'
);
const defaultDatabasePath = path.join(repoRoot, 'autobyteus-server-ts', 'db', 'test.db');

const originalDebug = console.debug;
if (process.env.BENCH_VERBOSE !== '1') {
  console.debug = () => {};
}

const writeProgress = (message) => process.stdout.write(`${message}\n`);

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith('--')) continue;
    const key = value.slice(2);
    const next = argv[index + 1];
    if (next !== undefined && !next.startsWith('--')) {
      args[key] = next;
      index += 1;
    } else {
      args[key] = 'true';
    }
  }
  return args;
}

const cli = parseArgs(process.argv.slice(2));
const toolCallFormat = cli['tool-call-format'] ?? 'api_tool_call';
if (!['api_tool_call', 'xml'].includes(toolCallFormat)) {
  throw new Error(`--tool-call-format must be api_tool_call or xml; got ${toolCallFormat}`);
}
process.env.AUTOBYTEUS_STREAM_PARSER = toolCallFormat;
const splitList = (value, fallback) => (value ?? fallback).split(',').map((part) => part.trim()).filter(Boolean);
const models = splitList(cli.models, 'deepseek-v4-flash');
const variants = splitList(cli.variants, 'strict_edit,replace,write,bash,portfolio');
const scenarioIds = splitList(cli.scenarios, 'small_exact,multiline_config,repeated_target,late_insertion');
const trials = Math.max(1, Number.parseInt(cli.trials ?? '1', 10));
const timeoutMs = Math.max(10_000, Number.parseInt(cli['timeout-ms'] ?? '240000', 10));
const thinkingType = cli.thinking ?? 'enabled';
const reasoningEffort = cli['reasoning-effort'] ?? 'high';
const databasePath = path.resolve(cli.database ?? defaultDatabasePath);
const runId = cli['run-id'] ?? `${new Date().toISOString().replace(/[:.]/g, '-')}-${thinkingType}`;
const outputPath = path.resolve(cli.out ?? path.join(ticketDir, 'benchmark-evidence', `${runId}.jsonl`));

if (!['enabled', 'disabled'].includes(thinkingType)) {
  throw new Error(`--thinking must be enabled or disabled; got ${thinkingType}`);
}

const SCENARIOS = {
  small_exact: {
    relativePath: 'src/settings.ts',
    original: `export const settings = {\n  retryCount: 2,\n  region: 'eu-central-1'\n};\n`,
    expected: `export const settings = {\n  retryCount: 5,\n  region: 'eu-central-1'\n};\n`,
    task: 'Change retryCount from 2 to 5. Preserve every other byte of the file.'
  },
  multiline_config: {
    relativePath: 'config/service.yaml',
    original: `# Service defaults\nserver:\n  host: 0.0.0.0\n  port: 8080\n\nlogging:\n  level: info\n  format: json\n\ndatabase:\n  poolSize: 12\n  ssl: true\n`,
    expected: `# Service defaults\nserver:\n  host: 0.0.0.0\n  port: 8095\n\nlogging:\n  level: debug\n  format: json\n\ndatabase:\n  poolSize: 12\n  ssl: true\n`,
    task: 'Change server.port from 8080 to 8095 and logging.level from info to debug. Keep the comment, whitespace, and database section unchanged.'
  },
  repeated_target: {
    relativePath: 'config/releases.yaml',
    original: `releases:\n  - name: alpha\n    status: draft\n    owner: platform\n  - name: beta\n    status: draft\n    owner: payments\n  - name: gamma\n    status: ready\n    owner: search\n`,
    expected: `releases:\n  - name: alpha\n    status: draft\n    owner: platform\n  - name: beta\n    status: ready\n    owner: payments\n  - name: gamma\n    status: ready\n    owner: search\n`,
    task: 'Change only the beta release status from draft to ready. Do not change alpha, gamma, owners, indentation, or final newline.'
  },
  late_insertion: {
    relativePath: 'src/catalog.ts',
    original: `${Array.from({ length: 36 }, (_, index) => `export const item${String(index + 1).padStart(2, '0')} = '${index + 1}';`).join('\n')}\n\nexport const catalog = {\n  enabled: true,\n  pageSize: 20\n};\n`,
    expected: `${Array.from({ length: 36 }, (_, index) => `export const item${String(index + 1).padStart(2, '0')} = '${index + 1}';`).join('\n')}\n\nexport const catalog = {\n  enabled: true,\n  pageSize: 20,\n  auditLabel: 'deepseek-benchmark'\n};\n`,
    task: `Add auditLabel: 'deepseek-benchmark' after pageSize in the catalog object near the end of the file, including the needed comma. Preserve all preceding exports exactly.`
  }
};

const unknownScenarios = scenarioIds.filter((id) => !SCENARIOS[id]);
if (unknownScenarios.length) throw new Error(`Unknown scenarios: ${unknownScenarios.join(', ')}`);

const unknownVariants = variants.filter((id) => ![
  'strict_edit',
  'strict_edit_neutral',
  'context_edit',
  'context_edit_neutral',
  'generic_edit',
  'replace',
  'write',
  'bash',
  'portfolio',
  'portfolio_neutral',
  'reported_toolset',
  'reported_legacy_schema'
].includes(id));
if (unknownVariants.length) throw new Error(`Unknown variants: ${unknownVariants.join(', ')}`);

const importDist = (base, relativePath) => import(pathToFileURL(path.join(base, relativePath)).href);

const [
  { AgentFactory },
  { AgentConfig },
  { AgentStatus },
  { AgentInputUserMessage },
  { EventType },
  { LLMFactory },
  { registerReadFileTool },
  { registerEditFileTool, editFile },
  { registerReplaceInFileTool },
  { registerInsertInFileTool },
  { registerWriteFileTool },
  { registerRunBashTool },
  { tool },
  { ParameterSchema, ParameterDefinition, ParameterType },
  { defaultToolRegistry },
  { ToolCategory },
  { ApplicationDatabaseLocation },
  { getSecretVaultRuntime },
  { createLlmProviderApiKeyResolver },
  { createGeminiRuntimeResolver },
  { initializePrisma, shutdownPrisma }
] = await Promise.all([
  importDist(coreDist, 'agent/factory/agent-factory.js'),
  importDist(coreDist, 'agent/context/agent-config.js'),
  importDist(coreDist, 'agent/status/status-enum.js'),
  importDist(coreDist, 'agent/message/agent-input-user-message.js'),
  importDist(coreDist, 'events/event-types.js'),
  importDist(coreDist, 'llm/llm-factory.js'),
  importDist(coreDist, 'tools/file/read-file.js'),
  importDist(coreDist, 'tools/file/edit-file.js'),
  importDist(coreDist, 'tools/file/replace-in-file.js'),
  importDist(coreDist, 'tools/file/insert-in-file.js'),
  importDist(coreDist, 'tools/file/write-file.js'),
  importDist(coreDist, 'tools/terminal/tools/run-bash.js'),
  importDist(coreDist, 'tools/functional-tool.js'),
  importDist(coreDist, 'utils/parameter-schema.js'),
  importDist(coreDist, 'tools/registry/tool-registry.js'),
  importDist(coreDist, 'tools/tool-category.js'),
  importDist(serverDist, 'config/application-database-location.js'),
  importDist(serverDist, 'secret-management/secret-vault-runtime.js'),
  importDist(serverDist, 'secret-management/resolution/secret-management-provider-api-key-resolver.js'),
  importDist(serverDist, 'llm-management/services/gemini-runtime-resolver-adapter.js'),
  import(pathToFileURL(repositoryPrismaModule).href)
]);

let legacyEditTool = null;
let genericEditTool = null;

function registerGenericEditTool() {
  if (genericEditTool) return genericEditTool;
  const schema = new ParameterSchema();
  schema.addParameter(new ParameterDefinition({
    name: 'path',
    type: ParameterType.STRING,
    description: 'Path to the target file.',
    required: true
  }));
  schema.addParameter(new ParameterDefinition({
    name: 'patch',
    type: ParameterType.STRING,
    description: 'Patch hunks describing the edits to apply.',
    required: true
  }));
  defaultToolRegistry.unregisterTool('edit_file');
  genericEditTool = tool({
    name: 'edit_file',
    description: 'Applies patch hunks to update a text file without overwriting unrelated content.',
    argumentSchema: schema,
    category: ToolCategory.FILE_SYSTEM,
    paramNames: ['context', 'path', 'patch']
  })(async function genericEditFile(context, path, patch) {
    return editFile(context, path, undefined, patch);
  });
  return genericEditTool;
}

function registerLegacyEditTool() {
  if (legacyEditTool) return legacyEditTool;
  const schema = new ParameterSchema();
  schema.addParameter(new ParameterDefinition({
    name: 'path',
    type: ParameterType.STRING,
    description: 'Path to the target file.',
    required: true
  }));
  schema.addParameter(new ParameterDefinition({
    name: 'patch',
    type: ParameterType.STRING,
    description: 'Unified diff hunks describing edits to apply.',
    required: true
  }));
  defaultToolRegistry.unregisterTool('edit_file');
  legacyEditTool = tool({
    name: 'edit_file',
    description: 'Applies a unified diff patch to update a text file without overwriting unrelated content.',
    argumentSchema: schema,
    category: ToolCategory.FILE_SYSTEM,
    paramNames: ['context', 'path', 'patch']
  })(async function legacyEditFile(context, path, patch) {
    return editFile(context, path, undefined, patch);
  });
  return legacyEditTool;
}

function toolsForVariant(variant) {
  const read = registerReadFileTool();
  switch (variant) {
    case 'strict_edit':
    case 'strict_edit_neutral':
    case 'context_edit':
    case 'context_edit_neutral':
      return [read, registerEditFileTool()];
    case 'generic_edit':
      return [read, registerGenericEditTool()];
    case 'replace': return [read, registerReplaceInFileTool()];
    case 'write': return [read, registerWriteFileTool()];
    case 'bash': return [read, registerRunBashTool()];
    case 'portfolio':
    case 'portfolio_neutral':
      return [
        read,
        registerEditFileTool(),
        registerReplaceInFileTool(),
        registerInsertInFileTool(),
        registerWriteFileTool(),
        registerRunBashTool()
      ];
    case 'reported_toolset':
      // Matches the supplied Product Prototyper config and screenshots: the
      // safer exact replacement/insertion tools are not available.
      return [read, registerEditFileTool(), registerWriteFileTool(), registerRunBashTool()];
    case 'reported_legacy_schema':
      // Reproduces the pre-2026-04-08 generic edit_file schema that did not
      // teach the numeric hunk grammar. This is the closest controlled match
      // for the supplied screenshots' bare-@@ arguments.
      return [read, registerLegacyEditTool(), registerWriteFileTool(), registerRunBashTool()];
    default: throw new Error(`Unhandled variant: ${variant}`);
  }
}

function systemPromptForVariant(variant) {
  const common = [
    'You are benchmarking file-edit reliability.',
    'Always inspect the target with the available read tool before editing.',
    'Use absolute paths.',
    'Perform the requested change using the available tool(s), preserve unrelated content, then finish concisely.'
  ];
  const mechanism = {
    strict_edit: 'For modifications, use edit_file. Its patch argument must be a valid unified diff with numeric hunk headers such as @@ -2,3 +2,3 @@.',
    strict_edit_neutral: 'For modifications, use edit_file.',
    context_edit: 'For modifications, use edit_file. Start each patch hunk with a bare @@ line, use surrounding unchanged/removal text to locate it, and never include line numbers or file headers.',
    context_edit_neutral: 'For modifications, use edit_file.',
    generic_edit: 'For modifications, use edit_file.',
    replace: 'For modifications, use replace_in_file with exact old_text and new_text copied from the file.',
    write: 'For modifications, use write_file and provide the complete final file content.',
    bash: 'For modifications, use run_bash with a non-interactive command. Do not use any unavailable file-edit tool.',
    portfolio: 'Choose the safest available modification tool. Prefer a narrow edit over rewriting unrelated content; recover with another tool if a tool fails.',
    portfolio_neutral: 'Choose an available tool to perform the modification.',
    reported_toolset: 'Choose an available tool to perform the modification.',
    reported_legacy_schema: 'Choose an available tool to perform the modification.'
  }[variant];
  return [...common, mechanism].join(' ');
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForReady(agent, maxMs = 15_000) {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    if (agent.context.currentStatus === AgentStatus.IDLE) return;
    if (agent.context.currentStatus === AgentStatus.ERROR) throw new Error('Agent entered ERROR before becoming ready.');
    await delay(50);
  }
  throw new Error('Agent did not become ready before timeout.');
}

async function waitForTurn(agent, getCompleted, maxMs) {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    if (getCompleted()) return 'completed';
    if (agent.context.currentStatus === AgentStatus.ERROR) return 'agent_error';
    await delay(100);
  }
  return 'timeout';
}

function cleanPayload(value) {
  if (value === undefined) return null;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return String(value);
  }
}

function classifyPatchFormat(patch) {
  if (typeof patch !== 'string') return null;
  const firstLine = patch.split(/\r?\n/).find((line) => line.trim().length > 0)?.trim() ?? '';
  if (firstLine === '@@') return 'bare_context';
  if (/^@@ -\d+(?:,\d+)? \+\d+(?:,\d+)? @@/.test(firstLine)) return 'numeric_unified';
  if (firstLine === '*** Begin Patch') return 'codex_envelope';
  if (firstLine.startsWith('diff --git ') || firstLine.startsWith('--- ')) return 'file_header_diff';
  return 'other';
}

async function runOne({ modelId, variant, scenarioId, trial }) {
  const scenario = SCENARIOS[scenarioId];
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'autobyteus-edit-benchmark-'));
  const targetPath = path.join(workspace, scenario.relativePath);
  const sentinelPath = path.join(workspace, 'DO_NOT_EDIT.txt');
  const memoryDir = path.join(workspace, '.memory');
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, scenario.original, 'utf8');
  await fs.writeFile(sentinelPath, 'sentinel-unchanged\n', 'utf8');

  const extraParams = modelId.startsWith('deepseek-')
    ? (thinkingType === 'enabled'
        ? { thinking_type: 'enabled', reasoning_effort: reasoningEffort }
        : { thinking_type: 'disabled' })
    : modelId.startsWith('gemini-')
      ? { thinking_level: thinkingType === 'enabled' ? reasoningEffort : 'minimal' }
      : modelId.startsWith('gpt-')
        ? { reasoning_effort: thinkingType === 'enabled' ? reasoningEffort : 'none' }
        : {};
  const llm = await LLMFactory.createLLM(
    modelId,
    { temperature: 0, extraParams },
    createLlmProviderApiKeyResolver(),
    modelId.startsWith('gemini-') ? createGeminiRuntimeResolver() : undefined
  );

  const config = new AgentConfig(
    `CrossProviderEditBenchmark_${variant}_${scenarioId}_${trial}`,
    'File edit benchmark agent',
    `Measures ${variant} behavior on ${scenarioId}.`,
    llm,
    systemPromptForVariant(variant),
    toolsForVariant(variant),
    true,
    null,
    null,
    null,
    null,
    null,
    workspace,
    null,
    null,
    [],
    memoryDir
  );

  const factory = new AgentFactory();
  const agent = factory.createAgent(config);
  const notifier = agent.context.statusManager?.notifier ?? null;
  const toolCalls = [];
  const usage = [];
  const responses = [];
  let turnCompleted = false;

  const onStarted = (payload) => toolCalls.push({ phase: 'started', ...cleanPayload(payload) });
  const onSucceeded = (payload) => toolCalls.push({ phase: 'succeeded', ...cleanPayload(payload) });
  const onFailed = (payload) => toolCalls.push({ phase: 'failed', ...cleanPayload(payload) });
  const onUsage = (payload) => usage.push(cleanPayload(payload));
  const onResponse = (payload) => responses.push({
    content: typeof payload?.content === 'string' ? payload.content : '',
    reasoning_chars: typeof payload?.reasoning === 'string' ? payload.reasoning.length : 0
  });
  const onTurnCompleted = () => { turnCompleted = true; };

  notifier?.subscribe(EventType.AGENT_TOOL_EXECUTION_STARTED, onStarted);
  notifier?.subscribe(EventType.AGENT_TOOL_EXECUTION_SUCCEEDED, onSucceeded);
  notifier?.subscribe(EventType.AGENT_TOOL_EXECUTION_FAILED, onFailed);
  notifier?.subscribe(EventType.AGENT_TOKEN_USAGE_UPDATED, onUsage);
  notifier?.subscribe(EventType.AGENT_DATA_ASSISTANT_COMPLETE_RESPONSE, onResponse);
  notifier?.subscribe(EventType.AGENT_TURN_COMPLETED, onTurnCompleted);

  const startedAt = Date.now();
  let terminalState = 'not_started';
  let unhandledError = null;
  try {
    agent.start();
    await waitForReady(agent);
    const prompt = [
      `Target file: ${targetPath}`,
      scenario.task,
      `Do not modify ${sentinelPath}.`
    ].join('\n');
    await agent.postUserMessage(new AgentInputUserMessage(prompt));
    terminalState = await waitForTurn(agent, () => turnCompleted, timeoutMs);
  } catch (error) {
    terminalState = 'exception';
    unhandledError = error instanceof Error ? error.message : String(error);
  }

  let actual = null;
  let sentinel = null;
  try { actual = await fs.readFile(targetPath, 'utf8'); } catch {}
  try { sentinel = await fs.readFile(sentinelPath, 'utf8'); } catch {}
  const taskSuccess = actual === scenario.expected && sentinel === 'sentinel-unchanged\n';

  const editingNames = new Set(['edit_file', 'replace_in_file', 'insert_in_file', 'write_file', 'run_bash']);
  const starts = toolCalls.filter((event) => event.phase === 'started');
  const failures = toolCalls.filter((event) => event.phase === 'failed');
  const successes = toolCalls.filter((event) => event.phase === 'succeeded');
  const firstEdit = starts.find((event) => editingNames.has(event.tool_name)) ?? null;
  const firstEditSucceeded = firstEdit
    ? successes.some((event) => event.invocation_id === firstEdit.invocation_id)
    : false;
  const firstPatch = firstEdit?.tool_name === 'edit_file' ? firstEdit.arguments?.patch : null;
  const result = {
    run_id: runId,
    timestamp: new Date().toISOString(),
    model: modelId,
    thinking_type: thinkingType,
    reasoning_effort: thinkingType === 'enabled' ? reasoningEffort : null,
    tool_call_format: toolCallFormat,
    variant,
    scenario: scenarioId,
    trial,
    terminal_state: terminalState,
    duration_ms: Date.now() - startedAt,
    schema_valid_tool_call: starts.length > 0,
    first_edit_tool: firstEdit?.tool_name ?? null,
    first_edit_succeeded: firstEditSucceeded,
    first_edit_patch_format: classifyPatchFormat(firstPatch),
    edit_mutation_succeeded: successes.some((event) => editingNames.has(event.tool_name)),
    task_success: taskSuccess,
    target_exact_match: actual === scenario.expected,
    sentinel_unchanged: sentinel === 'sentinel-unchanged\n',
    recovered_after_failure: failures.length > 0 && taskSuccess,
    failure_count: failures.length,
    tool_calls: toolCalls,
    token_usage_events: usage,
    assistant_responses: responses,
    unhandled_error: unhandledError,
    actual_content: taskSuccess ? null : actual,
    expected_content: taskSuccess ? null : scenario.expected
  };

  notifier?.unsubscribe(EventType.AGENT_TOOL_EXECUTION_STARTED, onStarted);
  notifier?.unsubscribe(EventType.AGENT_TOOL_EXECUTION_SUCCEEDED, onSucceeded);
  notifier?.unsubscribe(EventType.AGENT_TOOL_EXECUTION_FAILED, onFailed);
  notifier?.unsubscribe(EventType.AGENT_TOKEN_USAGE_UPDATED, onUsage);
  notifier?.unsubscribe(EventType.AGENT_DATA_ASSISTANT_COMPLETE_RESPONSE, onResponse);
  notifier?.unsubscribe(EventType.AGENT_TURN_COMPLETED, onTurnCompleted);
  if (agent.isRunning) {
    try { await agent.stop(20); } catch {}
  }
  try { await llm.cleanup(); } catch {}
  await fs.rm(workspace, { recursive: true, force: true });
  return result;
}

await fs.access(databasePath);
await fs.mkdir(path.dirname(outputPath), { recursive: true });
const databaseUrl = pathToFileURL(databasePath).href;
await initializePrisma({ datasourceUrl: databaseUrl });
await getSecretVaultRuntime().initialize(ApplicationDatabaseLocation.fromAbsoluteFileUrl(databaseUrl));

writeProgress(`Cross-provider edit benchmark ${runId}`);
writeProgress(`models=${models.join(',')} thinking=${thinkingType}${thinkingType === 'enabled' ? `/${reasoningEffort}` : ''} tool_call_format=${toolCallFormat}`);
writeProgress(`variants=${variants.join(',')} scenarios=${scenarioIds.join(',')} trials=${trials}`);
writeProgress(`evidence=${outputPath}`);

let completedRuns = 0;
let passedRuns = 0;
try {
  for (const modelId of models) {
    for (const variant of variants) {
      for (const scenarioId of scenarioIds) {
        for (let trial = 1; trial <= trials; trial += 1) {
          const label = `${modelId}/${thinkingType}/${variant}/${scenarioId}/t${trial}`;
          writeProgress(`START ${label}`);
          const result = await runOne({ modelId, variant, scenarioId, trial });
          await fs.appendFile(outputPath, `${JSON.stringify(result)}\n`, 'utf8');
          completedRuns += 1;
          if (result.task_success) passedRuns += 1;
          writeProgress(
            `END   ${label} ${result.task_success ? 'PASS' : 'FAIL'} ` +
            `first=${result.first_edit_tool ?? 'none'} failures=${result.failure_count} ` +
            `state=${result.terminal_state} ms=${result.duration_ms}`
          );
        }
      }
    }
  }
} finally {
  try {
    await getSecretVaultRuntime().close();
  } finally {
    await shutdownPrisma();
  }
  console.debug = originalDebug;
}

writeProgress(`DONE ${passedRuns}/${completedRuns} exact tasks passed`);
