import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ToolManifestInjectorProcessor } from '../../../../src/agent/system-prompt-processor/tool-manifest-injector-processor.js';
import { defaultToolRegistry } from '../../../../src/tools/registry/tool-registry.js';
import { ToolManifestProvider } from '../../../../src/tools/usage/providers/tool-manifest-provider.js';
import { LLMProvider } from '../../../../src/llm/providers.js';

const makeContext = (provider: LLMProvider) => ({
  agentId: 'test_agent_123',
  llmInstance: { model: { provider } }
});

describe('ToolManifestInjectorProcessor', () => {
  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns correct name', () => {
    const processor = new ToolManifestInjectorProcessor();
    expect(processor.getName()).toBe('ToolManifestInjector');
  });

  it('is mandatory', () => {
    const processor = new ToolManifestInjectorProcessor();
    expect(processor.isMandatory()).toBe(true);
  });

  it('returns prompt unchanged when no tools are provided', () => {
    const processor = new ToolManifestInjectorProcessor();
    const prompt = 'You are a helpful assistant.';

    const result = processor.process(prompt, {}, 'test_agent', makeContext(LLMProvider.OPENAI));

    expect(result).toBe(prompt);
    expect(console.info).toHaveBeenCalledWith(expect.stringContaining('No tools configured'));
  });

  it('appends tools section when manifest provider succeeds', () => {
    const processor = new ToolManifestInjectorProcessor();
    const prompt = 'You are a helpful assistant.';
    const toolDef = { name: 'MockTool' };

    const registrySpy = vi.spyOn(defaultToolRegistry, 'getToolDefinition').mockReturnValue(toolDef as any);
    const provideSpy = vi.spyOn(ToolManifestProvider.prototype, 'provide').mockReturnValue('---MOCK TOOL MANIFEST---');

    const result = processor.process(prompt, { AlphaTool: {} as any }, 'test_agent', makeContext(LLMProvider.ANTHROPIC));

    expect(provideSpy).toHaveBeenCalledOnce();
    expect(result.startsWith(prompt)).toBe(true);
    expect(result).toContain('## Accessible Tools');
    expect(result).toContain('---MOCK TOOL MANIFEST---');

    registrySpy.mockRestore();
    provideSpy.mockRestore();
  });

  it('returns prompt unchanged when tool definitions are not found', () => {
    const processor = new ToolManifestInjectorProcessor();
    const prompt = 'You are a helpful assistant.';

    const registrySpy = vi.spyOn(defaultToolRegistry, 'getToolDefinition').mockReturnValue(undefined);

    const result = processor.process(prompt, { UnknownTool: {} as any }, 'test_agent', makeContext(LLMProvider.OPENAI));

    expect(result).toBe(prompt);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('no definitions found in registry'));

    registrySpy.mockRestore();
  });

  it('returns prompt unchanged when manifest provider fails', () => {
    const processor = new ToolManifestInjectorProcessor();
    const prompt = 'You are a helpful assistant.';
    const toolDef = { name: 'MockTool' };

    vi.spyOn(defaultToolRegistry, 'getToolDefinition').mockReturnValue(toolDef as any);
    vi.spyOn(ToolManifestProvider.prototype, 'provide').mockImplementation(() => {
      throw new Error('Manifest Generation Failed');
    });

    const result = processor.process(prompt, { AlphaTool: {} as any }, 'test_agent', makeContext(LLMProvider.ANTHROPIC));

    expect(result).toBe(prompt);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Failed to generate tool manifest'));
  });

  it('logs injected tool count', () => {
    const processor = new ToolManifestInjectorProcessor();

    const toolDef = { name: 'MockTool' };
    vi.spyOn(defaultToolRegistry, 'getToolDefinition').mockReturnValue(toolDef as any);
    vi.spyOn(ToolManifestProvider.prototype, 'provide').mockReturnValue('Tool manifest here');

    processor.process('Base prompt', { ToolA: {} as any, ToolB: {} as any }, 'test_agent', makeContext(LLMProvider.OPENAI));

    expect(console.info).toHaveBeenCalledWith(expect.stringContaining('Injected 2 tools'));
  });
});
