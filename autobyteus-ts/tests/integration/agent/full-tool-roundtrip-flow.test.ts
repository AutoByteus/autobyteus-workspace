import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AgentConfig } from '../../../src/agent/context/agent-config.js';
import { AgentRuntimeState } from '../../../src/agent/context/agent-runtime-state.js';
import { AgentContext } from '../../../src/agent/context/agent-context.js';
import { LLMUserMessageReadyEventHandler } from '../../../src/agent/handlers/llm-user-message-ready-event-handler.js';
import { ToolInvocationRequestEventHandler } from '../../../src/agent/handlers/tool-invocation-request-event-handler.js';
import { ToolResultEventHandler } from '../../../src/agent/handlers/tool-result-event-handler.js';
import { MemoryIngestInputProcessor } from '../../../src/agent/input-processor/memory-ingest-input-processor.js';
import { MemoryIngestToolResultProcessor } from '../../../src/agent/tool-execution-result-processor/memory-ingest-tool-result-processor.js';
import {
  LLMUserMessageReadyEvent,
  PendingToolInvocationEvent,
  ToolResultEvent,
  UserMessageReceivedEvent
} from '../../../src/agent/events/agent-events.js';
import { AgentInputUserMessage } from '../../../src/agent/message/agent-input-user-message.js';
import { buildLLMUserMessage } from '../../../src/agent/message/multimodal-message-builder.js';
import { BaseAgentWorkspace } from '../../../src/agent/workspace/base-workspace.js';
import { MemoryManager } from '../../../src/memory/memory-manager.js';
import { FileMemoryStore } from '../../../src/memory/store/file-store.js';
import { MemoryType } from '../../../src/memory/models/memory-types.js';
import { registerWriteFileTool } from '../../../src/tools/file/write-file.js';
import { createLmstudioLLM, hasLmstudioConfig } from '../helpers/lmstudio-llm-helper.js';

class DummyWorkspace extends BaseAgentWorkspace {
  private basePath: string;

  constructor(basePath: string) {
    super();
    this.basePath = basePath;
  }

  getBasePath(): string {
    return this.basePath;
  }
}

class DummyQueues {
  internalEvents: any[] = [];
  toolInvocationEvents: any[] = [];
  toolResultEvents: any[] = [];
  userMessageEvents: any[] = [];

  async enqueueInternalSystemEvent(event: any) {
    this.internalEvents.push(event);
  }

  async enqueueToolInvocationRequest(event: any) {
    this.toolInvocationEvents.push(event);
  }

  async enqueueToolResult(event: any) {
    this.toolResultEvents.push(event);
  }

  async enqueueUserMessage(event: any) {
    this.userMessageEvents.push(event);
  }
}

const runIntegration = hasLmstudioConfig() ? describe : describe.skip;

runIntegration('Full tool roundtrip flow (LM Studio)', () => {
  it('executes tool calls and records memory traces', async () => {
    process.env.AUTOBYTEUS_STREAM_PARSER = 'api_tool_call';

    const llm = await createLmstudioLLM({ requireToolChoice: true });
    if (!llm) {
      return;
    }

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'full-tool-roundtrip-'));
    try {
      const memoryManager = new MemoryManager({
        store: new FileMemoryStore(tempDir, 'agent_full_tool')
      });
      const workspace = new DummyWorkspace(tempDir);
      const runtimeState = new AgentRuntimeState('agent_full_tool', workspace);
      runtimeState.memoryManager = memoryManager;
      runtimeState.inputEventQueues = new DummyQueues() as any;
      runtimeState.llmInstance = llm;

      const writeFileTool = registerWriteFileTool();
      runtimeState.toolInstances = { write_file: writeFileTool };

      const config = new AgentConfig(
        'FullToolAgent',
        'tester',
        'Full tool roundtrip',
        llm,
        null,
        [writeFileTool],
        true,
        [new MemoryIngestInputProcessor()],
        null,
        null,
        [new MemoryIngestToolResultProcessor()]
      );

      const context = new AgentContext(runtimeState.agentId, config, runtimeState);
      context.state.statusManagerRef = {
        notifier: {
          notifyAgentSegmentEvent: () => undefined,
          notifyAgentErrorOutputGeneration: () => undefined,
          notifyAgentDataToolLog: () => undefined,
          notifyAgentRequestToolInvocationApproval: () => undefined,
          notifyAgentToolInvocationAutoExecuting: () => undefined
        }
      } as any;

      const agentInput = new AgentInputUserMessage(
        "Please write a python file named 'hello.py' that prints 'Hello'."
      );
      await new MemoryIngestInputProcessor().process(agentInput, context, null as any);
      const llmUserMessage = buildLLMUserMessage(agentInput);
      const llmEvent = new LLMUserMessageReadyEvent(llmUserMessage);

      const handler = new LLMUserMessageReadyEventHandler();
      try {
        await handler.handle(llmEvent, context);
      } catch (error) {
        console.warn(`LM Studio handler failed: ${String(error)}`);
        return;
      }

      if (!(runtimeState.inputEventQueues as any).toolInvocationEvents.length) {
        console.warn('Model did not emit tool calls.');
        return;
      }

      const toolInvocationHandler = new ToolInvocationRequestEventHandler();
      for (const event of (runtimeState.inputEventQueues as any).toolInvocationEvents) {
        expect(event).toBeInstanceOf(PendingToolInvocationEvent);
        await toolInvocationHandler.handle(event, context);
      }

      expect((runtimeState.inputEventQueues as any).toolResultEvents.length).toBeGreaterThan(0);

      const toolResultHandler = new ToolResultEventHandler();
      for (const event of (runtimeState.inputEventQueues as any).toolResultEvents) {
        expect(event).toBeInstanceOf(ToolResultEvent);
        await toolResultHandler.handle(event, context);
      }

      expect((runtimeState.inputEventQueues as any).userMessageEvents.length).toBeGreaterThan(0);

      const followEvent = (runtimeState.inputEventQueues as any).userMessageEvents.at(-1) as UserMessageReceivedEvent;
      expect(followEvent).toBeInstanceOf(UserMessageReceivedEvent);

      await new MemoryIngestInputProcessor().process(followEvent.agentInputUserMessage, context, null as any);
      const followMessage = buildLLMUserMessage(followEvent.agentInputUserMessage);
      const followEventMessage = new LLMUserMessageReadyEvent(followMessage);

      try {
        await handler.handle(followEventMessage, context);
      } catch (error) {
        console.warn(`LM Studio follow-up failed: ${String(error)}`);
        return;
      } finally {
        await llm.cleanup();
      }

      const rawItems = memoryManager.store.list(MemoryType.RAW_TRACE);
      const traceTypes = new Set(rawItems.map((item) => item.traceType));
      expect(traceTypes.has('tool_call')).toBe(true);
      expect(traceTypes.has('tool_result')).toBe(true);
      expect(traceTypes.has('assistant')).toBe(true);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
      delete process.env.AUTOBYTEUS_STREAM_PARSER;
    }
  });
});
