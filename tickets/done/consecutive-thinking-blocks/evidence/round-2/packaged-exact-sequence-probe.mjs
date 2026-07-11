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
const runId = 'packaged-ctb-r4-exact-sequence';
const runDir = path.join(memoryRoot, 'agents', runId);
await new AgentRunMetadataStore(memoryRoot).writeMetadata(runId, {
  runId,
  agentDefinitionId: 'agent-packaged-ctb-r4',
  workspaceRootPath: dataDir,
  memoryDir: runDir,
  llmModelIdentifier: 'gpt-5.6-sol',
  llmConfig: { reasoning_effort: 'max' },
  autoExecuteTools: false,
  skillAccessMode: 'PRELOADED_ONLY',
  runtimeKind: 'codex_app_server',
  platformAgentRunId: 'packaged-thread-ctb-r4',
});

const accumulator = new RuntimeMemoryEventAccumulator({
  runId,
  writer: new RunMemoryWriter({ memoryDir: runDir }),
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

record(CodexThreadEventName.TURN_STARTED, { turn: { id: 'turn-packaged' } });
if (ignoredDeltas('turn-packaged').length !== 0) throw new Error('delta emitted before active block');
record(CodexThreadEventName.ITEM_STARTED, {
  turnId: 'turn-packaged',
  item: { id: 'tool-1', type: 'commandExecution', command: 'sleep 1', status: 'inProgress' },
});
const a = reasoning('turn-packaged', 'provider-a', 'A');
if (ignoredDeltas('turn-packaged').length !== 0) throw new Error('delta emitted during active block');
record(CodexThreadEventName.ITEM_COMPLETED, {
  turnId: 'turn-packaged',
  item: { id: 'tool-1', type: 'commandExecution', command: 'sleep 1', status: 'completed', aggregatedOutput: 'done\n' },
});
const b = reasoning('turn-packaged', 'provider-b', 'B');
const repeated = record(CodexThreadEventName.ITEM_REASONING_COMPLETED, {
  turnId: 'turn-packaged',
  item: { id: 'provider-b', summary: [{ text: 'B' }] },
});
if (repeated.length !== 0) throw new Error('repeated completed snapshot was not idempotent');
if (ignoredDeltas('turn-packaged').length !== 0) throw new Error('delta emitted after active block');
record(CodexThreadEventName.ITEM_STARTED, {
  turnId: 'turn-packaged',
  item: { id: 'tool-2', type: 'commandExecution', command: 'pwd', status: 'inProgress' },
});
const c = reasoning('turn-packaged', 'provider-c', 'C');
record(CodexThreadEventName.ITEM_COMPLETED, {
  turnId: 'turn-packaged',
  item: { id: 'tool-2', type: 'commandExecution', command: 'pwd', status: 'completed', aggregatedOutput: `${dataDir}\n` },
});
record(CodexThreadEventName.TURN_COMPLETED, { turn: { id: 'turn-packaged' } });

if (b.payload.id !== a.payload.id || b.payload.delta !== '\n\nB') {
  throw new Error('matching result split the A+B normalized block');
}
if (c.payload.id === a.payload.id) throw new Error('next tool start did not create a new block boundary');

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
];
if (JSON.stringify(relevant) !== JSON.stringify(expectedRelevant)) {
  throw new Error(`unexpected packaged trace order: ${JSON.stringify(relevant)}`);
}
if (JSON.stringify(rawRows).includes('PACKAGED_DELTA_MUST_NOT_APPEAR')) {
  throw new Error('ignored delta content persisted');
}

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
const reasoningContents = projection.conversation
  .filter((row) => row.kind === 'reasoning')
  .map((row) => row.content);
if (JSON.stringify(reasoningContents) !== JSON.stringify(['A\n\nB', 'C'])) {
  throw new Error(`unexpected packaged projection reasoning: ${JSON.stringify(reasoningContents)}`);
}
if (JSON.stringify(projection).includes('PACKAGED_DELTA_MUST_NOT_APPEAR')) {
  throw new Error('ignored delta content projected');
}

console.log(JSON.stringify({
  result: 'pass',
  runId,
  normalized: {
    firstId: a.payload.id,
    matchingId: b.payload.id,
    nextBlockId: c.payload.id,
    matchingDelta: b.payload.delta,
  },
  rawRelevant: relevant,
  projectionReasoning: reasoningContents,
  projectionKinds: projection.conversation.map((row) => row.kind),
}, null, 2));
