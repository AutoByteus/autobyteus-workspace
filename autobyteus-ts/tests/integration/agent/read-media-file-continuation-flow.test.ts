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
import { BasePromptRenderer } from '../../../src/llm/prompt-renderers/base-prompt-renderer.js';
import { Message, MessageRole } from '../../../src/llm/utils/messages.js';
import { MemoryManager } from '../../../src/memory/memory-manager.js';
import { FileMemoryStore } from '../../../src/memory/store/file-store.js';

const SMALL_AUDIO_BYTES = Buffer.from('small-audio-fixture');
const SMALL_VIDEO_BYTES = Buffer.from('small-video-fixture');

class CapturingRenderer extends BasePromptRenderer {
  renderedMessages: Message[] = [];

  async render(messages: Message[]): Promise<Record<string, unknown>[]> {
    this.renderedMessages = messages;
    return messages.map((message) => message.toDict());
  }
}

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
    const audioPath = path.join(workspaceRoot, 'sample.mp3');
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

    const audioResult = await tool.execute(context, { file_path: 'sample.mp3' });
    const videoResult = await tool.execute(context, { file_path: 'clip.mp4' });
    expect(audioResult).toBeInstanceOf(ContextFile);
    expect(videoResult).toBeInstanceOf(ContextFile);
    expect(audioResult.fileType).toBe(ContextFileType.AUDIO);
    expect(videoResult.fileType).toBe(ContextFileType.VIDEO);

    memoryManager.ingestToolIntents([
      new ToolInvocation('read_media_file', { file_path: 'sample.mp3' }, 'inv-audio', turn.turnId),
      new ToolInvocation('read_media_file', { file_path: 'clip.mp4' }, 'inv-video', turn.turnId)
    ], turn.turnId, {
      assistantContent: 'Reading requested media files.'
    });

    const continuation = new ToolResultContinuationBuilder().build([
      new ToolResultEvent('read_media_file', audioResult, 'inv-audio', undefined, { file_path: 'sample.mp3' }, turn.turnId),
      new ToolResultEvent('read_media_file', videoResult, 'inv-video', undefined, { file_path: 'clip.mp4' }, turn.turnId)
    ], { context, turn });

    expect(continuation.senderType).toBe(SenderType.TOOL);
    expect(continuation.contextFiles?.map((file) => file.uri)).toEqual([audioPath, videoPath]);

    const pipelineResult = await new AgentInputPipeline().processToolContinuation(continuation, context, turn);
    expect(pipelineResult.llmRequestMode).toBe('append_user_message');
    expect(pipelineResult.llmUserMessage.audio_urls).toEqual([audioPath]);
    expect(pipelineResult.llmUserMessage.video_urls).toEqual([videoPath]);

    const renderer = new CapturingRenderer();
    const request = await new LLMRequestAssembler(memoryManager, renderer).prepareRequest(
      pipelineResult.llmUserMessage,
      turn.turnId,
      'System prompt'
    );

    const toolResultTraces = memoryManager
      .listRawTracesOrdered()
      .filter((trace) => trace.traceType === 'tool_result');
    expect(toolResultTraces).toHaveLength(2);

    const currentMessage = request.messages.at(-1);
    expect(currentMessage?.role).toBe(MessageRole.USER);
    expect(currentMessage?.audio_urls).toEqual([audioPath]);
    expect(currentMessage?.video_urls).toEqual([videoPath]);
    expect(renderer.renderedMessages.at(-1)?.audio_urls).toEqual([audioPath]);
    expect(renderer.renderedMessages.at(-1)?.video_urls).toEqual([videoPath]);
  });
});
