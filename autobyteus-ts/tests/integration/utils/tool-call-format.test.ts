import { describe, it, expect } from 'vitest';
import { resolveToolCallFormat } from '../../../src/utils/tool-call-format.js';

describe('tool_call_format (integration)', () => {
  it('defaults to api_tool_call for unsupported parser setting', () => {
    process.env.AUTOBYTEUS_STREAM_PARSER = 'native';
    expect(resolveToolCallFormat()).toBe('api_tool_call');
  });

  it('accepts api_tool_call explicitly', () => {
    process.env.AUTOBYTEUS_STREAM_PARSER = 'api_tool_call';
    expect(resolveToolCallFormat()).toBe('api_tool_call');
  });
});
