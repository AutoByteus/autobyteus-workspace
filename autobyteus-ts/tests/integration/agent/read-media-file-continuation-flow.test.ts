import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { ReadMediaFile } from '../../../src/tools/multimedia/media-reader-tool.js';
import { ToolResultContinuationBuilder } from '../../../src/agent/loop/tool-result-continuation-builder.js';
import { AgentInputPipeline } from '../../../src/agent/pipelines/agent-input-pipeline.js';
import { AgentTurn } from '../../../src/agent/agent-turn.js';
import { ToolInvocation } from '../../../src/agent/tool-invocation.js';
import { ToolResultEvent } from '../../../src/agent/events/agent-events.js';
import { SenderType } from '../../../src/agent/sender-type.js';
import { ContextFile } from '../../../src/agent/message/context-file.js';
import { ContextFileType } from '../../../src/agent/message/context-file-type.js';
import { LLMRequestAssembler } from '../../../src/agent/llm-request-assembler.js';
import { GeminiPromptRenderer } from '../../../src/llm/prompt-renderers/gemini-prompt-renderer.js';
import { MessageRole } from '../../../src/llm/utils/messages.js';
import { supportedModelDefinitions } from '../../../src/llm/supported-model-definitions.js';
import { MemoryManager } from '../../../src/memory/memory-manager.js';
import { FileMemoryStore } from '../../../src/memory/store/file-store.js';

const SMALL_AUDIO_BYTES = Buffer.from('small-audio-fixture');
const SMALL_VIDEO_BYTES = Buffer.from('small-video-fixture');

describe('read_media_file continuation flow (integration)', () => {
  let tempDir: string;
  let workspaceRoot: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'read-media-continuation-'));
    workspaceRoot = path.join(tempDir, 'workspace');
    await fs.mkdir(workspaceRoot, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('carries small audio and video read by tools into the next LLM request', async () => {
    const audioPath = path.join(workspaceRoot, 'sample.m4a');
    const videoPath = path.join(workspaceRoot, 'clip.mp4');
    await fs.writeFile(audioPath, SMALL_AUDIO_BYTES);
    await fs.writeFile(videoPath, SMALL_VIDEO_BYTES);

    const memoryManager = new MemoryManager({
      store: new FileMemoryStore(tempDir, 'agent_read_media_continuation')
    });
    const turn = new AgentTurn('turn-read-media-1');
    const context = {
      agentId: 'agent-read-media',
      workspaceRootPath: workspaceRoot,
      config: { inputProcessors: [] },
      state: { activeTurn: turn, memoryManager }
    } as any;
    const tool = new ReadMediaFile();

    const audioResult = await tool.execute(context, { file_path: 'sample.m4a' });
    const videoResult = await tool.execute(context, { file_path: 'clip.mp4' });
    expect(audioResult).toBeInstanceOf(ContextFile);
    expect(videoResult).toBeInstanceOf(ContextFile);
    const audioContextFile = audioResult as ContextFile;
    const videoContextFile = videoResult as ContextFile;
    expect(audioContextFile.fileType).toBe(ContextFileType.AUDIO);
    expect(videoContextFile.fileType).toBe(ContextFileType.VIDEO);

    memoryManager.ingestToolIntents([
      new ToolInvocation('read_media_file', { file_path: 'sample.m4a' }, 'inv-audio', turn.turnId),
      new ToolInvocation('read_media_file', { file_path: 'clip.mp4' }, 'inv-video', turn.turnId)
    ], turn.turnId, {
      assistantContent: 'Reading requested media files.'
    });

    const continuation = new ToolResultContinuationBuilder().build([
      new ToolResultEvent('read_media_file', audioContextFile, 'inv-audio', undefined, { file_path: 'sample.m4a' }, turn.turnId),
      new ToolResultEvent('read_media_file', videoContextFile, 'inv-video', undefined, { file_path: 'clip.mp4' }, turn.turnId)
    ], { context, turn });

    expect(continuation.senderType).toBe(SenderType.TOOL);
    expect(continuation.contextFiles?.map((file) => file.uri)).toEqual([audioPath, videoPath]);

    const pipelineResult = await new AgentInputPipeline().processToolContinuation(continuation, context, turn);
    expect(pipelineResult.llmRequestMode).toBe('append_user_message');
    expect(pipelineResult.llmUserMessage.audio_urls).toEqual([audioPath]);
    expect(pipelineResult.llmUserMessage.video_urls).toEqual([videoPath]);

    const geminiDefinition = supportedModelDefinitions.find(
      (definition) => definition.name === 'gemini-3.5-flash',
    );
    expect(geminiDefinition).toBeDefined();

    const request = await new LLMRequestAssembler(
      memoryManager,
      new GeminiPromptRenderer(),
      null,
      geminiDefinition!.staticMetadata.multimodalCapabilities,
    ).prepareRequest(
      pipelineResult.llmUserMessage,
      turn.turnId,
      'System prompt'
    );

    const toolResultTraces = memoryManager
      .listRawTracesOrdered()
      .filter((trace) => trace.traceType === 'tool_result');
    expect(toolResultTraces).toHaveLength(2);

    const currentMessage = request.canonicalMessages.at(-1);
    expect(currentMessage?.role).toBe(MessageRole.USER);
    expect(currentMessage?.audio_urls).toEqual([audioPath]);
    expect(currentMessage?.video_urls).toEqual([videoPath]);

    const outboundCurrentMessage = request.outboundMessages.at(-1);
    expect(outboundCurrentMessage?.audio_urls).toEqual([audioPath]);
    expect(outboundCurrentMessage?.video_urls).toEqual([videoPath]);

    const renderedMessages = request.renderedPayload as Array<{
      role?: string;
      parts?: Array<Record<string, unknown>>;
    }>;
    const renderedCurrentMessage = renderedMessages.at(-1);
    expect(renderedCurrentMessage?.role).toBe('user');
    const inlineParts = renderedCurrentMessage?.parts?.filter((part) => 'inlineData' in part) ?? [];
    expect(inlineParts).toEqual([
      {
        inlineData: {
          data: SMALL_AUDIO_BYTES.toString('base64'),
          mimeType: 'audio/mp4'
        }
      },
      {
        inlineData: {
          data: SMALL_VIDEO_BYTES.toString('base64'),
          mimeType: 'video/mp4'
        }
      }
    ]);
  });
});
