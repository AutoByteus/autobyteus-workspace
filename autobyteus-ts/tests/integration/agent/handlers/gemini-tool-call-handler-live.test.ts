import { describe, it, expect } from 'vitest';
import { GeminiLLM } from '../../../../src/llm/api/gemini-llm.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMUserMessage } from '../../../../src/llm/user-message.js';
import { ApiToolCallStreamingResponseHandler } from '../../../../src/agent/streaming/handlers/api-tool-call-streaming-response-handler.js';
import { SegmentEventType } from '../../../../src/agent/streaming/segments/segment-events.js';
import { defaultToolRegistry, ToolRegistry } from '../../../../src/tools/registry/tool-registry.js';
import { ToolDefinition } from '../../../../src/tools/registry/tool-definition.js';
import { registerWriteFileTool } from '../../../../src/tools/file/write-file.js';
import { GeminiJsonSchemaFormatter } from '../../../../src/tools/usage/formatters/gemini-json-schema-formatter.js';

const hasVertexApiKey = Boolean(process.env.VERTEX_AI_API_KEY);
const hasVertex = hasVertexApiKey || Boolean(process.env.VERTEX_AI_PROJECT && process.env.VERTEX_AI_LOCATION);
const hasApiKey = Boolean(process.env.GEMINI_API_KEY);
const runIntegration = hasVertex || hasApiKey ? describe : describe.skip;

const buildGeminiModel = () =>
  new LLMModel({
    name: 'gemini-3-flash-preview',
    value: 'gemini-3-flash-preview',
    canonicalName: 'gemini-3-flash',
    provider: LLMProvider.GEMINI
  });

const resetRegistry = () => {
  defaultToolRegistry.clear();
  registerWriteFileTool();
};

runIntegration('ApiToolCallStreamingResponseHandler (Gemini live)', () => {
  it('processes tool call stream into invocations', async () => {
    resetRegistry();
    const toolDef = defaultToolRegistry.getToolDefinition('write_file');
    expect(toolDef).toBeDefined();

    const formatter = new GeminiJsonSchemaFormatter();
    const toolsSchema = [formatter.provide(toolDef!)];

    const llm = new GeminiLLM(buildGeminiModel());
    const events: any[] = [];
    const handler = new ApiToolCallStreamingResponseHandler({
      onSegmentEvent: (event) => events.push(event)
    });

    const userMessage = new LLMUserMessage({
      content: "Write a python file named gemini_test.py with content 'print(1)'."
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
    expect(args).toHaveProperty('path');
    expect(String(args.path)).toContain('gemini_test.py');
    expect(args).toHaveProperty('content');
    expect(String(args.content)).toContain('print(1)');
    expect(invocation!.id).toBeTruthy();
  }, 120000);
});
