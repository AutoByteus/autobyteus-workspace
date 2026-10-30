/**
 * read_file media reads through a running native agent (autobyteus-328, UC-001/UC-002).
 *
 * Purpose: a scripted model calls the real `read_file` on a synthesized PNG, WAV and MP4; the agent runtime executes
 * the calls and the next model request carries the files as media. With a model whose capability marks image input
 * `unsupported`, the image read is refused with the tool error and the image is not attached, while audio and video
 * still are. Also checks that a non-media binary file is refused through the same path (REQ-009).
 * Prerequisites: none (scripted model, temporary directory, synthesized files; no provider, network or credentials).
 * Gate: none. Command: `pnpm -C autobyteus-ts exec vitest run tests/integration/agent/read-file-media-native-agent-flow.test.ts`
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AgentConfig } from '../../../src/agent/context/agent-config.js';
import { AgentContext } from '../../../src/agent/context/agent-context.js';
import { AgentRuntimeState } from '../../../src/agent/context/agent-runtime-state.js';
import { UserMessageReceivedEvent } from '../../../src/agent/events/agent-events.js';
import { MemoryIngestInputProcessor } from '../../../src/agent/input-processor/memory-ingest-input-processor.js';
import { AgentInputUserMessage } from '../../../src/agent/message/agent-input-user-message.js';
import { AgentRuntime } from '../../../src/agent/runtime/agent-runtime.js';
import { AgentStatus } from '../../../src/agent/status/status-enum.js';
import { BaseLLM } from '../../../src/llm/base.js';
import { LLMModel } from '../../../src/llm/models.js';
import type { MultimodalCapabilities } from '../../../src/llm/multimodal-capabilities.js';
import { LLMProvider } from '../../../src/llm/providers.js';
import { LLMConfig } from '../../../src/llm/utils/llm-config.js';
import type { Message } from '../../../src/llm/utils/messages.js';
import { ChunkResponse, CompleteResponse } from '../../../src/llm/utils/response-types.js';
import { MemoryManager } from '../../../src/memory/memory-manager.js';
import { FileMemoryStore } from '../../../src/memory/store/file-store.js';
import { registerReadFileTool } from '../../../src/tools/file/read-file.js';
import type { ToolDefinition } from '../../../src/tools/registry/tool-definition.js';
import { defaultToolRegistry } from '../../../src/tools/registry/tool-registry.js';

const PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==',
  'base64',
);
const WAV_BYTES = Buffer.from(
  'RIFF$\u0000\u0000\u0000WAVEfmt \u0010\u0000\u0000\u0000\u0001\u0000\u0001\u0000D¬\u0000\u0000\u0088X\u0001\u0000\u0002\u0000\u0010\u0000data\u0000\u0000\u0000\u0000',
  'latin1',
);
const MP4_BYTES = Buffer.from('\u0000\u0000\u0000\u0018ftypmp42\u0000\u0000\u0000\u0000mp42isom', 'latin1');
const PDF_LIKE_BYTES = Buffer.concat([Buffer.from('%PDF-1.4\n', 'latin1'), Buffer.from([0x00, 0xe2, 0xe3, 0xcf, 0xd3]), Buffer.from('\n%%EOF\n')]);

type ScriptedCall = { id: string; args: Record<string, unknown> };

/** A model that asks for the scripted read_file calls once, then answers; it records every request it receives. */
class ScriptedReadFileLLM extends BaseLLM {
  public requests: Message[][] = [];

  constructor(capabilities: MultimodalCapabilities, private readonly calls: ScriptedCall[]) {
    super(
      new LLMModel({
        name: 'scripted-read-file',
        value: 'scripted-read-file',
        canonicalName: 'scripted-read-file',
        provider: LLMProvider.OPENAI,
        multimodalCapabilities: capabilities,
      }),
      new LLMConfig({ systemMessage: 'read_file media native agent flow.', temperature: 0, maxTokens: 64 }),
    );
  }

  protected async _sendMessagesToLLM(): Promise<CompleteResponse> {
    return new CompleteResponse({ content: 'unused' });
  }

  protected async *_streamMessagesToLLM(messages: Message[]): AsyncGenerator<ChunkResponse, void, unknown> {
    this.requests.push([...messages]);
    if (this.requests.length === 1) {
      yield new ChunkResponse({
        content: '',
        tool_calls: this.calls.map((call, index) => ({
          index,
          call_id: call.id,
          name: 'read_file',
          arguments_delta: JSON.stringify(call.args),
        })),
      });
      yield new ChunkResponse({ content: '', is_complete: true, usage: { prompt_tokens: 10, completion_tokens: 2, total_tokens: 12 } });
      return;
    }
    yield new ChunkResponse({ content: 'done', is_complete: true, usage: { prompt_tokens: 20, completion_tokens: 1, total_tokens: 21 } });
  }
}

const waitFor = async (predicate: () => boolean, timeoutMs = 10000): Promise<boolean> => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate()) return true;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  return false;
};

const mediaIn = (messages: Message[]) => ({
  image: messages.flatMap((message) => message.image_urls ?? []),
  audio: messages.flatMap((message) => message.audio_urls ?? []),
  video: messages.flatMap((message) => message.video_urls ?? []),
});

describe('read_file media through a native agent (integration)', () => {
  let workspace: string;
  let registrySnapshot: Map<string, ToolDefinition>;

  beforeEach(() => {
    registrySnapshot = defaultToolRegistry.snapshot();
    workspace = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'read-file-native-agent-')));
    fs.writeFileSync(path.join(workspace, 'photo.png'), PNG_BYTES);
    fs.writeFileSync(path.join(workspace, 'voice.wav'), WAV_BYTES);
    fs.writeFileSync(path.join(workspace, 'clip.mp4'), MP4_BYTES);
    fs.writeFileSync(path.join(workspace, 'report.pdf'), PDF_LIKE_BYTES);
  });

  afterEach(() => {
    defaultToolRegistry.restore(registrySnapshot);
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  const runAgent = async (capabilities: MultimodalCapabilities, calls: ScriptedCall[]): Promise<ScriptedReadFileLLM> => {
    const llm = new ScriptedReadFileLLM(capabilities, calls);
    const memoryDir = path.join(workspace, '.memory');
    const state = new AgentRuntimeState('read_file_native_agent', memoryDir);
    state.memoryManager = new MemoryManager({ store: new FileMemoryStore(memoryDir, 'read_file_native_agent') });
    state.llmInstance = llm;
    state.toolInstances = { read_file: registerReadFileTool() };
    const config = new AgentConfig(
      'ReadFileNativeAgent',
      'integration tester',
      'read_file media native agent flow',
      llm,
      null,
      Object.values(state.toolInstances),
      true,
      [new MemoryIngestInputProcessor()],
      null,
      [],
    );
    const context = new AgentContext(state.agentId, config, state);
    const runtime = new AgentRuntime(context);
    try {
      runtime.start();
      expect(await waitFor(() => context.currentStatus === AgentStatus.IDLE || context.currentStatus === AgentStatus.ERROR)).toBe(true);
      expect(context.currentStatus).toBe(AgentStatus.IDLE);
      await runtime.submitEvent(new UserMessageReceivedEvent(new AgentInputUserMessage('Read the files.')));
      expect(await waitFor(() => llm.requests.length >= 2 && state.activeTurn === null)).toBe(true);
      return llm;
    } finally {
      if (runtime.isRunning) await runtime.stop(2);
    }
  };

  const mediaCalls = (): ScriptedCall[] => [
    { id: 'call_image', args: { path: 'photo.png', base_dir: workspace } },
    { id: 'call_audio', args: { path: path.join(workspace, 'voice.wav') } },
    { id: 'call_video', args: { path: path.join(workspace, 'clip.mp4') } },
  ];

  it('attaches an image, audio and video read with read_file to the next model request', async () => {
    const llm = await runAgent({ image: 'supported', audio: 'supported', video: 'supported' }, mediaCalls());

    expect(mediaIn(llm.requests[0])).toEqual({ image: [], audio: [], video: [] });
    expect(mediaIn(llm.requests[1])).toEqual({
      image: [path.join(workspace, 'photo.png')],
      audio: [path.join(workspace, 'voice.wav')],
      video: [path.join(workspace, 'clip.mp4')],
    });
    const continuationText = JSON.stringify(llm.requests[1]);
    expect(continuationText).not.toContain('IHDR');
    expect(continuationText).not.toContain('ftypmp42');
  });

  it('refuses the image on a model without image input and still attaches audio and video', async () => {
    const llm = await runAgent({ image: 'unsupported', audio: 'supported', video: 'supported' }, mediaCalls());

    expect(mediaIn(llm.requests[1])).toEqual({
      image: [],
      audio: [path.join(workspace, 'voice.wav')],
      video: [path.join(workspace, 'clip.mp4')],
    });
    expect(JSON.stringify(llm.requests[1])).toContain(
      'The selected model does not support image input. The image file was not loaded. Continue without visual analysis and do not claim to have inspected it.',
    );
  });

  it('refuses a non-media binary file and attaches nothing', async () => {
    const pdfPath = path.join(workspace, 'report.pdf');
    const llm = await runAgent({ image: 'supported', audio: 'supported', video: 'supported' }, [
      { id: 'call_pdf', args: { path: pdfPath } },
    ]);

    expect(mediaIn(llm.requests[1])).toEqual({ image: [], audio: [], video: [] });
    const continuationText = JSON.stringify(llm.requests[1]);
    expect(continuationText).toContain(`The file '${pdfPath}' is a binary file and cannot be read as text.`);
    expect(continuationText).not.toContain('%PDF');
  });
});
