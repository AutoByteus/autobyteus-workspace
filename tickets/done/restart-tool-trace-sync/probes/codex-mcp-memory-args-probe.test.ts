import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { RuntimeMemoryEventAccumulator } from '../../../autobyteus-server-ts/src/agent-memory/services/runtime-memory-event-accumulator.js';
import { RunMemoryWriter } from '../../../autobyteus-server-ts/src/agent-memory/store/run-memory-writer.js';
import { AgentRunEventType, type AgentRunEvent } from '../../../autobyteus-server-ts/src/agent-execution/domain/agent-run-event.js';
import { convertCodexItemEvent, type CodexItemEventConverterContext } from '../../../autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-converter.js';
import { CodexItemEventPayloadParser } from '../../../autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-payload-parser.js';
import { CodexThreadEventName } from '../../../autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-thread-event-name.js';
import { buildHistoricalReplayEvents } from '../../../autobyteus-server-ts/src/run-history/projection/transformers/raw-trace-to-historical-replay-events.js';
import { buildRunProjectionBundleFromEvents } from '../../../autobyteus-server-ts/src/run-history/projection/run-projection-utils.js';

const tempDirs = new Set<string>();

const createTempDir = async (): Promise<string> => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-mcp-memory-args-probe-'));
  tempDirs.add(dir);
  return dir;
};

const readJsonl = async (filePath: string): Promise<Record<string, unknown>[]> =>
  (await fs.readFile(filePath, 'utf8'))
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, unknown>);


const toDomainRawTrace = (trace: Record<string, unknown>): Record<string, unknown> => ({
  id: trace.id,
  ts: trace.ts,
  turnId: trace.turn_id,
  seq: trace.seq,
  traceType: trace.trace_type,
  content: trace.content,
  sourceEvent: trace.source_event,
  media: trace.media ?? null,
  toolName: trace.tool_name ?? null,
  toolCallId: trace.tool_call_id ?? null,
  toolArgs: trace.tool_args ?? null,
  toolResult: trace.tool_result,
  toolError: trace.tool_error ?? null,
});

const createConverterContext = (runId: string): CodexItemEventConverterContext => {
  const parser = new CodexItemEventPayloadParser();
  return {
    createEvent: (_codexEventName, eventType, payload) => ({
      eventType,
      runId,
      payload,
      statusHint: null,
    }),
    createSegmentContentEvent: () => null,
    clearReasoningSegmentForTurn: (payload) => parser.clearReasoningSegmentForTurn(payload),
    resolveItemType: (payload) => parser.resolveItemType(payload),
    isUserMessageItem: (itemType) => parser.isUserMessageItem(itemType),
    isReasoningItem: (itemType) => parser.isReasoningItem(itemType),
    isWebSearchItem: (itemType) => parser.isWebSearchItem(itemType),
    resolveWebSearchMetadata: (payload) => parser.resolveWebSearchMetadata(payload),
    resolveWebSearchArguments: (payload) => parser.resolveWebSearchArguments(payload),
    resolveWebSearchResult: (payload) => parser.resolveWebSearchResult(payload),
    resolveWebSearchError: (payload) => parser.resolveWebSearchError(payload),
    resolveTurnId: (payload) => parser.resolveTurnId(payload),
    resolveSegmentStartId: (payload, segmentType) => parser.resolveSegmentStartId(payload, segmentType),
    resolveSegmentType: (payload) => parser.resolveSegmentType(payload),
    resolveSegmentMetadata: (payload) => parser.resolveSegmentMetadata(payload),
    resolveReasoningSnapshot: (payload) => parser.resolveReasoningSnapshot(payload),
    resolveReasoningSegmentId: (payload) => parser.resolveReasoningSegmentId(payload),
    resolveSegmentId: (payload, fallback) => parser.resolveSegmentId(payload, fallback),
    resolveInvocationId: (payload) => parser.resolveInvocationId(payload),
    resolveToolName: (payload, fallback) => parser.resolveToolName(payload, fallback),
    resolveCommandValue: (payload) => parser.resolveCommandValue(payload),
    resolveToolArguments: (payload, fallback) => parser.resolveToolArguments(payload, fallback),
    resolveDynamicToolArguments: (payload) => parser.resolveDynamicToolArguments(payload),
    resolveLogEntry: (payload) => parser.resolveLogEntry(payload),
    isExecutionFailure: (payload) => parser.isExecutionFailure(payload),
    resolveToolError: (payload) => parser.resolveToolError(payload),
    resolveToolResult: (payload) => parser.resolveToolResult(payload),
    resolveToolDecisionReason: (payload) => parser.resolveToolDecisionReason(payload),
    resolveExecutionStatus: (payload) => parser.resolveExecutionStatus(payload),
  };
};

describe('probe: Codex MCP tool args live segment vs persisted memory', () => {
  afterEach(async () => {
    await Promise.all([...tempDirs].map((dir) => fs.rm(dir, { recursive: true, force: true })));
    tempDirs.clear();
  });

  it('shows current bug: item/started has metadata.arguments but memory writes {} after MCP completion', async () => {
    const runId = 'probe-run';
    const memoryDir = await createTempDir();
    const accumulator = new RuntimeMemoryEventAccumulator({
      runId,
      writer: new RunMemoryWriter({ memoryDir }),
    });
    const context = createConverterContext(runId);
    const args = {
      output_file_path: '/tmp/out.wav',
      prompt: 'hello from probe',
      generation_config: { voice_name: 'Sulafat' },
    };
    const startedPayload = {
      turnId: 'turn-probe',
      item: {
        id: 'call_probe_mcp',
        type: 'mcp_tool_call',
        server: 'autobyteus_image_audio',
        tool: 'generate_speech',
        arguments: args,
      },
    };
    const completedPayload = {
      turnId: 'turn-probe',
      invocation_id: 'call_probe_mcp',
      tool_name: 'generate_speech',
      item: {
        id: 'call_probe_mcp',
        type: 'mcp_tool_call',
        server: 'autobyteus_image_audio',
        tool: 'generate_speech',
        status: 'completed',
        output: JSON.stringify({ file_path: '/tmp/out.wav' }),
      },
    };

    const startedEvents = convertCodexItemEvent(
      context,
      CodexThreadEventName.ITEM_STARTED,
      startedPayload,
    );
    expect(startedEvents).toHaveLength(1);
    expect(startedEvents[0]?.eventType).toBe(AgentRunEventType.SEGMENT_START);
    expect((startedEvents[0]?.payload.metadata as Record<string, unknown>)?.arguments).toEqual(args);

    const completedEvents = convertCodexItemEvent(
      context,
      CodexThreadEventName.LOCAL_MCP_TOOL_EXECUTION_COMPLETED,
      completedPayload,
    );
    expect(completedEvents).toHaveLength(1);
    expect(completedEvents[0]?.eventType).toBe(AgentRunEventType.TOOL_EXECUTION_SUCCEEDED);
    expect(completedEvents[0]?.payload.arguments).toBeUndefined();

    [...startedEvents, ...completedEvents].forEach((event: AgentRunEvent) => {
      accumulator.recordRunEvent(event);
    });

    const rawTraces = await readJsonl(path.join(memoryDir, 'raw_traces.jsonl'));
    const toolCall = rawTraces.find((trace) => trace.trace_type === 'tool_call');
    const toolResult = rawTraces.find((trace) => trace.trace_type === 'tool_result');

    expect(toolCall?.tool_name).toBe('generate_speech');
    expect(toolCall?.tool_call_id).toBe('call_probe_mcp');
    // This documents the current broken persisted history behavior.
    expect(toolCall?.tool_args).toEqual({});
    expect(toolResult?.tool_args).toEqual({});

    const replayEvents = buildHistoricalReplayEvents(rawTraces.map(toDomainRawTrace) as any);
    const projection = buildRunProjectionBundleFromEvents(runId, replayEvents);
    const projectedConversationTool = projection.conversation.find(
      (entry) => entry.kind === 'tool_call' && entry.toolName === 'generate_speech',
    );
    const projectedActivityTool = projection.activities.find(
      (entry) => entry.toolName === 'generate_speech',
    );

    expect(projectedConversationTool?.toolArgs).toEqual({});
    expect(projectedActivityTool?.arguments).toEqual({});
    expect(JSON.stringify(projectedActivityTool?.result)).toContain('/tmp/out.wav');
  });
});
