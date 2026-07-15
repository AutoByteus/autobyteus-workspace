import { describe, expect, it } from 'vitest';
import { buildToolContinuationDisplayText } from '../../../../src/agent/message/tool-continuation-display-text.js';

describe('buildToolContinuationDisplayText', () => {
  it('builds minimal single-tool success text', () => {
    expect(buildToolContinuationDisplayText([
      { toolName: 'read_media_file' }
    ])).toBe('The read_media_file tool call completed successfully.');
  });

  it('builds concise multi-tool success text without internal continuation markers', () => {
    const text = buildToolContinuationDisplayText([
      { toolName: 'read_media_file' },
      { toolName: 'write_file' }
    ]);

    expect(text).toBe('The following tool calls completed successfully: read_media_file, write_file.');
    expect(text).not.toContain('Tool history continuation');
    expect(text).not.toContain('Native API tool continuation');
  });

  it('does not add XML formatting guidance to continuation text', () => {
    const text = buildToolContinuationDisplayText([{ toolName: 'read_media_file' }]);

    expect(text).toBe('The read_media_file tool call completed successfully.');
    expect(text).not.toContain('XML tool-call text');
    expect(text).not.toContain('markdown triple backticks');
    expect(text).not.toContain('```xml');
  });
});
