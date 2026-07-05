import { afterEach, describe, it, expect, vi } from 'vitest';
import { ToolResultContinuationBuilder } from '../../../../src/agent/loop/tool-result-continuation-builder.js';
import { ToolResultEvent } from '../../../../src/agent/events/agent-events.js';
import { ContextFile } from '../../../../src/agent/message/context-file.js';
import { ContextFileType } from '../../../../src/agent/message/context-file-type.js';
import { SenderType } from '../../../../src/agent/sender-type.js';
import {
  NATIVE_API_TOOL_CONTINUATION_MODE,
  TOOL_HISTORY_ONLY_CONTINUATION_MODE,
  TOOL_CONTINUATION_MODE_METADATA_KEY
} from '../../../../src/agent/message/tool-continuation-metadata.js';

const originalParser = process.env.AUTOBYTEUS_STREAM_PARSER;

afterEach(() => {
  if (originalParser === undefined) {
    delete process.env.AUTOBYTEUS_STREAM_PARSER;
  } else {
    process.env.AUTOBYTEUS_STREAM_PARSER = originalParser;
  }
});

describe('ToolResultContinuationBuilder', () => {
  it('persists text-parser tool results and marks continuation as renderer-owned tool history', () => {
    process.env.AUTOBYTEUS_STREAM_PARSER = 'xml';
    const builder = new ToolResultContinuationBuilder();
    const resultEvent = new ToolResultEvent('tool_a', { ok: true }, 'inv-1', undefined, { value: 1 }, 'turn-1', false);
    const ingestToolResults = vi.fn();

    const message = builder.build([resultEvent], {
      context: {
        agentId: 'agent-1',
        state: { memoryManager: { ingestToolResults } }
      } as any,
      turn: { turnId: 'turn-1' } as any
    });

    expect(ingestToolResults).toHaveBeenCalledWith([resultEvent], 'turn-1', {
      source: 'text_history_ordered_batch'
    });
    expect(message.senderType).toBe(SenderType.TOOL);
    expect(message.content).toBe('The tool_a tool call completed successfully.');
    expect(message.content).not.toContain('Tool history continuation');
    expect(message.content).not.toContain('Native API tool continuation');
    expect(message.content).not.toContain('XML tool-call text');
    expect(message.content).not.toContain('markdown triple backticks');
    expect(message.contextFiles).toBeNull();
    expect(message.metadata).toEqual({
      [TOOL_CONTINUATION_MODE_METADATA_KEY]: TOOL_HISTORY_ONLY_CONTINUATION_MODE,
      turn_id: 'turn-1',
      tool_result_count: 1
    });
  });

  it('persists native API tool results and marks continuation as tool-history-only', () => {
    process.env.AUTOBYTEUS_STREAM_PARSER = 'api_tool_call';
    const builder = new ToolResultContinuationBuilder();
    const resultEvent = new ToolResultEvent('tool_a', { ok: true }, 'inv-1', undefined, { value: 1 }, 'turn-1', false);
    const ingestToolResults = vi.fn();

    const message = builder.build([resultEvent], {
      context: {
        agentId: 'agent-1',
        state: { memoryManager: { ingestToolResults } }
      } as any,
      turn: { turnId: 'turn-1' } as any
    });

    expect(ingestToolResults).toHaveBeenCalledWith([resultEvent], 'turn-1', {
      source: 'native_api_ordered_batch'
    });
    expect(message.senderType).toBe(SenderType.TOOL);
    expect(message.content).toBe('The tool_a tool call completed successfully.');
    expect(message.content).not.toContain('Native API tool continuation');
    expect(message.content).not.toContain('Tool history continuation');
    expect(message.contextFiles).toBeNull();
    expect(message.metadata).toEqual({
      [TOOL_CONTINUATION_MODE_METADATA_KEY]: NATIVE_API_TOOL_CONTINUATION_MODE,
      turn_id: 'turn-1',
      tool_result_count: 1
    });
  });

  it('builds completed-tool wording for a successful read_media_file result', () => {
    process.env.AUTOBYTEUS_STREAM_PARSER = 'api_tool_call';
    const builder = new ToolResultContinuationBuilder();
    const resultEvent = new ToolResultEvent(
      'read_media_file',
      { uri: '/tmp/audio.mp3' },
      'inv-media',
      undefined,
      { file_path: '/tmp/audio.mp3' },
      'turn-1',
      false
    );

    const message = builder.build([resultEvent], {
      context: {
        agentId: 'agent-1',
        state: { memoryManager: { ingestToolResults: vi.fn() } }
      } as any,
      turn: { turnId: 'turn-1' } as any
    });

    expect(message.content).toBe('The read_media_file tool call completed successfully.');
    expect(message.content).not.toContain('Tool history continuation');
    expect(message.content).not.toContain('Native API tool continuation');
  });

  it('attaches context files returned by tools while preserving tool-history ingestion', () => {
    process.env.AUTOBYTEUS_STREAM_PARSER = 'xml';
    const builder = new ToolResultContinuationBuilder();
    const audioFile = new ContextFile('/tmp/sample.mp3', ContextFileType.AUDIO);
    const serializedVideoFile = {
      uri: '/tmp/clip.mp4',
      fileType: ContextFileType.VIDEO,
      fileName: 'clip.mp4',
      metadata: { source: 'read_media_file' }
    };
    const events = [
      new ToolResultEvent('read_media_file', audioFile, 'inv-audio', undefined, { file_path: 'sample.mp3' }, 'turn-1'),
      new ToolResultEvent('read_media_file', [serializedVideoFile], 'inv-video', undefined, { file_path: 'clip.mp4' }, 'turn-1')
    ];
    const ingestToolResults = vi.fn();

    const message = builder.build(events, {
      context: {
        agentId: 'agent-1',
        state: { memoryManager: { ingestToolResults } }
      } as any,
      turn: { turnId: 'turn-1' } as any
    });

    expect(ingestToolResults).toHaveBeenCalledWith(events, 'turn-1', {
      source: 'text_history_ordered_batch'
    });
    expect(message.senderType).toBe(SenderType.TOOL);
    expect(message.content).toContain('The following tool calls completed successfully: read_media_file, read_media_file.');
    expect(message.content).not.toContain('Tool history continuation');
    expect(message.content).not.toContain('XML tool-call text');
    expect(message.content).not.toContain('markdown triple backticks');
    expect(message.contextFiles).toHaveLength(2);
    expect(message.contextFiles?.map((file) => file.uri)).toEqual(['/tmp/sample.mp3', '/tmp/clip.mp4']);
    expect(message.contextFiles?.map((file) => file.fileType)).toEqual([
      ContextFileType.AUDIO,
      ContextFileType.VIDEO
    ]);
    expect(message.metadata).toEqual({
      [TOOL_CONTINUATION_MODE_METADATA_KEY]: TOOL_HISTORY_ONLY_CONTINUATION_MODE,
      turn_id: 'turn-1',
      tool_result_count: 2
    });
  });
});
