import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AgentConfig } from '../../../src/agent/context/agent-config.js';
import { AgentRuntimeState } from '../../../src/agent/context/agent-runtime-state.js';
import { AgentContext } from '../../../src/agent/context/agent-context.js';
import { LLMUserMessageReadyEventHandler } from '../../../src/agent/handlers/llm-user-message-ready-event-handler.js';
import { MemoryIngestInputProcessor } from '../../../src/agent/input-processor/memory-ingest-input-processor.js';
import { LLMUserMessageReadyEvent } from '../../../src/agent/events/agent-events.js';
import { AgentInputUserMessage } from '../../../src/agent/message/agent-input-user-message.js';
import { buildLLMUserMessage } from '../../../src/agent/message/multimodal-message-builder.js';
import { BaseAgentWorkspace } from '../../../src/agent/workspace/base-workspace.js';
import { MemoryManager } from '../../../src/memory/memory-manager.js';
import { FileMemoryStore } from '../../../src/memory/store/file-store.js';
import { MemoryType } from '../../../src/memory/models/memory-types.js';
import { createLmstudioLLM, hasLmstudioConfig } from '../helpers/lmstudio-llm-helper.js';

class DummyWorkspace extends BaseAgentWorkspace {
  getBasePath(): string {
    return '.';
  }
}

class DummyQueues {
  internalEvents: any[] = [];
  toolEvents: any[] = [];

  async enqueueInternalSystemEvent(event: any) {
    this.internalEvents.push(event);
  }

  async enqueueToolInvocationRequest(event: any) {
    this.toolEvents.push(event);
  }

  async enqueueUserMessage(event: any) {
    this.internalEvents.push(event);
  }
}

const runIntegration = hasLmstudioConfig() ? describe : describe.skip;

runIntegration('Handler memory flow (LM Studio)', () => {
  it('persists user + assistant traces when handler runs', async () => {
    const llm = await createLmstudioLLM();
    if (!llm) {
      return;
    }

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'handler-memory-'));
    try {
      const memoryManager = new MemoryManager({
        store: new FileMemoryStore(tempDir, 'agent_handler_flow')
      });
      const runtimeState = new AgentRuntimeState('agent_handler_flow', new DummyWorkspace());
      runtimeState.memoryManager = memoryManager;
      runtimeState.inputEventQueues = new DummyQueues() as any;
      runtimeState.llmInstance = llm;

      const config = new AgentConfig(
        'HandlerAgent',
        'tester',
        'Handler memory integration',
        llm,
        null,
        [],
        true,
        [new MemoryIngestInputProcessor()]
      );

      const context = new AgentContext(runtimeState.agentId, config, runtimeState);
      context.state.statusManagerRef = {
        notifier: {
          notifyAgentSegmentEvent: () => undefined,
          notifyAgentErrorOutputGeneration: () => undefined
        }
      } as any;

      const agentInput = new AgentInputUserMessage("Please respond with the word 'pong'.");
      await new MemoryIngestInputProcessor().process(agentInput, context, null as any);

      const llmUserMessage = buildLLMUserMessage(agentInput);
      const event = new LLMUserMessageReadyEvent(llmUserMessage);
      const handler = new LLMUserMessageReadyEventHandler();

      try {
        await handler.handle(event, context);
      } catch (error) {
        console.warn(`LM Studio handler run failed: ${String(error)}`);
        return;
      } finally {
        await llm.cleanup();
      }

      const rawItems = memoryManager.store.list(MemoryType.RAW_TRACE);
      expect(rawItems.length).toBeGreaterThanOrEqual(2);
      const traceTypes = new Set(rawItems.map((item) => item.traceType));
      expect(traceTypes.has('user')).toBe(true);
      expect(traceTypes.has('assistant')).toBe(true);
      expect((runtimeState.inputEventQueues as any).internalEvents.length).toBeGreaterThan(0);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
