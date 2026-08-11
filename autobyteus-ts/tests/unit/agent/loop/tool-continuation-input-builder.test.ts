import { describe, expect, it } from 'vitest';
import { ToolContinuationInputBuilder } from '../../../../src/agent/loop/tool-continuation-input-builder.js';
import { ToolResultEvent } from '../../../../src/agent/events/agent-events.js';
import { ContextFile } from '../../../../src/agent/message/context-file.js';
import { ContextFileType } from '../../../../src/agent/message/context-file-type.js';
import { SenderType } from '../../../../src/agent/sender-type.js';

describe('ToolContinuationInputBuilder', () => {
  it('projects ordered processed results into a factual same-turn input without persistence or mode metadata', () => {
    const events = [
      new ToolResultEvent('tool_a', { first: true }, 'inv-1', undefined, { value: 1 }, 'turn-1', false),
      new ToolResultEvent('tool_b', { second: true }, 'inv-2', undefined, { value: 2 }, 'turn-1', false),
    ];

    const message = new ToolContinuationInputBuilder().build(events, 'turn-1');

    expect(message.senderType).toBe(SenderType.TOOL);
    expect(message.content).toBe('The following tool calls completed successfully: tool_a, tool_b.');
    expect(message.contextFiles).toBeNull();
    expect(message.metadata).toEqual({
      turn_id: 'turn-1',
      tool_result_count: 2,
    });
  });

  it('uses the explicit normalized active turn identity even when result events omit turn ids', () => {
    const event = new ToolResultEvent('tool_a', { ok: true }, 'inv-1');

    const message = new ToolContinuationInputBuilder().build([event], '  turn-active  ');

    expect(message.metadata).toEqual({
      turn_id: 'turn-active',
      tool_result_count: 1,
    });
    expect(() => new ToolContinuationInputBuilder().build([event], '  ')).toThrow(
      'ToolContinuationInputBuilder requires a non-empty turnId.',
    );
  });

  it('builds semantic completed-tool wording without a coordination label', () => {
    const resultEvent = new ToolResultEvent(
      'read_media_file',
      { uri: '/tmp/audio.mp3' },
      'inv-media',
      undefined,
      { file_path: '/tmp/audio.mp3' },
      'turn-1',
      false,
    );

    const message = new ToolContinuationInputBuilder().build([resultEvent], 'turn-1');

    expect(message.content).toBe('The read_media_file tool call completed successfully.');
    expect(message.content).not.toContain('Tool history continuation');
    expect(message.content).not.toContain('Native API tool continuation');
  });

  it('recursively carries ContextFile values and supported serialized shapes', () => {
    const audioFile = new ContextFile('/tmp/sample.mp3', ContextFileType.AUDIO);
    const serializedVideoFile = {
      uri: '/tmp/clip.mp4',
      fileType: ContextFileType.VIDEO,
      fileName: 'clip.mp4',
      metadata: { source: 'read_media_file' },
    };
    const events = [
      new ToolResultEvent(
        'read_media_file',
        audioFile,
        'inv-audio',
        undefined,
        { file_path: 'sample.mp3' },
        'turn-1',
      ),
      new ToolResultEvent(
        'read_media_file',
        [[serializedVideoFile]],
        'inv-video',
        undefined,
        { file_path: 'clip.mp4' },
        'turn-1',
      ),
    ];

    const message = new ToolContinuationInputBuilder().build(events, 'turn-1');

    expect(message.contextFiles?.map((file) => file.uri)).toEqual([
      '/tmp/sample.mp3',
      '/tmp/clip.mp4',
    ]);
    expect(message.contextFiles?.map((file) => file.fileType)).toEqual([
      ContextFileType.AUDIO,
      ContextFileType.VIDEO,
    ]);
    expect(message.metadata).toEqual({
      turn_id: 'turn-1',
      tool_result_count: 2,
    });
  });
});
