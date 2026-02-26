import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GeminiLLM } from '../../../../src/llm/api/gemini-llm.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMUserMessage } from '../../../../src/llm/user-message.js';
import { CompleteResponse, ChunkResponse } from '../../../../src/llm/utils/response-types.js';
import { GeminiJsonSchemaFormatter } from '../../../../src/tools/usage/formatters/gemini-json-schema-formatter.js';
import { defaultToolRegistry, ToolRegistry } from '../../../../src/tools/registry/tool-registry.js';
import { ToolDefinition } from '../../../../src/tools/registry/tool-definition.js';
import { registerWriteFileTool } from '../../../../src/tools/file/write-file.js';

const hasVertexApiKey = Boolean(process.env.VERTEX_AI_API_KEY);
const hasVertexProjectAndLocation = Boolean(process.env.VERTEX_AI_PROJECT && process.env.VERTEX_AI_LOCATION);
const googleCredentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const hasExplicitGoogleCredentials = Boolean(
  googleCredentialsPath && fs.existsSync(googleCredentialsPath),
);
const defaultGcloudAdcPath = path.join(
  process.env.HOME ?? '',
  '.config',
  'gcloud',
  'application_default_credentials.json',
);
const hasDefaultGoogleCredentials = fs.existsSync(defaultGcloudAdcPath);
const hasVertex = hasVertexApiKey || (hasVertexProjectAndLocation && (hasExplicitGoogleCredentials || hasDefaultGoogleCredentials));
const hasApiKey = Boolean(process.env.GEMINI_API_KEY);
const runIntegration = hasVertex || hasApiKey ? describe : describe.skip;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../../..');

const imagePath = path.resolve(repoRoot, 'tests/assets/sample_image.png');
const audioPath = path.resolve(repoRoot, 'tests/data/test_audio.mp3');
const videoPath = path.resolve(repoRoot, 'tests/data/test_video.mp4');

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

runIntegration('GeminiLLM Integration', () => {
  it('should successfully make a simple completion call', async () => {
    const llm = new GeminiLLM(buildGeminiModel());
    const userMessage = new LLMUserMessage({ content: 'Hello, Gemini LLM!' });

    try {
      const response = await (llm as any)._sendUserMessageToLLM(userMessage, {});
      expect(response).toBeInstanceOf(CompleteResponse);
      expect(typeof response.content).toBe('string');
      expect(response.content.length).toBeGreaterThan(0);
    } finally {
      await llm.cleanup();
    }
  }, 120000);

  it('should stream response incrementally', async () => {
    const llm = new GeminiLLM(buildGeminiModel());
    const userMessage = new LLMUserMessage({ content: 'Please write a short greeting.' });
    const receivedTokens: string[] = [];
    let completeResponse = '';

    try {
      for await (const chunk of (llm as any)._streamUserMessageToLLM(userMessage, {})) {
        expect(chunk).toBeInstanceOf(ChunkResponse);
        if (chunk.content) {
          receivedTokens.push(chunk.content);
          completeResponse += chunk.content;
        }
      }

      expect(receivedTokens.length).toBeGreaterThan(0);
      expect(completeResponse.length).toBeGreaterThan(0);
    } finally {
      await llm.cleanup();
    }
  }, 120000);

  it('should support public sendUserMessage', async () => {
    const llm = new GeminiLLM(buildGeminiModel());
    const userMessageText = 'Can you summarize the following text: The quick brown fox jumps over the lazy dog.';
    const userMessage = new LLMUserMessage({ content: userMessageText });

    try {
      const response = await llm.sendUserMessage(userMessage);
      expect(response).toBeInstanceOf(CompleteResponse);
      expect(typeof response.content).toBe('string');
      expect(response.content.length).toBeGreaterThan(0);
    } finally {
      await llm.cleanup();
    }
  }, 120000);

  it('should support public streamUserMessage', async () => {
    const llm = new GeminiLLM(buildGeminiModel());
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
    } finally {
      await llm.cleanup();
    }
  }, 120000);

  it('should handle multimodal image input', async () => {
    if (!fs.existsSync(imagePath)) {
      return;
    }

    const llm = new GeminiLLM(buildGeminiModel());
    const userMessage = new LLMUserMessage({
      content: 'Describe this image.',
      image_urls: [imagePath]
    });

    try {
      const response = await llm.sendUserMessage(userMessage);
      expect(response).toBeInstanceOf(CompleteResponse);
      expect(response.content.length).toBeGreaterThan(0);
    } finally {
      await llm.cleanup();
    }
  }, 120000);

  it('should handle multimodal audio input', async () => {
    if (!fs.existsSync(audioPath)) {
      return;
    }

    const llm = new GeminiLLM(buildGeminiModel());
    const userMessage = new LLMUserMessage({
      content: 'Describe this audio.',
      audio_urls: [audioPath]
    });

    try {
      const response = await llm.sendUserMessage(userMessage);
      expect(response).toBeInstanceOf(CompleteResponse);
      expect(response.content.length).toBeGreaterThan(0);
    } finally {
      await llm.cleanup();
    }
  }, 120000);

  it('should handle multimodal video input', async () => {
    if (!fs.existsSync(videoPath)) {
      return;
    }

    const llm = new GeminiLLM(buildGeminiModel());
    const userMessage = new LLMUserMessage({
      content: 'Describe this video.',
      video_urls: [videoPath]
    });

    try {
      const response = await llm.sendUserMessage(userMessage);
      expect(response).toBeInstanceOf(CompleteResponse);
      expect(response.content.length).toBeGreaterThan(0);
    } finally {
      await llm.cleanup();
    }
  }, 120000);

  it('should generate tool calls in the stream', async () => {
    resetRegistry();
    const toolDef = defaultToolRegistry.getToolDefinition('write_file');
    expect(toolDef).toBeDefined();

    const formatter = new GeminiJsonSchemaFormatter();
    const toolSchema = formatter.provide(toolDef!);

    const llm = new GeminiLLM(buildGeminiModel());
    const userMessage = new LLMUserMessage({
      content: "Write a python file named tool_test.py with content 'print(1)'"
    });

    let toolCallsFound = false;

    try {
      for await (const chunk of (llm as any)._streamUserMessageToLLM(userMessage, { tools: [toolSchema] })) {
        if (chunk.tool_calls && chunk.tool_calls.length > 0) {
          toolCallsFound = true;
          for (const delta of chunk.tool_calls) {
            expect(delta.name).toBe('write_file');
            expect(delta.arguments_delta).toBeTruthy();
          }
        }
      }
    } finally {
      await llm.cleanup();
    }

    expect(toolCallsFound).toBe(true);
  }, 120000);
});
