import { describe, it, expect } from 'vitest';
import {
  BaseTool,
  tool,
  ParameterSchema,
  ParameterDefinition,
  ParameterType,
  ToolConfig,
  ToolOrigin,
  ToolCategory,
  registerTools,
  Search,
  ReadMediaFile,
  DownloadMediaTool,
  ReadUrl
} from '../../../src/tools/index.js';

describe('tools index exports', () => {
  it('exposes core tool framework types', () => {
    expect(typeof BaseTool).toBe('function');
    expect(typeof tool).toBe('function');
    expect(typeof ParameterSchema).toBe('function');
    expect(typeof ParameterDefinition).toBe('function');
    expect(ParameterType.STRING).toBeDefined();
    expect(typeof ToolConfig).toBe('function');
    expect(typeof ToolOrigin).toBe('object');
    expect(typeof ToolCategory).toBe('object');
    expect(typeof registerTools).toBe('function');
  });

  it('exposes class-based tools', () => {
    expect(typeof Search).toBe('function');
    expect(typeof ReadMediaFile).toBe('function');
    expect(typeof DownloadMediaTool).toBe('function');
    expect(typeof ReadUrl).toBe('function');
  });
});
