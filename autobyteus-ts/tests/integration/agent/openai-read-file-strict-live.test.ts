/**
 * OpenAI GPT-5 tool arguments through a native agent, live (autobyteus-328 REQ-010 / AC-010).
 *
 * Purpose: the Responses API treats an omitted `strict` as true, and GPT-5 models then fill every optional argument
 * (SD-02), so image reads came with start_line/end_line and were refused. With `strict: false` sent by
 * `OpenAIResponsesLLM`, a GPT-5 model driving a real `AgentRuntime` reads a synthesized image through `read_file` with
 * only `path` and names its color, and calls `write_file` with an absolute path without inventing `base_dir`.
 * Prerequisites: a test vault with an OpenAI key (TESTING.md#test-vault). Small input: a 64x64 PNG and one short file.
 * Gate: RUN_LIVE_PROVIDER_TESTS=1 plus AUTOBYTEUS_TEST_VAULT. Model: OPENAI_STRICT_LIVE_MODEL (default gpt-5.4-mini).
 * Optional: OPENAI_STRICT_LIVE_RECORD=<file> appends each turn's tool calls and answer as JSON lines.
 * Command:
 *   env -i PATH="$PATH" HOME=<temp> TMPDIR="$TMPDIR" AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault RUN_LIVE_PROVIDER_TESTS=1 \
 *     pnpm -C autobyteus-ts exec vitest run tests/integration/agent/openai-read-file-strict-live.test.ts
 */
import { afterEach, beforeEach, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { AgentConfig } from '../../../src/agent/context/agent-config.js';
import { AgentContext } from '../../../src/agent/context/agent-context.js';
import { AgentRuntimeState } from '../../../src/agent/context/agent-runtime-state.js';
import { UserMessageReceivedEvent } from '../../../src/agent/events/agent-events.js';
import { MemoryIngestInputProcessor } from '../../../src/agent/input-processor/memory-ingest-input-processor.js';
import { AgentInputUserMessage } from '../../../src/agent/message/agent-input-user-message.js';
import { AgentRuntime } from '../../../src/agent/runtime/agent-runtime.js';
import { AgentStatus } from '../../../src/agent/status/status-enum.js';
import { OpenAILLM } from '../../../src/llm/api/openai-llm.js';
import { LLMModel } from '../../../src/llm/models.js';
import { LLMProvider } from '../../../src/llm/providers.js';
import { LLMConfig } from '../../../src/llm/utils/llm-config.js';
import { MessageRole } from '../../../src/llm/utils/messages.js';
import { MemoryManager } from '../../../src/memory/memory-manager.js';
import { MemoryType } from '../../../src/memory/models/memory-types.js';
import { FileMemoryStore } from '../../../src/memory/store/file-store.js';
import { registerReadFileTool } from '../../../src/tools/file/read-file.js';
import { registerWriteFileTool } from '../../../src/tools/file/write-file.js';
import type { ToolDefinition } from '../../../src/tools/registry/tool-definition.js';
import { defaultToolRegistry } from '../../../src/tools/registry/tool-registry.js';
import { liveProviderTest } from '../../../../test-support/test-vault/test-vault.js';

const live = liveProviderTest('OpenAI');
const modelName = process.env.OPENAI_STRICT_LIVE_MODEL?.trim() || 'gpt-5.4-mini';

/** A solid-color RGB PNG, synthesized (no fixture file). */
const solidPng = (size: number, [r, g, b]: [number, number, number]): Buffer => {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc32 = (bytes: Buffer): number => {
    let c = 0xffffffff;
    for (const byte of bytes) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer): Buffer => {
    const typeAndData = Buffer.concat([Buffer.from(type, 'latin1'), data]);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typeAndData));
    return Buffer.concat([length, typeAndData, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // RGB
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(size * 3).map((_, i) => [r, g, b][i % 3])]);
  const pixels = Buffer.concat(Array.from({ length: size }, () => row));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(pixels)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
};

const waitFor = async (predicate: () => boolean, timeoutMs: number): Promise<boolean> => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate()) return true;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return false;
};

live.describe(`OpenAI ${modelName} tool arguments through a native agent (live, strict: false)`, () => {
  let workspace: string;
  let registrySnapshot: Map<string, ToolDefinition>;

  beforeEach(() => {
    registrySnapshot = defaultToolRegistry.snapshot();
    defaultToolRegistry.clear();
    workspace = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'openai-strict-live-')));
  });

  afterEach(() => {
    defaultToolRegistry.restore(registrySnapshot);
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  const runTurn = async (prompt: string) => {
    const llm = new OpenAILLM(
      new LLMModel({
        name: modelName,
        value: modelName,
        canonicalName: modelName,
        provider: LLMProvider.OPENAI,
        multimodalCapabilities: { image: 'supported', audio: 'unsupported', video: 'unsupported' },
      }),
      new LLMConfig({ systemMessage: 'You are a careful assistant. Use the tools you are given.' }),
    );
    const memoryDir = path.join(workspace, '.memory');
    const state = new AgentRuntimeState('openai_strict_live', memoryDir);
    const memoryManager = new MemoryManager({ store: new FileMemoryStore(memoryDir, 'openai_strict_live') });
    state.memoryManager = memoryManager;
    state.llmInstance = llm;
    state.toolInstances = { read_file: registerReadFileTool(), write_file: registerWriteFileTool() };
    const config = new AgentConfig(
      'OpenAIStrictLive',
      'assistant',
      'AC-010 live check',
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
      expect(await waitFor(() => context.currentStatus === AgentStatus.IDLE || context.currentStatus === AgentStatus.ERROR, 15000)).toBe(true);
      await runtime.submitEvent(new UserMessageReceivedEvent(new AgentInputUserMessage(prompt)));
      const settled = await waitFor(
        () => state.activeTurn === null && memoryManager.store.list(MemoryType.RAW_TRACE).some((item: any) => item.traceType === 'tool_call'),
        180000,
      );
      const calls = memoryManager.store
        .list(MemoryType.RAW_TRACE)
        .filter((item: any) => item.traceType === 'tool_call')
        .map((item: any) => ({ name: item.toolName as string, args: (item.toolArgs ?? {}) as Record<string, unknown> }));
      const results = memoryManager.store
        .list(MemoryType.RAW_TRACE)
        .filter((item: any) => item.traceType === 'tool_result')
        .map((item: any) => ({ name: item.toolName as string, error: item.toolError ?? null }));
      const answer = memoryManager
        .getWorkingContextMessages()
        .filter((message) => message.role === MessageRole.ASSISTANT)
        .map((message) => String(message.content ?? ''))
        .join('\n');
      // Optional record for the evidence log (this vitest config hides console output): tool names, arguments, errors
      // and the answer only; no key, no file bytes.
      const recordPath = process.env.OPENAI_STRICT_LIVE_RECORD?.trim();
      if (recordPath) fs.appendFileSync(recordPath, `${JSON.stringify({ model: modelName, prompt, calls, results, answer })}\n`);
      expect(settled, `the turn did not finish; status ${context.currentStatus}`).toBe(true);
      return { calls, results, answer };
    } finally {
      if (runtime.isRunning) await runtime.stop(5);
      await llm.cleanup();
    }
  };

  live.it('reads a synthesized image through read_file with only path and names its color', async () => {
    const imagePath = path.join(workspace, 'swatch.png');
    fs.writeFileSync(imagePath, solidPng(64, [220, 20, 20]));

    const { calls, results, answer } = await runTurn(
      `Look at the image ${imagePath} with the read_file tool and tell me its main color. Answer with one word.`,
    );

    const reads = calls.filter((call) => call.name === 'read_file');
    expect(reads.length).toBeGreaterThan(0);
    for (const read of reads) expect(Object.keys(read.args)).toEqual(['path']);
    expect(results.filter((result) => result.name === 'read_file' && result.error)).toEqual([]);
    expect(answer.toLowerCase()).toContain('red');
  }, 240000);

  live.it('calls write_file with an absolute path without inventing base_dir', async () => {
    const notePath = path.join(workspace, 'note.txt');

    const { calls } = await runTurn(
      `Use the write_file tool to create the file ${notePath} containing exactly the text: hello`,
    );

    const writes = calls.filter((call) => call.name === 'write_file');
    expect(writes.length).toBeGreaterThan(0);
    for (const write of writes) expect(Object.keys(write.args).sort()).toEqual(['content', 'path']);
    expect(fs.readFileSync(notePath, 'utf8').trim()).toBe('hello');
  }, 240000);
});
