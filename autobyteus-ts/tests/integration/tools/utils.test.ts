import { describe, it, expect } from 'vitest';
import { formatToolUsageInfo } from '../../../src/tools/utils.js';
import { ToolDefinition } from '../../../src/tools/registry/tool-definition.js';
import { ToolOrigin } from '../../../src/tools/tool-origin.js';
import { ToolRegistry } from '../../../src/tools/registry/tool-registry.js';
import { BaseTool } from '../../../src/tools/base-tool.js';

class EchoTool extends BaseTool {
  protected _execute(_context: any, kwargs: Record<string, any> = {}): Promise<any> {
    return Promise.resolve(kwargs.text ?? '');
  }
  static getDescription() { return 'Echo tool'; }
  static getArgumentSchema() { return null; }
}

describe('formatToolUsageInfo (integration)', () => {
  it('formats usage strings for registered tools', async () => {
    const registry = new ToolRegistry();
    registry.clear();

    const def = new ToolDefinition(
      'EchoTool',
      'Echo tool',
      ToolOrigin.LOCAL,
      'general',
      () => null,
      () => null,
      { toolClass: EchoTool }
    );
    registry.registerTool(def);

    const tool = registry.createTool('EchoTool');
    const usage = formatToolUsageInfo([tool]);

    expect(usage).toContain('1 <tool name="EchoTool"');
  });
});
