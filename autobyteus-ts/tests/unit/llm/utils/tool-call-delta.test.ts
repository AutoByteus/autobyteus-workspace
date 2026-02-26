import { describe, it, expect } from 'vitest';
import { ToolCallDeltaSchema } from '../../../../src/llm/utils/tool-call-delta.js';

describe('ToolCallDelta', () => {
  it('should validate valid delta', () => {
    const data = {
      index: 0,
      call_id: 'call_123',
      name: 'get_weather',
      arguments_delta: '{"loc'
    };
    const result = ToolCallDeltaSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should allow nullable fields', () => {
    const data = {
      index: 1,
      // others missing or null
    };
    const result = ToolCallDeltaSchema.safeParse(data);
    expect(result.success).toBe(true);
  });
});
