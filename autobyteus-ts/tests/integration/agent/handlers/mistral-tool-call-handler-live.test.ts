import { describe, it, expect } from 'vitest';
import { OpenAICompatibleLLM } from '../../../../src/llm/api/openai-compatible-llm.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMUserMessage } from '../../../../src/llm/user-message.js';
import { ApiToolCallStreamingResponseHandler } from '../../../../src/agent/streaming/handlers/api-tool-call-streaming-response-handler.js';
import { SegmentEventType } from '../../../../src/agent/streaming/segments/segment-events.js';
import { defaultToolRegistry, ToolRegistry } from '../../../../src/tools/registry/tool-registry.js';
import { ToolDefinition } from '../../../../src/tools/registry/tool-definition.js';
import { registerWriteFileTool } from '../../../../src/tools/file/write-file.js';
import { MistralJsonSchemaFormatter } from '../../../../src/tools/usage/formatters/mistral-json-schema-formatter.js';

const apiKey = process.env.MISTRAL_API_KEY;
const runIntegration = apiKey ? describe : describe.skip;

const resetRegistry = () => {
  defaultToolRegistry.clear();
  registerWriteFileTool();
};

runIntegration('ApiToolCallStreamingResponseHandler (Mistral live)', () => {
  it('processes tool call stream into invocations', async () => {
    resetRegistry();
    const toolDef = defaultToolRegistry.getToolDefinition('write_file');
    expect(toolDef).toBeDefined();

    const formatter = new MistralJsonSchemaFormatter();
    const toolsSchema = [formatter.provide(toolDef!)];

    const llm = new OpenAICompatibleLLM(
      new LLMModel({
        name: 'mistral-large-latest',
        value: 'mistral-large-latest',
        canonicalName: 'mistral-large-latest',
        provider: LLMProvider.MISTRAL
      }),
      'MISTRAL_API_KEY',
      'https://api.mistral.ai/v1'
    );

    const events: any[] = [];
    const handler = new ApiToolCallStreamingResponseHandler({
      onSegmentEvent: (event) => events.push(event)
    });

    const userMessage = new LLMUserMessage({
      content: "Use the write_file tool to create mistral_test.py with content 'print(1)'."
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

    const toolStarts = events.filter(
      (event) => event.event_type === SegmentEventType.START && event.payload?.metadata?.tool_name === 'write_file'
    );
    expect(toolStarts.length).toBeGreaterThan(0);

    const invocations = handler.getAllInvocations();
    expect(invocations.length).toBeGreaterThanOrEqual(1);

    const invocation = invocations.find((entry) => entry.name === 'write_file');
    expect(invocation).toBeDefined();

    const args = invocation!.arguments as Record<string, any>;
    expect(args).toHaveProperty('content');
    expect(String(args.content)).toContain('print(1)');
    expect(args).toHaveProperty('path');
    expect(String(args.path)).toContain('mistral_test.py');
    expect(invocation!.id).toBeTruthy();
  }, 120000);
});
