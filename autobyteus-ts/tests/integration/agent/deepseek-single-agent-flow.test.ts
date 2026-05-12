import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AgentFactory } from '../../../src/agent/factory/agent-factory.js';
import { AgentConfig } from '../../../src/agent/context/agent-config.js';
import { AgentStatus } from '../../../src/agent/status/status-enum.js';
import { AgentInputUserMessage } from '../../../src/agent/message/agent-input-user-message.js';
import { EventType } from '../../../src/events/event-types.js';
import { DeepSeekLLM } from '../../../src/llm/api/deepseek-llm.js';
import { LLMModel } from '../../../src/llm/models.js';
import { LLMProvider } from '../../../src/llm/providers.js';
import { LLMConfig } from '../../../src/llm/utils/llm-config.js';
import { SkillRegistry } from '../../../src/skills/registry.js';
import { registerWriteFileTool } from '../../../src/tools/file/write-file.js';
import { registerRunBashTool } from '../../../src/tools/terminal/tools/run-bash.js';
import { skipIfProviderAccessError } from '../helpers/provider-access.js';

const apiKey = process.env.DEEPSEEK_API_KEY;
const runIntegration = apiKey ? describe : describe.skip;

const parseMs = (value: string | undefined, fallbackMs: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackMs;
};

const FLOW_TEST_TIMEOUT_MS = parseMs(process.env.DEEPSEEK_AGENT_FLOW_TEST_TIMEOUT_MS, 180000);
const ARTIFACT_WAIT_TIMEOUT_MS = parseMs(process.env.DEEPSEEK_AGENT_ARTIFACT_WAIT_TIMEOUT_MS, 120000);

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForFile = async (filePath: string, timeoutMs = 5000, intervalMs = 100): Promise<boolean> => {
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
  intervalMs = 100
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

const waitForStatus = async (
  agentId: string,
  getStatus: () => AgentStatus,
  timeoutMs = 10000,
  intervalMs = 50
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

const buildDeepSeekFlash = () =>
  new DeepSeekLLM(
    new LLMModel({
      name: 'deepseek-v4-flash',
      value: 'deepseek-v4-flash',
      canonicalName: 'deepseek-v4-flash',
      provider: LLMProvider.DEEPSEEK
    }),
    new LLMConfig({
      temperature: 0,
      maxTokens: 700,
      extraParams: {
        reasoning_effort: 'high',
        extra_body: { thinking: { type: 'enabled' } }
      }
    })
  );

runIntegration('DeepSeek V4 Flash single-agent flow', () => {
  let tempDir: string;
  let originalParserEnv: string | undefined;

  beforeEach(async () => {
    originalParserEnv = process.env.AUTOBYTEUS_STREAM_PARSER;
    process.env.AUTOBYTEUS_STREAM_PARSER = 'api_tool_call';
    SkillRegistry.getInstance().clear();
    resetFactory();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'deepseek-agent-flow-'));
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

  it('uses tools to prepare a realistic release-readiness packet and complete the turn', async () => {
    const workspace = tempDir;
    const handoffPath = path.join(workspace, 'ops', 'handoff', 'checkout-api-release-readiness.md');
    const expectedSnippets = [
      'Checkout API Release Readiness',
      'payments-platform',
      '2026-05-12 09:00 Europe/Berlin',
      'inventory webhook replay',
      'pnpm --filter checkout-api test:smoke',
      'disable checkout-api-v2 route flag'
    ];

    const llm = buildDeepSeekFlash();
    const writeFileTool = registerWriteFileTool();
    const runBashTool = registerRunBashTool();
    const config = new AgentConfig(
      'DeepSeekReleaseReadinessAgent',
      'Release operations engineer',
      'DeepSeek V4 Flash end-to-end agent flow with realistic tool use and continuation.',
      llm,
      [
        'You are a careful release operations engineer.',
        'Use provider-native tool calls when you need to create or verify files.',
        'Do not claim the handoff is complete until you have used tools to create and verify the requested artifact.'
      ].join(' '),
      [writeFileTool, runBashTool],
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
    const record = (type: EventType) => (payload?: unknown) => {
      observedEvents.push({ type, payload });
    };
    const onToolSucceeded = record(EventType.AGENT_TOOL_EXECUTION_SUCCEEDED);
    const onToolFailed = record(EventType.AGENT_TOOL_EXECUTION_FAILED);
    const onAssistantComplete = record(EventType.AGENT_DATA_ASSISTANT_COMPLETE_RESPONSE);
    const onTurnCompleted = record(EventType.AGENT_TURN_COMPLETED);
    const onError = record(EventType.AGENT_ERROR_OUTPUT_GENERATION);

    notifier?.subscribe(EventType.AGENT_TOOL_EXECUTION_SUCCEEDED, onToolSucceeded);
    notifier?.subscribe(EventType.AGENT_TOOL_EXECUTION_FAILED, onToolFailed);
    notifier?.subscribe(EventType.AGENT_DATA_ASSISTANT_COMPLETE_RESPONSE, onAssistantComplete);
    notifier?.subscribe(EventType.AGENT_TURN_COMPLETED, onTurnCompleted);
    notifier?.subscribe(EventType.AGENT_ERROR_OUTPUT_GENERATION, onError);

    try {
      agent.start();
      const ready = await waitForStatus(agent.agentId, () => agent.context.currentStatus);
      expect(ready).toBe(true);
      expect(agent.context.currentStatus).toBe(AgentStatus.IDLE);

      await agent.postUserMessage(
        new AgentInputUserMessage(
          [
            'We are staging a checkout-api release and need a durable handoff packet, not a chat-only answer.',
            `Workspace root: ${workspace}`,
            `Create the file exactly at: ${handoffPath}`,
            '',
            'Use tools to write the file. The packet must be concise markdown and include all of these exact operational facts:',
            '- title: Checkout API Release Readiness',
            '- owner: payments-platform',
            '- deploy window: 2026-05-12 09:00 Europe/Berlin',
            '- risk: inventory webhook replay',
            '- smoke: pnpm --filter checkout-api test:smoke',
            '- rollback: disable checkout-api-v2 route flag',
            '',
            'After writing it, use a tool to verify the file exists and includes the required facts. Then provide one short final sentence naming the file path.'
          ].join('\n')
        )
      );

      const fileCreated = await waitForFile(handoffPath, ARTIFACT_WAIT_TIMEOUT_MS, 250);
      expect(fileCreated).toBe(true);

      const completed = await waitForCondition(
        () => {
          const toolSucceededCount = observedEvents.filter(
            (event) => event.type === EventType.AGENT_TOOL_EXECUTION_SUCCEEDED
          ).length;
          const turnCompletedIndex = observedEvents.findIndex(
            (event) => event.type === EventType.AGENT_TURN_COMPLETED
          );
          return (
            toolSucceededCount >= 1 &&
            turnCompletedIndex >= 0 &&
            agent.context.currentStatus === AgentStatus.IDLE &&
            agent.context.state.activeTurn === null
          );
        },
        ARTIFACT_WAIT_TIMEOUT_MS,
        250
      );
      expect(completed).toBe(true);

      const fileContent = await fs.readFile(handoffPath, 'utf8');
      for (const snippet of expectedSnippets) {
        expect(fileContent).toContain(snippet);
      }

      const toolFailures = observedEvents.filter((event) => event.type === EventType.AGENT_TOOL_EXECUTION_FAILED);
      const generationErrors = observedEvents.filter((event) => event.type === EventType.AGENT_ERROR_OUTPUT_GENERATION);
      expect(toolFailures).toHaveLength(0);
      expect(generationErrors).toHaveLength(0);

      const assistantResponses = observedEvents.filter(
        (event) => event.type === EventType.AGENT_DATA_ASSISTANT_COMPLETE_RESPONSE
      );
      expect(assistantResponses.length).toBeGreaterThan(0);
      const finalAssistantPayload = assistantResponses.at(-1)?.payload as any;
      const finalContent = String(finalAssistantPayload?.payload?.content ?? finalAssistantPayload?.content ?? finalAssistantPayload ?? '');
      expect(finalContent).toContain(handoffPath);
    } catch (error) {
      if (skipIfProviderAccessError('DeepSeek', 'deepseek-v4-flash', error)) {
        return;
      }
      throw error;
    } finally {
      notifier?.unsubscribe(EventType.AGENT_TOOL_EXECUTION_SUCCEEDED, onToolSucceeded);
      notifier?.unsubscribe(EventType.AGENT_TOOL_EXECUTION_FAILED, onToolFailed);
      notifier?.unsubscribe(EventType.AGENT_DATA_ASSISTANT_COMPLETE_RESPONSE, onAssistantComplete);
      notifier?.unsubscribe(EventType.AGENT_TURN_COMPLETED, onTurnCompleted);
      notifier?.unsubscribe(EventType.AGENT_ERROR_OUTPUT_GENERATION, onError);
      if (agent.isRunning) {
        await agent.stop(20);
      }
      await llm.cleanup();
    }
  }, FLOW_TEST_TIMEOUT_MS);
});
