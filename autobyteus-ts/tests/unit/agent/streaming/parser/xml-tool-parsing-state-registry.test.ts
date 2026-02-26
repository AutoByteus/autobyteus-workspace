import { describe, it, expect } from 'vitest';
import { XmlToolParsingStateRegistry } from '../../../../../src/agent/streaming/parser/xml-tool-parsing-state-registry.js';
import { BaseState } from '../../../../../src/agent/streaming/parser/states/base-state.js';
import { TOOL_NAME_WRITE_FILE, TOOL_NAME_EDIT_FILE, TOOL_NAME_RUN_BASH } from '../../../../../src/agent/streaming/parser/tool-constants.js';

class MockState extends BaseState {
  run(): void {
    return;
  }
  finalize(): void {
    return;
  }
}

describe('XmlToolParsingStateRegistry', () => {
  it('returns singleton instance', () => {
    const reg1 = new XmlToolParsingStateRegistry();
    const reg2 = new XmlToolParsingStateRegistry();
    expect(reg1).toBe(reg2);
  });

  it('registers core defaults', () => {
    const registry = new XmlToolParsingStateRegistry();
    expect(registry.getStateForTool(TOOL_NAME_WRITE_FILE)).toBeDefined();
    expect(registry.getStateForTool(TOOL_NAME_EDIT_FILE)).toBeDefined();
    expect(registry.getStateForTool(TOOL_NAME_RUN_BASH)).toBeDefined();
  });

  it('registers custom state', () => {
    const registry = new XmlToolParsingStateRegistry();
    registry.registerToolState('custom_tool', MockState);
    expect(registry.getStateForTool('custom_tool')).toBe(MockState);
  });

  it('is case sensitive for tool names', () => {
    const registry = new XmlToolParsingStateRegistry();
    registry.registerToolState('MyTool', MockState);
    expect(registry.getStateForTool('MyTool')).toBe(MockState);
    expect(registry.getStateForTool('mytool')).toBeUndefined();
  });
});
