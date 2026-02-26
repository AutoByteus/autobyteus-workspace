import { describe, it, expect } from 'vitest';
import { ToolOrigin } from '../../../src/tools/tool-origin.js';
import { ToolRegistry } from '../../../src/tools/registry/tool-registry.js';
import { ToolDefinition } from '../../../src/tools/registry/tool-definition.js';
import { BaseTool } from '../../../src/tools/base-tool.js';

class DummyTool extends BaseTool {
  protected _execute(): Promise<any> {
    return Promise.resolve();
  }
  static getDescription() { return 'Dummy tool'; }
  static getArgumentSchema() { return null; }
}

describe('ToolOrigin (integration)', () => {
  it('filters tools by MCP origin', () => {
    const registry = new ToolRegistry();
    registry.clear();

    const mcpTool = new ToolDefinition(
      'McpTool',
      'MCP tool',
      ToolOrigin.MCP,
      'general',
      () => null,
      () => null,
      { toolClass: DummyTool, metadata: { mcp_server_id: 'server-1' } }
    );
    const localTool = new ToolDefinition(
      'LocalTool',
      'Local tool',
      ToolOrigin.LOCAL,
      'general',
      () => null,
      () => null,
      { toolClass: DummyTool }
    );

    registry.registerTool(mcpTool);
    registry.registerTool(localTool);

    const result = registry.getToolsByMcpServer('server-1');
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('McpTool');
  });
});
