import { describe, it, expect } from 'vitest';
import { ToolOrigin } from '../../../src/tools/tool-origin.js';

describe('ToolOrigin', () => {
  it('exposes expected origin values', () => {
    expect(ToolOrigin.LOCAL).toBe('local');
    expect(ToolOrigin.MCP).toBe('mcp');
  });

  it('serializes to string values', () => {
    expect(String(ToolOrigin.LOCAL)).toBe('local');
  });
});
