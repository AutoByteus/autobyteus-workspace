import { describe, it, expect, beforeEach } from 'vitest';
import { registerToolClass } from '../../../src/tools/tool-meta.js';
import { defaultToolRegistry, ToolRegistry } from '../../../src/tools/registry/tool-registry.js';
import { ToolDefinition } from '../../../src/tools/registry/tool-definition.js';
import { BaseTool } from '../../../src/tools/base-tool.js';
import { ToolCategory } from '../../../src/tools/tool-category.js';

class DummyTool extends BaseTool {
  protected _execute(): Promise<any> {
    return Promise.resolve('ok');
  }
  static getDescription() { return 'Dummy tool'; }
  static getArgumentSchema() { return null; }
}

class CategoryTool extends BaseTool {
  static CATEGORY = ToolCategory.WEB;
  protected _execute(): Promise<any> {
    return Promise.resolve('ok');
  }
  static getDescription() { return 'Category tool'; }
  static getArgumentSchema() { return null; }
}

class BadTool extends BaseTool {
  protected _execute(): Promise<any> {
    return Promise.resolve('ok');
  }
  static getDescription() { return ''; }
  static getArgumentSchema() { return null; }
}

describe('registerToolClass', () => {
  beforeEach(() => {
    defaultToolRegistry.clear();
  });

  it('registers a valid tool class', () => {
    expect(registerToolClass(DummyTool)).toBe(true);
    const def = defaultToolRegistry.getToolDefinition('DummyTool');
    expect(def).toBeInstanceOf(ToolDefinition);
    expect(def?.description).toBe('Dummy tool');
  });

  it('uses category from class when provided', () => {
    expect(registerToolClass(CategoryTool)).toBe(true);
    const def = defaultToolRegistry.getToolDefinition('CategoryTool');
    expect(def?.category).toBe(ToolCategory.WEB);
  });

  it('skips tools with invalid description', () => {
    expect(registerToolClass(BadTool)).toBe(false);
    expect(defaultToolRegistry.getToolDefinition('BadTool')).toBeUndefined();
  });

  it('skips base tool classes', () => {
    expect(registerToolClass(BaseTool as any)).toBe(false);
  });
});
