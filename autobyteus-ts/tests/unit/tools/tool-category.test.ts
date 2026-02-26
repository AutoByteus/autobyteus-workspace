import { describe, it, expect } from 'vitest';
import { ToolCategory } from '../../../src/tools/tool-category.js';

describe('ToolCategory', () => {
  it('exposes expected category values', () => {
    expect(ToolCategory.USER_INTERACTION).toBe('User Interaction');
    expect(ToolCategory.FILE_SYSTEM).toBe('File System');
    expect(ToolCategory.WEB).toBe('Web');
    expect(ToolCategory.SYSTEM).toBe('System');
    expect(ToolCategory.UTILITY).toBe('Utility');
    expect(ToolCategory.AGENT_COMMUNICATION).toBe('Agent Communication');
    expect(ToolCategory.PROMPT_MANAGEMENT).toBe('Prompt Management');
    expect(ToolCategory.TASK_MANAGEMENT).toBe('Task Management');
    expect(ToolCategory.GENERAL).toBe('General');
    expect(ToolCategory.MCP).toBe('MCP');
    expect(ToolCategory.MULTIMEDIA).toBe('Multimedia');
  });

  it('serializes to string values', () => {
    expect(String(ToolCategory.FILE_SYSTEM)).toBe('File System');
  });
});
