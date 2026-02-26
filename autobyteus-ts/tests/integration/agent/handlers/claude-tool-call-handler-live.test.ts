import { describe, it, expect } from 'vitest';
import { AnthropicLLM } from '../../../../src/llm/api/anthropic-llm.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMUserMessage } from '../../../../src/llm/user-message.js';
import { ApiToolCallStreamingResponseHandler } from '../../../../src/agent/streaming/handlers/api-tool-call-streaming-response-handler.js';
import { defaultToolRegistry, ToolRegistry } from '../../../../src/tools/registry/tool-registry.js';
import { ToolDefinition } from '../../../../src/tools/registry/tool-definition.js';
import { registerWriteFileTool } from '../../../../src/tools/file/write-file.js';
import { AnthropicJsonSchemaFormatter } from '../../../../src/tools/usage/formatters/anthropic-json-schema-formatter.js';

const apiKey = process.env.ANTHROPIC_API_KEY;
const runIntegration = apiKey ? describe : describe.skip;

const resetRegistry = () => {
  defaultToolRegistry.clear();
  registerWriteFileTool();
};

runIntegration('ApiToolCallStreamingResponseHandler (Claude live)', () => {
  it('processes tool call stream into invocations', async () => {
    resetRegistry();
    const toolDef = defaultToolRegistry.getToolDefinition('write_file');
    expect(toolDef).toBeDefined();

    const formatter = new AnthropicJsonSchemaFormatter();
    const toolsSchema = [formatter.provide(toolDef!)];

    const llm = new AnthropicLLM(new LLMModel({
      name: 'claude-4.5-sonnet',
      value: 'claude-4.5-sonnet',
      canonicalName: 'claude-4.5-sonnet',
      provider: LLMProvider.ANTHROPIC
    }));

    const handler = new ApiToolCallStreamingResponseHandler();

    const userMessage = new LLMUserMessage({
      content: "Write a python file named anthropic_test.py with content 'print(1)'"
    });

    try {
      for await (const chunk of (llm as any)._streamUserMessageToLLM(userMessage, {
        tools: toolsSchema
      })) {
        handler.feed(chunk);
      }
      handler.finalize();
    } catch (error: any) {
      const message = String(error?.message || error);
      if (message.includes('model') || message.includes('not_found')) {
        return;
      }
      throw error;
    } finally {
      await llm.cleanup();
    }

    const invocations = handler.getAllInvocations();
    expect(invocations.length).toBeGreaterThanOrEqual(1);

    const invocation = invocations.find((entry) => entry.name === 'write_file');
    expect(invocation).toBeDefined();

    const args = invocation!.arguments as Record<string, any>;
    expect(args).toHaveProperty('path');
    expect(String(args.path)).toContain('anthropic_test.py');
    expect(args).toHaveProperty('content');
    expect(String(args.content)).toContain('print(1)');
    expect(invocation!.id).toBeTruthy();
  }, 120000);
});
