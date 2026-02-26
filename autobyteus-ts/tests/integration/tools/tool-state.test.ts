import { describe, it, expect } from 'vitest';
import { BaseTool } from '../../../src/tools/base-tool.js';
import { ToolState } from '../../../src/tools/tool-state.js';

class CounterTool extends BaseTool {
  protected _execute(_context: any, kwargs: Record<string, any> = {}): Promise<any> {
    const delta = typeof kwargs.delta === 'number' ? kwargs.delta : 0;
    const current = this.toolState.get('count', 0);
    const next = current + delta;
    this.toolState.set('count', next);
    return Promise.resolve(next);
  }
  static getDescription() { return 'Counter tool'; }
  static getArgumentSchema() { return null; }
}

describe('ToolState (integration)', () => {
  it('persists state across tool executions', async () => {
    const tool = new CounterTool();
    expect(tool.toolState).toBeInstanceOf(ToolState);

    expect(await tool.execute({ agentId: 'agent-1' }, { delta: 2 })).toBe(2);
    expect(await tool.execute({ agentId: 'agent-1' }, { delta: 3 })).toBe(5);
    expect(tool.toolState.get('count')).toBe(5);
  });
});
