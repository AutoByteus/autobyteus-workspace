import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AgentFactory } from '../../../src/agent/factory/agent-factory.js';
import { AgentConfig } from '../../../src/agent/context/agent-config.js';
import { AgentInputUserMessage } from '../../../src/agent/message/agent-input-user-message.js';
import { AgentStatus } from '../../../src/agent/status/status-enum.js';
import { BaseLLM } from '../../../src/llm/base.js';
import { LLMModel } from '../../../src/llm/models.js';
import { LLMProvider } from '../../../src/llm/providers.js';
import { LLMRuntime } from '../../../src/llm/runtimes.js';
import { LLMConfig } from '../../../src/llm/utils/llm-config.js';
import { CompleteResponse, ChunkResponse } from '../../../src/llm/utils/response-types.js';
import { Message, MessageRole } from '../../../src/llm/utils/messages.js';
import { WorkingContext } from '../../../src/memory/working-context.js';
import { WorkingContextSnapshotSerializer } from '../../../src/memory/working-context-snapshot-serializer.js';
import { WorkingContextSnapshotStore } from '../../../src/memory/store/working-context-snapshot-store.js';

class DummyLLM extends BaseLLM {
  protected async _sendMessagesToLLM(_messages: Message[]): Promise<CompleteResponse> {
    return new CompleteResponse({ content: 'ok' });
  }

  protected async *_streamMessagesToLLM(
    _messages: Message[],
    _kwargs: Record<string, unknown>
  ): AsyncGenerator<ChunkResponse, void, unknown> {
    yield new ChunkResponse({ content: 'ok', is_complete: true });
  }
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForStatus = async (
  agentId: string,
  getStatus: () => AgentStatus,
  timeoutMs = 5000,
  intervalMs = 25
): Promise<boolean> => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const status = getStatus();
    if (status === AgentStatus.IDLE || status === AgentStatus.ERROR) {
      return true;
    }
    await delay(intervalMs);
  }
  console.warn(`Agent '${agentId}' did not reach IDLE/ERROR within ${timeoutMs}ms.`);
  return false;
};

const waitForSnapshotMessage = async (
  snapshotStore: WorkingContextSnapshotStore,
  agentId: string,
  expectedContent: string,
  timeoutMs = 5000,
): Promise<Record<string, unknown>> => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const payload = snapshotStore.read(agentId) as Record<string, unknown> | null;
    const messages = Array.isArray(payload?.messages)
      ? payload.messages as Array<Record<string, unknown>>
      : [];
    if (messages.some((message) => message.content === expectedContent)) {
      return payload!;
    }
    await delay(25);
  }
  throw new Error(`Snapshot for '${agentId}' did not persist '${expectedContent}' within ${timeoutMs}ms.`);
};

const resetFactory = () => {
  (AgentFactory as any).instance = undefined;
};

describe('Working context snapshot restore flow (agent)', () => {
  let tempDir: string;

  beforeEach(async () => {
    resetFactory();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'autobyteus-restore-'));
  });

  afterEach(async () => {
    resetFactory();
    if (tempDir && fsSync.existsSync(tempDir)) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it('loads a schema-v4 superset during bootstrap and contracts it on the next ordinary write', async () => {
    const agentId = 'agent_restore';

    const snapshot = new WorkingContext();
    snapshot.appendMessage(new Message(MessageRole.SYSTEM, { content: 'System' }));
    snapshot.appendMessage(new Message(MessageRole.USER, { content: 'Hello' }));

    const payload = {
      ...WorkingContextSnapshotSerializer.serialize(snapshot, {
      schema_version: WorkingContextSnapshotSerializer.CURRENT_SCHEMA_VERSION,
      agent_id: agentId
      }),
      epoch_id: 19,
      last_compaction_ts: 123.5,
    };

    const snapshotStore = new WorkingContextSnapshotStore(tempDir, agentId);
    snapshotStore.write(agentId, payload);

    const model = new LLMModel({
      name: 'dummy',
      value: 'dummy',
      canonicalName: 'dummy',
      provider: LLMProvider.OPENAI,
      llmClass: DummyLLM,
      runtime: LLMRuntime.API
    });
    const llm = new DummyLLM(model, new LLMConfig());

    const config = new AgentConfig('RestoreAgent', 'tester', 'restore flow', llm);

    const factory = new AgentFactory();
    const agent = factory.restoreAgent(agentId, config, path.join(tempDir, 'agents', agentId));
    agent.start();

    const ready = await waitForStatus(agent.agentId, () => agent.context.currentStatus);
    expect(ready).toBe(true);
    expect(agent.context.currentStatus).toBe(AgentStatus.IDLE);

    const messages = agent.context.state.memoryManager?.getWorkingContextMessages() ?? [];
    expect(messages.map((message) => message.role)).toEqual([MessageRole.SYSTEM, MessageRole.USER]);
    expect(messages[1]?.content).toBe('Hello');

    await agent.postUserMessage(new AgentInputUserMessage('Continue after restore.'));
    const contractedPayload = await waitForSnapshotMessage(
      snapshotStore,
      agentId,
      'Continue after restore.',
    );
    expect(contractedPayload).not.toHaveProperty('epoch_id');
    expect(contractedPayload).not.toHaveProperty('last_compaction_ts');
    const { workingContext: contractedContext } = WorkingContextSnapshotSerializer.deserialize(
      contractedPayload,
    );
    expect(contractedContext.buildMessages().map((message) => message.content)).toEqual(
      expect.arrayContaining(['System', 'Hello', 'Continue after restore.']),
    );

    await agent.stop();
  });
});
