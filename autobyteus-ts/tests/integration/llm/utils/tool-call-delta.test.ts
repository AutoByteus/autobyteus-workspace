import { describe, it, expect } from 'vitest';
import { ToolCallDeltaSchema } from '../../../../src/llm/utils/tool-call-delta.js';

describe('ToolCallDelta (integration)', () => {
  it('accepts minimal delta', () => {
    const data = { index: 0 };
    const result = ToolCallDeltaSchema.safeParse(data);
    expect(result.success).toBe(true);
  });
});
