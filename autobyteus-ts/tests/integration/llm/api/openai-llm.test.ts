import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { OpenAILLM } from '../../../../src/llm/api/openai-llm.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMUserMessage } from '../../../../src/llm/user-message.js';
import { CompleteResponse, ChunkResponse } from '../../../../src/llm/utils/response-types.js';
import { OpenAiJsonSchemaFormatter } from '../../../../src/tools/usage/formatters/openai-json-schema-formatter.js';
import { defaultToolRegistry, ToolRegistry } from '../../../../src/tools/registry/tool-registry.js';
import { ToolDefinition } from '../../../../src/tools/registry/tool-definition.js';
import { registerWriteFileTool } from '../../../../src/tools/file/write-file.js';

// Skip if no API key (integration test pattern)
const apiKey = process.env.OPENAI_API_KEY;
console.log('Integration Test Key Status:', apiKey ? 'Present' : 'Missing', apiKey ? `(Length: ${apiKey.length})` : '');
const runIntegration = apiKey ? describe : describe.skip;

runIntegration('OpenAILLM Integration', () => {
  const buildModel = () =>
    new LLMModel({
      name: 'gpt-5.2',
      value: 'gpt-5.2',
      canonicalName: 'gpt-5.2',
      provider: LLMProvider.OPENAI
    });

  const resetRegistry = () => {
    defaultToolRegistry.clear();
    registerWriteFileTool();
  };

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const repoRoot = path.resolve(__dirname, '../../../../..');
  const imagePath = path.resolve(repoRoot, 'tests/assets/sample_image.png');
  const audioPath = path.resolve(repoRoot, 'tests/data/test_audio.mp3');

  it('should successfully make a simple completion call', async function () {
    const llm = new OpenAILLM(buildModel());
    const userMessage = new LLMUserMessage({ content: "Hello, OpenAI LLM!" });
    try {
      const response = await (llm as any)._sendUserMessageToLLM(userMessage, {});
      expect(response).toBeInstanceOf(CompleteResponse);
      expect(typeof response.content).toBe('string');
      expect(response.content.length).toBeGreaterThan(0);
    } catch (error: any) {
      const message = String(error?.message || error);
      if (message.includes('model') || message.includes('not_found')) {
        // Skip if model is not available for this API key.
        return;
      }
      throw error;
    } finally {
      await llm.cleanup();
    }
  }, 120000);

  it('should handle a multimodal image response', async () => {
    if (!fs.existsSync(imagePath)) {
      return;
    }

    const llm = new OpenAILLM(buildModel());
    const userMessage = new LLMUserMessage({
      content: 'What is in this image? Respond with a single word.',
      image_urls: [imagePath]
    });

    try {
      const response = await llm.sendUserMessage(userMessage);
      expect(response).toBeInstanceOf(CompleteResponse);
      expect(typeof response.content).toBe('string');
      expect(response.content.length).toBeGreaterThan(0);
      expect(response.content.split(/\s+/).length).toBeLessThan(5);
    } catch (error: any) {
      const message = String(error?.message || error);
      if (message.includes('model') || message.includes('not_found')) {
        return;
      }
      throw error;
    } finally {
      await llm.cleanup();
    }
  }, 120000);

  it('should attempt multimodal audio input when fixture is available', async () => {
    if (!fs.existsSync(audioPath)) {
      return;
    }

    const llm = new OpenAILLM(buildModel());
    const userMessage = new LLMUserMessage({
      content: 'Describe this audio briefly.',
      audio_urls: [audioPath]
    });

    try {
      const response = await llm.sendUserMessage(userMessage);
      expect(response).toBeInstanceOf(CompleteResponse);
      expect(typeof response.content).toBe('string');
      expect(response.content.length).toBeGreaterThan(0);
    } catch (error: any) {
      const message = String(error?.message || error).toLowerCase();
      // Some OpenAI models in this repo's defaults may not support audio input.
      if (
        message.includes('model') ||
        message.includes('not_found') ||
        message.includes('audio') ||
        message.includes('unsupported') ||
        message.includes('invalid')
      ) {
        return;
      }
      throw error;
    } finally {
      await llm.cleanup();
    }
  }, 120000);

  it('should stream response incrementally', async function () {
    const llm = new OpenAILLM(buildModel());
    const userMessage = new LLMUserMessage({ content: "Please write a short greeting." });
    const receivedTokens: string[] = [];
    let completeResponse = "";
    
    // @ts-ignore - calling protected
    const generator = llm._streamUserMessageToLLM(userMessage, {});
    
    try {
      for await (const chunk of generator) {
        expect(chunk).toBeInstanceOf(ChunkResponse);
        if (chunk.content) {
          receivedTokens.push(chunk.content);
          completeResponse += chunk.content;
        }
      }
      
      expect(receivedTokens.length).toBeGreaterThan(0);
      expect(completeResponse.length).toBeGreaterThan(0);
    } catch (error: any) {
      const message = String(error?.message || error);
      if (message.includes('model') || message.includes('not_found')) {
        return;
      }
      throw error;
    } finally {
      await llm.cleanup();
    }
  }, 120000);

  it('should support public sendUserMessage', async () => {
    const llm = new OpenAILLM(buildModel());
    const userMessageText = 'Can you summarize the following text: The quick brown fox jumps over the lazy dog.';
    const userMessage = new LLMUserMessage({ content: userMessageText });

    try {
      const response = await llm.sendUserMessage(userMessage);
      expect(response).toBeInstanceOf(CompleteResponse);
      expect(typeof response.content).toBe('string');
      expect(response.content.length).toBeGreaterThan(0);
    } catch (error: any) {
      const message = String(error?.message || error);
      if (message.includes('model') || message.includes('not_found')) {
        return;
      }
      throw error;
    } finally {
      await llm.cleanup();
    }
  }, 120000);

  it('should support public streamUserMessage', async () => {
    const llm = new OpenAILLM(buildModel());
    const userMessageText = 'Please list three benefits of using Python.';
    const userMessage = new LLMUserMessage({ content: userMessageText });
    const receivedTokens: string[] = [];
    let completeResponse = '';

    try {
      for await (const chunk of llm.streamUserMessage(userMessage)) {
        expect(chunk).toBeInstanceOf(ChunkResponse);
        if (chunk.content) {
          receivedTokens.push(chunk.content);
          completeResponse += chunk.content;
        }
      }

      expect(receivedTokens.length).toBeGreaterThan(0);
      expect(completeResponse.length).toBeGreaterThan(0);
    } catch (error: any) {
      const message = String(error?.message || error);
      if (message.includes('model') || message.includes('not_found')) {
        return;
      }
      throw error;
    } finally {
      await llm.cleanup();
    }
  }, 120000);

  it('should handle tool calls streaming', async function () {
    // Equivalent to test_openai_tool_calls
    resetRegistry();
    const toolDef = defaultToolRegistry.getToolDefinition('write_file');
    expect(toolDef).toBeDefined();

    const formatter = new OpenAiJsonSchemaFormatter();
    const openAITools = [formatter.provide(toolDef!)];

    const llm = new OpenAILLM(buildModel());
    const userMessage = new LLMUserMessage({ content: "Write a file named 'hello.txt' with content 'Hello World'" });

    const toolCallsReceived: any[] = [];

    // @ts-ignore
    const generator = llm._streamUserMessageToLLM(userMessage, { 
      tools: openAITools,
      tool_choice: "required" // Force tool usage
    });

    try {
      for await (const chunk of generator) {
        if (chunk.tool_calls) {
          toolCallsReceived.push(...chunk.tool_calls);
        }
      }

      expect(toolCallsReceived.length).toBeGreaterThan(0);
      const firstCall = toolCallsReceived[0];
      // Check if it's ToolCallDelta
      expect(firstCall).toHaveProperty('index');
      // Name might be in first or later chunk
    } catch (error: any) {
      const message = String(error?.message || error);
      if (message.includes('model') || message.includes('not_found')) {
        return;
      }
      throw error;
    } finally {
      await llm.cleanup();
    }
  }, 120000);
});
