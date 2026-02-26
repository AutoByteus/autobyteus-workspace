import { describe, it, expect } from 'vitest';
import { ToolCategory } from '../../../src/tools/tool-category.js';
import { ToolRegistry } from '../../../src/tools/registry/tool-registry.js';
import { ToolDefinition } from '../../../src/tools/registry/tool-definition.js';
import { ToolOrigin } from '../../../src/tools/tool-origin.js';
import { BaseTool } from '../../../src/tools/base-tool.js';

class DummyTool extends BaseTool {
  protected _execute(): Promise<any> {
    return Promise.resolve();
  }
  static getDescription() { return 'Dummy tool'; }
  static getArgumentSchema() { return null; }
}

describe('ToolCategory (integration)', () => {
  it('works as registry category input', () => {
    const registry = new ToolRegistry();
    registry.clear();

    const def = new ToolDefinition(
      'FileTool',
      'File tool',
      ToolOrigin.LOCAL,
      ToolCategory.FILE_SYSTEM,
      () => null,
      () => null,
      { toolClass: DummyTool }
    );

    registry.registerTool(def);
    const results = registry.getToolsByCategory(ToolCategory.FILE_SYSTEM);
    expect(results.length).toBe(1);
    expect(results[0].name).toBe('FileTool');
  });
});
