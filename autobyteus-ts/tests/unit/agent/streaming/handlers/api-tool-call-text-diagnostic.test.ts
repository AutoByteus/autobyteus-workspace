import { describe, expect, it } from 'vitest';
import { detectApiToolCallTextLeak } from '../../../../../src/agent/streaming/handlers/api-tool-call-text-diagnostic.js';

describe('detectApiToolCallTextLeak', () => {
  it('detects [TOOL_CALL] text only when no native tool call was parsed', () => {
    const diagnostic = detectApiToolCallTextLeak('[TOOL_CALL] run_bash {"command":"pwd"}', 0);

    expect(diagnostic?.code).toBe('api_tool_call_text_leak');
    expect(diagnostic?.message).toContain('no tool was executed');
    expect(diagnostic?.snippet).toContain('[TOOL_CALL] run_bash');
    expect(detectApiToolCallTextLeak('[TOOL_CALL] run_bash {"command":"pwd"}', 1)).toBeNull();
  });

  it('ignores normal assistant text', () => {
    expect(detectApiToolCallTextLeak('I can help with that.', 0)).toBeNull();
  });
});
