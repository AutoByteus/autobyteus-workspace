import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AgentTurn } from '../../../src/agent/agent-turn.js';
import { ToolResultEvent } from '../../../src/agent/events/agent-events.js';
import { LLMRequestAssembler } from '../../../src/agent/llm-request-assembler.js';
import { ToolContinuationInputBuilder } from '../../../src/agent/loop/tool-continuation-input-builder.js';
import { ContextFile } from '../../../src/agent/message/context-file.js';
import { ContextFileType } from '../../../src/agent/message/context-file-type.js';
import { AgentInputPipeline } from '../../../src/agent/pipelines/agent-input-pipeline.js';
import { ToolInvocation } from '../../../src/agent/tool-invocation.js';
import { GeminiLLM } from '../../../src/llm/api/gemini-llm.js';
import { LLMModel } from '../../../src/llm/models.js';
import { GeminiPromptRenderer } from '../../../src/llm/prompt-renderers/gemini-prompt-renderer.js';
import { LLMProvider } from '../../../src/llm/providers.js';
import { LLMUserMessage } from '../../../src/llm/user-message.js';
import { LLMConfig } from '../../../src/llm/utils/llm-config.js';
import { CompleteResponse } from '../../../src/llm/utils/response-types.js';
import { MemoryManager } from '../../../src/memory/memory-manager.js';
import { FileMemoryStore } from '../../../src/memory/store/file-store.js';
import { ReadMediaFile } from '../../../src/tools/multimedia/media-reader-tool.js';
import { defaultToolRegistry } from '../../../src/tools/registry/tool-registry.js';
import { registerToolClass } from '../../../src/tools/tool-meta.js';

const LIVE_FLAG_ENV = 'AUTOBYTEUS_RUN_GEMINI_M4A_LIVE';
const LIVE_MODEL_ENV = 'AUTOBYTEUS_GEMINI_M4A_LIVE_MODEL';

const isEnabled = (value: string | undefined): boolean =>
  ['1', 'true', 'yes', 'on'].includes((value ?? '').trim().toLowerCase());

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
const shouldRunLiveM4a = isEnabled(process.env[LIVE_FLAG_ENV]) && (hasVertex || hasApiKey);
const runLiveM4aIntegration = shouldRunLiveM4a ? describe : describe.skip;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');
const sourceAudioPath = path.resolve(repoRoot, 'tests/data/test_audio.m4a');

const buildGeminiModel = () => {
  const modelName = process.env[LIVE_MODEL_ENV]?.trim() || 'gemini-3.1-pro-preview';
  return new LLMModel({
    name: modelName,
    value: modelName,
    canonicalName: modelName,
    provider: LLMProvider.GEMINI
  });
};

runLiveM4aIntegration('Gemini read_media_file .m4a live integration (env gated)', () => {
  let tempDir: string;
  let workspaceRoot: string;
  let registrySnapshot: ReturnType<typeof defaultToolRegistry.snapshot>;

  beforeEach(async () => {
    registrySnapshot = defaultToolRegistry.snapshot();
    defaultToolRegistry.clear();
    registerToolClass(ReadMediaFile);

    tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'gemini-read-media-m4a-live-'));
    workspaceRoot = path.join(tempDir, 'workspace');
    await fsp.mkdir(workspaceRoot, { recursive: true });
  });

  afterEach(async () => {
    defaultToolRegistry.restore(registrySnapshot);
    await fsp.rm(tempDir, { recursive: true, force: true });
  });

  it('sends a read_media_file .m4a tool result continuation to direct Gemini', async () => {
    expect(fs.existsSync(sourceAudioPath)).toBe(true);
    const workspaceAudioPath = path.join(workspaceRoot, 'test_audio.m4a');
    await fsp.copyFile(sourceAudioPath, workspaceAudioPath);

    expect(defaultToolRegistry.getToolDefinition('read_media_file')).toBeDefined();

    const memoryManager = new MemoryManager({
      store: new FileMemoryStore(tempDir, 'gemini_read_media_m4a_live')
    });
    const turn = new AgentTurn('turn-gemini-read-media-m4a-live');
    const context = {
      agentId: 'agent-gemini-read-media-m4a-live',
      workspaceRootPath: workspaceRoot,
      config: { inputProcessors: [] },
      state: { activeTurn: turn, memoryManager }
    } as any;

    const originalUserMessage = new LLMUserMessage({
      content: 'Use read_media_file on test_audio.m4a, then transcribe exactly what is spoken. Answer with only the spoken word.'
    });
    memoryManager.ingestUserMessage(originalUserMessage, turn.turnId, 'UserMessageReceivedEvent');
    memoryManager.appendWorkingContextUserMessage(originalUserMessage, { turnId: turn.turnId });

    const mediaResult = await new ReadMediaFile().execute(context, { file_path: 'test_audio.m4a' });
    expect(mediaResult).toBeInstanceOf(ContextFile);
    const contextFile = mediaResult as ContextFile;
    expect(contextFile.fileType).toBe(ContextFileType.AUDIO);

    memoryManager.ingestToolIntents([
      new ToolInvocation('read_media_file', { file_path: 'test_audio.m4a' }, 'inv-m4a-audio', turn.turnId)
    ], turn.turnId, {
      assistantContent: 'I will read the requested audio file.'
    });

    const results = [
      new ToolResultEvent(
        'read_media_file',
        contextFile,
        'inv-m4a-audio',
        undefined,
        { file_path: 'test_audio.m4a' },
        turn.turnId
      )
    ];
    memoryManager.ingestToolResults(results, turn.turnId, {
      source: 'native_api_ordered_batch',
    });
    const continuation = new ToolContinuationInputBuilder().build(results, turn.turnId);

    const pipelineResult = await new AgentInputPipeline().processToolContinuation(continuation, context, turn);
    expect(pipelineResult.llmUserMessage).not.toBeNull();
    expect(pipelineResult.llmUserMessage?.audio_urls).toEqual([workspaceAudioPath]);

    const request = await new LLMRequestAssembler(
      memoryManager,
      new GeminiPromptRenderer()
    ).prepareRequest(
      pipelineResult.llmUserMessage,
      { turnId: turn.turnId, requestId: `${turn.turnId}:llm:1` },
      'You are validating direct Gemini audio input. Follow the user transcription instruction.'
    );

    const renderedMessages = request.renderedPayload as Array<{ role?: string; parts?: Array<Record<string, unknown>> }>;
    const currentRenderedMessage = renderedMessages.at(-1);
    const inlineParts = currentRenderedMessage?.parts?.filter((part) => 'inlineData' in part) ?? [];
    expect(inlineParts).toContainEqual({
      inlineData: {
        data: await fsp.readFile(workspaceAudioPath, { encoding: 'base64' }),
        mimeType: 'audio/mp4'
      }
    });

    const llm = new GeminiLLM(buildGeminiModel(), new LLMConfig({
      systemMessage: 'You are validating direct Gemini audio input. Follow the user transcription instruction.',
      temperature: 0,
      maxTokens: 512
    }));

    try {
      const response = await llm.sendMessages(request.outboundMessages, request.renderedPayload);
      expect(response).toBeInstanceOf(CompleteResponse);
      expect(response.content.toLowerCase()).toContain('hello');
    } finally {
      await llm.cleanup();
    }
  }, 180000);
});
