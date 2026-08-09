import { describe, expect, it, vi } from 'vitest';
import { ToolResultContinuationBuilder } from '../../../../src/agent/loop/tool-result-continuation-builder.js';
import { ToolResultEvent } from '../../../../src/agent/events/agent-events.js';
import { ContextFile } from '../../../../src/agent/message/context-file.js';
import { ContextFileType } from '../../../../src/agent/message/context-file-type.js';
import { SenderType } from '../../../../src/agent/sender-type.js';
import {
  NATIVE_API_TOOL_CONTINUATION_MODE,
  TOOL_CONTINUATION_MODE_METADATA_KEY
} from '../../../../src/agent/message/tool-continuation-metadata.js';

const makeContext = (ingestToolResults: ReturnType<typeof vi.fn>) => ({
  agentId: 'agent-1',
  state: { memoryManager: { ingestToolResults } }
}) as any;

describe('ToolResultContinuationBuilder native ordered continuation', () => {
  it('ingests the active result batch once in order and creates native continuation metadata', () => {
    const builder = new ToolResultContinuationBuilder();
    const events = [
      new ToolResultEvent('tool_a', { first: true }, 'inv-1', undefined, { value: 1 }, 'turn-1', false),
      new ToolResultEvent('tool_b', { second: true }, 'inv-2', undefined, { value: 2 }, 'turn-1', false)
    ];
    const ingestToolResults = vi.fn();

    const message = builder.build(events, {
      context: makeContext(ingestToolResults),
      turn: { turnId: 'turn-1' } as any
    });

    expect(ingestToolResults).toHaveBeenCalledOnce();
    expect(ingestToolResults).toHaveBeenCalledWith(events, 'turn-1', {
      source: 'native_api_ordered_batch'
    });
    expect(message.senderType).toBe(SenderType.TOOL);
    expect(message.content).toBe('The following tool calls completed successfully: tool_a, tool_b.');
    expect(message.contextFiles).toBeNull();
    expect(message.metadata).toEqual({
      [TOOL_CONTINUATION_MODE_METADATA_KEY]: NATIVE_API_TOOL_CONTINUATION_MODE,
      turn_id: 'turn-1',
      tool_result_count: 2
    });
  });

  it('uses the active turn identity when result events omit turn ids', () => {
    const ingestToolResults = vi.fn();
    const event = new ToolResultEvent('tool_a', { ok: true }, 'inv-1');

    const message = new ToolResultContinuationBuilder().build([event], {
      context: makeContext(ingestToolResults),
      turn: { turnId: 'turn-active' } as any
    });

    expect(ingestToolResults).toHaveBeenCalledWith([event], 'turn-active', {
      source: 'native_api_ordered_batch'
    });
    expect(message.metadata?.turn_id).toBe('turn-active');
  });

  it('builds completed-tool wording for a successful read_media_file result', () => {
    const resultEvent = new ToolResultEvent(
      'read_media_file',
      { uri: '/tmp/audio.mp3' },
      'inv-media',
      undefined,
      { file_path: '/tmp/audio.mp3' },
      'turn-1',
      false
    );

    const message = new ToolResultContinuationBuilder().build([resultEvent], {
      context: makeContext(vi.fn()),
      turn: { turnId: 'turn-1' } as any
    });

    expect(message.content).toBe('The read_media_file tool call completed successfully.');
    expect(message.content).not.toContain('Tool history continuation');
    expect(message.content).not.toContain('Native API tool continuation');
  });

  it('attaches context files while preserving exactly-once native batch ingestion', () => {
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

    const message = new ToolResultContinuationBuilder().build(events, {
      context: makeContext(ingestToolResults),
      turn: { turnId: 'turn-1' } as any
    });

    expect(ingestToolResults).toHaveBeenCalledOnce();
    expect(ingestToolResults).toHaveBeenCalledWith(events, 'turn-1', {
      source: 'native_api_ordered_batch'
    });
    expect(message.contextFiles?.map((file) => file.uri)).toEqual(['/tmp/sample.mp3', '/tmp/clip.mp4']);
    expect(message.contextFiles?.map((file) => file.fileType)).toEqual([
      ContextFileType.AUDIO,
      ContextFileType.VIDEO
    ]);
    expect(message.metadata).toEqual({
      [TOOL_CONTINUATION_MODE_METADATA_KEY]: NATIVE_API_TOOL_CONTINUATION_MODE,
      turn_id: 'turn-1',
      tool_result_count: 2
    });
  });
});
