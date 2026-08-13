import { describe, it, expect } from 'vitest';
import { OpenAICompatibleLLM } from '../../../../src/llm/api/openai-compatible-llm.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMUserMessage } from '../../../../src/llm/user-message.js';
import { LlmStreamingResponseHandler } from '../../../../src/agent/streaming/handlers/llm-streaming-response-handler.js';
import { SegmentEventType } from '../../../../src/agent/streaming/segments/segment-events.js';
import { defaultToolRegistry } from '../../../../src/tools/registry/tool-registry.js';
import { registerWriteFileTool } from '../../../../src/tools/file/write-file.js';
import { ToolSchemaProvider } from '../../../../src/tools/usage/providers/tool-schema-provider.js';

const apiKey = process.env.MISTRAL_API_KEY;
const runIntegration = apiKey ? describe : describe.skip;

const TURN_ID = 'turn_test';

const resetRegistry = () => {
  defaultToolRegistry.clear();
  registerWriteFileTool();
};

runIntegration('LlmStreamingResponseHandler (Mistral live)', () => {
  it('processes tool call stream into invocations', async () => {
    resetRegistry();
    const toolDef = defaultToolRegistry.getToolDefinition('write_file');
    expect(toolDef).toBeDefined();

    const toolsSchema = new ToolSchemaProvider().buildSchema(['write_file'], LLMProvider.MISTRAL);

    const llm = new OpenAICompatibleLLM(
      new LLMModel({
        name: 'mistral-large-3',
        value: 'mistral-large-2512',
        canonicalName: 'mistral-large-3',
        provider: LLMProvider.MISTRAL
      }),
      'MISTRAL_API_KEY',
      'https://api.mistral.ai/v1'
    );

    const events: any[] = [];
    const handler = new LlmStreamingResponseHandler({
      turnId: TURN_ID,
      toolCallsEnabled: true,
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
