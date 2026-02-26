import { describe, it, expect } from 'vitest';
import { ToolRegistry } from '../../../../src/tools/registry/tool-registry.js';
import { ToolDefinition } from '../../../../src/tools/registry/tool-definition.js';
import { BaseTool } from '../../../../src/tools/base-tool.js';
import { ToolOrigin } from '../../../../src/tools/tool-origin.js';

class EchoTool extends BaseTool {
  protected _execute(_context: any, kwargs: any): Promise<any> {
    return Promise.resolve(kwargs?.text ?? '');
  }
  static getDescription() { return 'Echo tool'; }
  static getArgumentSchema() { return null; }
}

describe('ToolRegistry (integration)', () => {
  it('creates tools and groups by category', async () => {
    const registry = new ToolRegistry();
    registry.clear();

    const defA = new ToolDefinition(
      'EchoA',
      'Echo A',
      ToolOrigin.LOCAL,
      'utilities',
      () => null,
      () => null,
      { toolClass: EchoTool }
    );
    const defB = new ToolDefinition(
      'EchoB',
      'Echo B',
      ToolOrigin.LOCAL,
      'utilities',
      () => null,
      () => null,
      { toolClass: EchoTool }
    );
    const defC = new ToolDefinition(
      'EchoC',
      'Echo C',
      ToolOrigin.LOCAL,
      'misc',
      () => null,
      () => null,
      { toolClass: EchoTool }
    );

    registry.registerTool(defA);
    registry.registerTool(defB);
    registry.registerTool(defC);

    const grouped = registry.getToolsGroupedByCategory();
    expect(Object.keys(grouped)).toEqual(['misc', 'utilities']);

    const instance = registry.createTool('EchoA');
    expect(await instance.execute({ agentId: 'agent' }, { text: 'hello' })).toBe('hello');
  });
});
