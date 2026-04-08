import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AgentFactory } from '../../../src/agent/factory/agent-factory.js';
import { AgentConfig } from '../../../src/agent/context/agent-config.js';
import { AgentStatus } from '../../../src/agent/status/status-enum.js';
import { AgentInputUserMessage } from '../../../src/agent/message/agent-input-user-message.js';
import { registerWriteFileTool } from '../../../src/tools/file/write-file.js';
import { SkillRegistry } from '../../../src/skills/registry.js';
import { EventType } from '../../../src/events/event-types.js';
import { createLmstudioLLM, hasLmstudioConfig } from '../helpers/lmstudio-llm-helper.js';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const parseMs = (value: string | undefined, fallbackMs: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackMs;
};

const FLOW_TEST_TIMEOUT_MS = parseMs(process.env.LMSTUDIO_FLOW_TEST_TIMEOUT_MS, 180000);
const FILE_WAIT_TIMEOUT_MS = parseMs(process.env.LMSTUDIO_FILE_WAIT_TIMEOUT_MS, 120000);

const waitForFile = async (filePath: string, timeoutMs = 5000, intervalMs = 50): Promise<boolean> => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (fsSync.existsSync(filePath)) {
      return true;
    }
    await delay(intervalMs);
  }
  return false;
};

const waitForCondition = async (
  predicate: () => boolean,
  timeoutMs = 8000,
  intervalMs = 25
): Promise<boolean> => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate()) {
      return true;
    }
    await delay(intervalMs);
  }
  return false;
};

const findFileContainingContent = async (rootDir: string, content: string): Promise<string | null> => {
  const queue: string[] = [rootDir];
  while (queue.length) {
    const currentDir = queue.shift();
    if (!currentDir) {
      continue;
    }

    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const candidatePath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        queue.push(candidatePath);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }

      const candidateContent = await fs.readFile(candidatePath, 'utf8');
      if (candidateContent.trim() === content) {
        return candidatePath;
      }
    }
  }
  return null;
};

const waitForStatus = async (
  agentId: string,
  getStatus: () => AgentStatus,
  timeoutMs = 8000,
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

const resetFactory = () => {
  (AgentFactory as any).instance = undefined;
};

const runIntegration = hasLmstudioConfig() ? describe : describe.skip;

runIntegration('Agent single-flow integration (LM Studio)', () => {
  let tempDir: string;
  let originalParserEnv: string | undefined;

  beforeEach(async () => {
    originalParserEnv = process.env.AUTOBYTEUS_STREAM_PARSER;
    process.env.AUTOBYTEUS_STREAM_PARSER = 'api_tool_call';
    SkillRegistry.getInstance().clear();
    resetFactory();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'autobyteus-agent-'));
  });

  afterEach(async () => {
    if (originalParserEnv === undefined) {
      delete process.env.AUTOBYTEUS_STREAM_PARSER;
    } else {
      process.env.AUTOBYTEUS_STREAM_PARSER = originalParserEnv;
    }
    SkillRegistry.getInstance().clear();
    resetFactory();
    await fs.rm(tempDir, { recursive: true, force: true });
  }, FLOW_TEST_TIMEOUT_MS);

  it('executes a tool call end-to-end for a single agent', async () => {
    const workspace = tempDir;
    const tool = registerWriteFileTool();
    const toolArgs = { path: path.join(workspace, 'poem.txt'), content: 'Roses are red.' };

    const llm = await createLmstudioLLM({ requireToolChoice: true });
    if (!llm) return;

    const config = new AgentConfig(
      'SingleAgent',
      'Tester',
      'Single agent end-to-end flow',
      llm,
      null,
      [tool],
      true,
      null,
      null,
      null,
      null,
      null,
      workspace
    );

    const factory = new AgentFactory();
    const agent = factory.createAgent(config);
    const observedEvents: Array<{ type: EventType; payload: unknown }> = [];
    const notifier = agent.context.statusManager?.notifier ?? null;
    const toolSucceededListener = (payload?: unknown) => {
      observedEvents.push({ type: EventType.AGENT_TOOL_EXECUTION_SUCCEEDED, payload });
    };
    const assistantCompleteListener = (payload?: unknown) => {
      observedEvents.push({ type: EventType.AGENT_DATA_ASSISTANT_COMPLETE_RESPONSE, payload });
    };
    const turnCompletedListener = (payload?: unknown) => {
      observedEvents.push({ type: EventType.AGENT_TURN_COMPLETED, payload });
    };

    notifier?.subscribe(EventType.AGENT_TOOL_EXECUTION_SUCCEEDED, toolSucceededListener);
    notifier?.subscribe(EventType.AGENT_DATA_ASSISTANT_COMPLETE_RESPONSE, assistantCompleteListener);
    notifier?.subscribe(EventType.AGENT_TURN_COMPLETED, turnCompletedListener);

    try {
      agent.start();
      const ready = await waitForStatus(agent.agentId, () => agent.context.currentStatus);
      expect(ready).toBe(true);

      await agent.postUserMessage(
        new AgentInputUserMessage(
          `Call write_file exactly once with arguments {"path":"${toolArgs.path}","content":"${toolArgs.content}"}. ` +
            'Use the provided absolute path exactly and do not respond with plain text.'
        )
      );

      let filePath = toolArgs.path;
      const created = await waitForFile(filePath, FILE_WAIT_TIMEOUT_MS, 100);
      if (!created) {
        const discoveredPath = await findFileContainingContent(tempDir, toolArgs.content);
        expect(discoveredPath).not.toBeNull();
        filePath = discoveredPath as string;
      }

      const content = await fs.readFile(filePath, 'utf8');
      expect(content).toBe(toolArgs.content);

      const completed = await waitForCondition(
        () => {
          const toolSucceededIndex = observedEvents.findIndex(
            (event) => event.type === EventType.AGENT_TOOL_EXECUTION_SUCCEEDED
          );
          if (toolSucceededIndex < 0) {
            return false;
          }

          const assistantCompleteAfterToolIndex = observedEvents.findIndex(
            (event, index) =>
              index > toolSucceededIndex && event.type === EventType.AGENT_DATA_ASSISTANT_COMPLETE_RESPONSE
          );
          if (assistantCompleteAfterToolIndex < 0) {
            return false;
          }

          const turnCompletedAfterAssistantIndex = observedEvents.findIndex(
            (event, index) => index > assistantCompleteAfterToolIndex && event.type === EventType.AGENT_TURN_COMPLETED
          );

          return (
            turnCompletedAfterAssistantIndex >= 0 &&
            agent.context.currentStatus === AgentStatus.IDLE &&
            agent.context.state.activeTurn === null
          );
        },
        FILE_WAIT_TIMEOUT_MS,
        100
      );
      expect(completed).toBe(true);

      const toolSucceededIndex = observedEvents.findIndex(
        (event) => event.type === EventType.AGENT_TOOL_EXECUTION_SUCCEEDED
      );
      const assistantCompleteAfterToolIndex = observedEvents.findIndex(
        (event, index) =>
          index > toolSucceededIndex && event.type === EventType.AGENT_DATA_ASSISTANT_COMPLETE_RESPONSE
      );
      const turnCompletedAfterAssistantIndex = observedEvents.findIndex(
        (event, index) => index > assistantCompleteAfterToolIndex && event.type === EventType.AGENT_TURN_COMPLETED
      );

      expect(toolSucceededIndex).toBeGreaterThanOrEqual(0);
      expect(assistantCompleteAfterToolIndex).toBeGreaterThan(toolSucceededIndex);
      expect(turnCompletedAfterAssistantIndex).toBeGreaterThan(assistantCompleteAfterToolIndex);
    } finally {
      notifier?.unsubscribe(EventType.AGENT_TOOL_EXECUTION_SUCCEEDED, toolSucceededListener);
      notifier?.unsubscribe(EventType.AGENT_DATA_ASSISTANT_COMPLETE_RESPONSE, assistantCompleteListener);
      notifier?.unsubscribe(EventType.AGENT_TURN_COMPLETED, turnCompletedListener);
      if (agent.isRunning) {
        await agent.stop(20);
      }
      await llm.cleanup();
    }
  }, FLOW_TEST_TIMEOUT_MS);
});
