import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [serverRoot, dataDir, baseUrl] = process.argv.slice(2);
if (!serverRoot || !dataDir || !baseUrl) throw new Error('serverRoot, dataDir, and baseUrl are required');
const moduleUrl = (relativePath) => pathToFileURL(path.join(serverRoot, 'dist', relativePath)).href;

const { CodexThreadEventConverter } = await import(moduleUrl('agent-execution/backends/codex/events/codex-thread-event-converter.js'));
const { CodexThreadEventName } = await import(moduleUrl('agent-execution/backends/codex/events/codex-thread-event-name.js'));
const { AgentRunEventType } = await import(moduleUrl('agent-execution/domain/agent-run-event.js'));
const { RuntimeMemoryEventAccumulator } = await import(moduleUrl('agent-memory/services/runtime-memory-event-accumulator.js'));
const { RunMemoryWriter } = await import(moduleUrl('agent-memory/store/run-memory-writer.js'));
const { AgentRunMetadataStore } = await import(moduleUrl('run-history/store/agent-run-metadata-store.js'));

const memoryRoot = path.join(dataDir, 'memory');
const runId = 'packaged-ctb-r6-abd50be3';
const runDir = path.join(memoryRoot, 'agents', runId);
await new AgentRunMetadataStore(memoryRoot).writeMetadata(runId, {
  runId,
  agentDefinitionId: 'agent-packaged-ctb-r6',
  workspaceRootPath: dataDir,
  memoryDir: runDir,
  llmModelIdentifier: 'gpt-5.6-sol',
  llmConfig: { reasoning_effort: 'max' },
  autoExecuteTools: false,
  skillAccessMode: 'PRELOADED_ONLY',
  runtimeKind: 'codex_app_server',
  platformAgentRunId: 'packaged-thread-ctb-r6',
});

const writer = new RunMemoryWriter({ memoryDir: runDir });
const accumulator = new RuntimeMemoryEventAccumulator({
  runId,
  writer,
  toolTraceLifecycleGroups: writer.readToolTraceLifecycleGroups(),
});
const converter = new CodexThreadEventConverter(runId);
const record = (method, params) => {
  const converted = converter.convert({ method, params });
  converted.forEach((event) => accumulator.recordRunEvent(event));
  return converted;
};
const reasoning = (turnId, itemId, text) => {
  const converted = record(CodexThreadEventName.ITEM_COMPLETED, {
    turnId,
    item: { id: itemId, type: 'reasoning', summary: [{ text }] },
  });
  const event = converted.find((candidate) =>
    candidate.eventType === AgentRunEventType.SEGMENT_CONTENT &&
    candidate.payload.segment_type === 'reasoning');
  if (!event) throw new Error(`missing reasoning event for ${itemId}`);
  return event;
};
const ignoredDeltas = (turnId) => [
  CodexThreadEventName.ITEM_REASONING_SUMMARY_TEXT_DELTA,
  CodexThreadEventName.ITEM_REASONING_DELTA,
  CodexThreadEventName.ITEM_REASONING_SUMMARY_PART_ADDED,
].flatMap((method) => record(method, {
  turnId,
  itemId: 'ignored-delta',
  delta: 'PACKAGED_DELTA_MUST_NOT_APPEAR',
}));

// AC10: matching update preserves one A+B block; next card creates a boundary.
record(CodexThreadEventName.TURN_STARTED, { turn: { id: 'turn-matching' } });
if (ignoredDeltas('turn-matching').length !== 0) throw new Error('delta emitted before active block');
record(CodexThreadEventName.ITEM_STARTED, {
  turnId: 'turn-matching',
  item: { id: 'tool-1', type: 'commandExecution', command: 'sleep 1', status: 'inProgress' },
});
const matchingA = reasoning('turn-matching', 'provider-a', 'A');
record(CodexThreadEventName.ITEM_COMPLETED, {
  turnId: 'turn-matching',
  item: { id: 'tool-1', type: 'commandExecution', command: 'sleep 1', status: 'completed', aggregatedOutput: 'done\n' },
});
const matchingB = reasoning('turn-matching', 'provider-b', 'B');
if (record(CodexThreadEventName.ITEM_REASONING_COMPLETED, {
  turnId: 'turn-matching', item: { id: 'provider-b', summary: [{ text: 'B' }] },
}).length !== 0) throw new Error('repeated completed snapshot was not idempotent');
if (ignoredDeltas('turn-matching').length !== 0) throw new Error('delta emitted during block');
record(CodexThreadEventName.ITEM_STARTED, {
  turnId: 'turn-matching',
  item: { id: 'tool-2', type: 'commandExecution', command: 'pwd', status: 'inProgress' },
});
const matchingC = reasoning('turn-matching', 'provider-c', 'C');
record(CodexThreadEventName.ITEM_COMPLETED, {
  turnId: 'turn-matching',
  item: { id: 'tool-2', type: 'commandExecution', command: 'pwd', status: 'completed', aggregatedOutput: `${dataDir}\n` },
});
record(CodexThreadEventName.TURN_COMPLETED, { turn: { id: 'turn-matching' } });
if (matchingB.payload.id !== matchingA.payload.id || matchingB.payload.delta !== '\n\nB') {
  throw new Error('matching result split A+B');
}
if (matchingC.payload.id === matchingA.payload.id) throw new Error('next tool did not create boundary');

// CR-CTB-003: terminal-only command fallback is ready and persists strictly.
record(CodexThreadEventName.TURN_STARTED, { turn: { id: 'turn-result-first' } });
const resultFirstBefore = reasoning('turn-result-first', 'provider-rf-a', 'before result-first');
const resultFirstEvents = record(CodexThreadEventName.ITEM_COMPLETED, {
  turnId: 'turn-result-first',
  item: { id: 'tool-result-first', type: 'commandExecution', command: 'echo inferred', status: 'completed', aggregatedOutput: 'inferred\n' },
});
const resultFirstTerminal = resultFirstEvents.find((event) => event.eventType === AgentRunEventType.TOOL_EXECUTION_SUCCEEDED);
if (resultFirstTerminal?.payload.arguments?.command !== 'echo inferred') {
  throw new Error(`result-first command arguments missing: ${JSON.stringify(resultFirstTerminal?.payload)}`);
}
const resultFirstAfter = reasoning('turn-result-first', 'provider-rf-b', 'after result-first');
record(CodexThreadEventName.TURN_COMPLETED, { turn: { id: 'turn-result-first' } });
if (resultFirstBefore.payload.id === resultFirstAfter.payload.id) throw new Error('result-first command did not split');

// AC13: unseen insufficient terminal observes/flushes, repeat preserves, readiness writes without relocation.
record(CodexThreadEventName.TURN_STARTED, { turn: { id: 'turn-insufficient' } });
const insufficientBefore = reasoning('turn-insufficient', 'provider-u-a', 'before insufficient terminal');
const insufficientPayload = {
  turnId: 'turn-insufficient',
  item: { id: 'web-search-insufficient', type: 'webSearch', status: 'completed', query: '', action: { type: 'other' } },
};
const insufficientEvents = record(CodexThreadEventName.ITEM_COMPLETED, insufficientPayload);
const insufficientTerminal = insufficientEvents.find((event) => event.eventType === AgentRunEventType.TOOL_EXECUTION_SUCCEEDED);
if (!insufficientTerminal || 'arguments' in insufficientTerminal.payload) throw new Error('insufficient terminal unexpectedly ready');
record(CodexThreadEventName.ITEM_COMPLETED, insufficientPayload);
const insufficientAfter = reasoning('turn-insufficient', 'provider-u-b', 'after insufficient terminal');
record(CodexThreadEventName.ITEM_COMPLETED, {
  turnId: 'turn-insufficient',
  item: {
    id: 'web-search-insufficient', type: 'webSearch', status: 'completed', query: 'AutoByteus',
    action: { type: 'search', query: 'AutoByteus', queries: ['AutoByteus'] },
  },
});
record(CodexThreadEventName.ITEM_STARTED, {
  turnId: 'turn-insufficient',
  item: { id: 'tool-after-insufficient', type: 'commandExecution', command: 'pwd', status: 'inProgress' },
});
const insufficientNext = reasoning('turn-insufficient', 'provider-u-c', 'after next boundary');
record(CodexThreadEventName.ITEM_COMPLETED, {
  turnId: 'turn-insufficient',
  item: { id: 'tool-after-insufficient', type: 'commandExecution', command: 'pwd', status: 'completed', aggregatedOutput: `${dataDir}\n` },
});
record(CodexThreadEventName.TURN_COMPLETED, { turn: { id: 'turn-insufficient' } });
if (insufficientBefore.payload.id === insufficientAfter.payload.id) throw new Error('insufficient terminal did not create live boundary');
if (insufficientAfter.payload.id === insufficientNext.payload.id) throw new Error('next card did not split after insufficient sequence');

// CR-CTB-004: explicit {} is ready; true absence remains observation-only and fabricates no rows.
record(CodexThreadEventName.TURN_STARTED, { turn: { id: 'turn-explicit-empty' } });
const emptyBefore = reasoning('turn-explicit-empty', 'provider-e-a', 'before explicit empty');
const emptyEvents = record(CodexThreadEventName.ITEM_COMPLETED, {
  turnId: 'turn-explicit-empty',
  item: { id: 'dynamic-empty', type: 'dynamicToolCall', name: 'no_arg_tool', arguments: {}, status: 'completed', result: { ok: true } },
});
const emptyTerminal = emptyEvents.find((event) => event.eventType === AgentRunEventType.TOOL_EXECUTION_SUCCEEDED);
if (!emptyTerminal || !('arguments' in emptyTerminal.payload) || Object.keys(emptyTerminal.payload.arguments).length !== 0) {
  throw new Error(`explicit empty arguments lost: ${JSON.stringify(emptyTerminal?.payload)}`);
}
const emptyAfter = reasoning('turn-explicit-empty', 'provider-e-b', 'after explicit empty');
record(CodexThreadEventName.TURN_COMPLETED, { turn: { id: 'turn-explicit-empty' } });
if (emptyBefore.payload.id === emptyAfter.payload.id) throw new Error('explicit empty result-first did not split');

record(CodexThreadEventName.TURN_STARTED, { turn: { id: 'turn-absent' } });
const absentBefore = reasoning('turn-absent', 'provider-d-a', 'before truly absent');
const absentEvents = record(CodexThreadEventName.ITEM_COMPLETED, {
  turnId: 'turn-absent',
  item: { id: 'dynamic-absent', type: 'dynamicToolCall', name: 'arguments_later_tool', status: 'completed', result: { ok: true } },
});
const absentTerminal = absentEvents.find((event) => event.eventType === AgentRunEventType.TOOL_EXECUTION_SUCCEEDED);
if (!absentTerminal || 'arguments' in absentTerminal.payload) throw new Error('truly absent terminal fabricated arguments');
const absentAfter = reasoning('turn-absent', 'provider-d-b', 'after truly absent');
record(CodexThreadEventName.TURN_COMPLETED, { turn: { id: 'turn-absent' } });
if (absentBefore.payload.id === absentAfter.payload.id) throw new Error('card-capable absent terminal did not split live state');

const rawPath = path.join(runDir, 'raw_traces_active.jsonl');
const rawRows = (await fs.readFile(rawPath, 'utf8')).trim().split('\n').map(JSON.parse);
const relevant = rawRows
  .filter((row) => ['reasoning', 'tool_call', 'tool_result'].includes(row.trace_type))
  .map((row) => ({ type: row.trace_type, content: row.content ?? '', toolCallId: row.tool_call_id ?? null }));
const expectedRelevant = [
  { type: 'tool_call', content: '', toolCallId: 'tool-1' },
  { type: 'tool_result', content: '', toolCallId: 'tool-1' },
  { type: 'reasoning', content: 'A\n\nB', toolCallId: null },
  { type: 'tool_call', content: '', toolCallId: 'tool-2' },
  { type: 'tool_result', content: '', toolCallId: 'tool-2' },
  { type: 'reasoning', content: 'C', toolCallId: null },
  { type: 'reasoning', content: 'before result-first', toolCallId: null },
  { type: 'tool_call', content: '', toolCallId: 'tool-result-first' },
  { type: 'tool_result', content: '', toolCallId: 'tool-result-first' },
  { type: 'reasoning', content: 'after result-first', toolCallId: null },
  { type: 'reasoning', content: 'before insufficient terminal', toolCallId: null },
  { type: 'tool_call', content: '', toolCallId: 'web-search-insufficient' },
  { type: 'tool_result', content: '', toolCallId: 'web-search-insufficient' },
  { type: 'reasoning', content: 'after insufficient terminal', toolCallId: null },
  { type: 'tool_call', content: '', toolCallId: 'tool-after-insufficient' },
  { type: 'tool_result', content: '', toolCallId: 'tool-after-insufficient' },
  { type: 'reasoning', content: 'after next boundary', toolCallId: null },
  { type: 'reasoning', content: 'before explicit empty', toolCallId: null },
  { type: 'tool_call', content: '', toolCallId: 'dynamic-empty' },
  { type: 'tool_result', content: '', toolCallId: 'dynamic-empty' },
  { type: 'reasoning', content: 'after explicit empty', toolCallId: null },
  { type: 'reasoning', content: 'before truly absent', toolCallId: null },
  { type: 'reasoning', content: 'after truly absent', toolCallId: null },
];
if (JSON.stringify(relevant) !== JSON.stringify(expectedRelevant)) {
  throw new Error(`unexpected packaged trace order: ${JSON.stringify(relevant)}`);
}
if (rawRows.some((row) => row.tool_call_id === 'dynamic-absent')) throw new Error('absent terminal fabricated physical rows');
if (JSON.stringify(rawRows).includes('PACKAGED_DELTA_MUST_NOT_APPEAR')) throw new Error('ignored delta persisted');

const response = await fetch(`${baseUrl}/graphql`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    query: `query($runId: String!) { getRunProjection(runId: $runId) { runId conversation activities } }`,
    variables: { runId },
  }),
});
if (!response.ok) throw new Error(`GraphQL HTTP ${response.status}`);
const body = await response.json();
if (body.errors?.length) throw new Error(JSON.stringify(body.errors));
const projection = body.data.getRunProjection;
const reasoningContents = projection.conversation.filter((row) => row.kind === 'reasoning').map((row) => row.content);
const expectedReasoning = [
  'A\n\nB', 'C', 'before result-first', 'after result-first',
  'before insufficient terminal', 'after insufficient terminal', 'after next boundary',
  'before explicit empty', 'after explicit empty', 'before truly absent', 'after truly absent',
];
if (
  reasoningContents.length !== expectedReasoning.length ||
  JSON.stringify([...reasoningContents].sort()) !== JSON.stringify([...expectedReasoning].sort())
) {
  throw new Error(`unexpected packaged projection reasoning set: ${JSON.stringify(reasoningContents)}`);
}
const indexOf = (predicate) => projection.conversation.findIndex(predicate);
const insufficientBeforeIndex = indexOf((row) => row.kind === 'reasoning' && row.content === 'before insufficient terminal');
const insufficientToolIndex = indexOf((row) => row.kind === 'tool_call' && row.invocationId === 'web-search-insufficient');
const insufficientAfterIndex = indexOf((row) => row.kind === 'reasoning' && row.content === 'after insufficient terminal');
if (!(insufficientBeforeIndex < insufficientToolIndex && insufficientToolIndex < insufficientAfterIndex)) {
  throw new Error(`AC13 projection order invalid: ${insufficientBeforeIndex}/${insufficientToolIndex}/${insufficientAfterIndex}`);
}
const resultFirstBeforeIndex = indexOf((row) => row.kind === 'reasoning' && row.content === 'before result-first');
const resultFirstToolIndex = indexOf((row) => row.kind === 'tool_call' && row.invocationId === 'tool-result-first');
const resultFirstAfterIndex = indexOf((row) => row.kind === 'reasoning' && row.content === 'after result-first');
if (!(resultFirstBeforeIndex < resultFirstToolIndex && resultFirstToolIndex < resultFirstAfterIndex)) {
  throw new Error(`result-first projection order invalid: ${resultFirstBeforeIndex}/${resultFirstToolIndex}/${resultFirstAfterIndex}`);
}
const explicitEmptyBeforeIndex = indexOf((row) => row.kind === 'reasoning' && row.content === 'before explicit empty');
const explicitEmptyToolIndex = indexOf((row) => row.kind === 'tool_call' && row.invocationId === 'dynamic-empty');
const explicitEmptyAfterIndex = indexOf((row) => row.kind === 'reasoning' && row.content === 'after explicit empty');
if (!(explicitEmptyBeforeIndex < explicitEmptyToolIndex && explicitEmptyToolIndex < explicitEmptyAfterIndex)) {
  throw new Error(`explicit-empty projection order invalid: ${explicitEmptyBeforeIndex}/${explicitEmptyToolIndex}/${explicitEmptyAfterIndex}`);
}
if (projection.conversation.some((row) => row.kind === 'tool_call' && row.invocationId === 'dynamic-absent')) {
  throw new Error('absent dynamic terminal projected a fabricated tool');
}
if (JSON.stringify(projection).includes('PACKAGED_DELTA_MUST_NOT_APPEAR')) throw new Error('ignored delta projected');

console.log(JSON.stringify({
  result: 'pass',
  runId,
  normalized: {
    matchingAId: matchingA.payload.id,
    matchingBId: matchingB.payload.id,
    nextId: matchingC.payload.id,
    resultFirstArguments: resultFirstTerminal.payload.arguments,
    insufficientBeforeId: insufficientBefore.payload.id,
    insufficientAfterId: insufficientAfter.payload.id,
    explicitEmptyHasArguments: 'arguments' in emptyTerminal.payload,
    absentHasArguments: 'arguments' in absentTerminal.payload,
  },
  rawRelevant: relevant,
  projectionReasoning: reasoningContents,
  ac13ProjectionIndexes: { insufficientBeforeIndex, insufficientToolIndex, insufficientAfterIndex },
}, null, 2));
