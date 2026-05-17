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
import { OpenAILLM } from '../../../src/llm/api/openai-llm.js';
import { LLMModel } from '../../../src/llm/models.js';
import { LLMProvider } from '../../../src/llm/providers.js';
import { LLMConfig } from '../../../src/llm/utils/llm-config.js';
import { SkillRegistry } from '../../../src/skills/registry.js';
import { registerWriteFileTool } from '../../../src/tools/file/write-file.js';
import { skipIfProviderAccessError } from '../helpers/provider-access.js';

const apiKey = process.env.OPENAI_API_KEY;
const runIntegration = apiKey ? describe : describe.skip;

const DEFAULT_MODEL_ID = 'gpt-5.5';
const modelId = process.env.OPENAI_AGENT_FLOW_MODEL ?? DEFAULT_MODEL_ID;

const parseMs = (value: string | undefined, fallbackMs: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackMs;
};

const FLOW_TEST_TIMEOUT_MS = parseMs(process.env.OPENAI_AGENT_FLOW_TEST_TIMEOUT_MS, 180000);
const FILE_WAIT_TIMEOUT_MS = parseMs(process.env.OPENAI_AGENT_FILE_WAIT_TIMEOUT_MS, 120000);

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

const buildOpenAIFlowLLM = () =>
  new OpenAILLM(
    new LLMModel({
      name: modelId,
      value: modelId,
      canonicalName: modelId,
      provider: LLMProvider.OPENAI
    }),
    new LLMConfig({
      maxTokens: 800
    })
  );

runIntegration('OpenAI single-agent flow', () => {
  let tempDir: string;
  let originalParserEnv: string | undefined;

  beforeEach(async () => {
    originalParserEnv = process.env.AUTOBYTEUS_STREAM_PARSER;
    process.env.AUTOBYTEUS_STREAM_PARSER = 'api_tool_call';
    SkillRegistry.getInstance().clear();
    resetFactory();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openai-agent-flow-'));
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

  it('uses GPT-5.5 by default to execute a single-agent tool flow and complete the turn', async () => {
    const workspace = tempDir;
    const artifactPath = path.join(workspace, 'openai-agent-single-flow.md');
    const expectedSnippets = [
      'OpenAI Agent Single Flow',
      `model: ${modelId}`,
      'status: OPENAI_AGENT_SINGLE_FLOW_OK',
      'tool: write_file'
    ];

    const llm = buildOpenAIFlowLLM();
    const writeFileTool = registerWriteFileTool();
    const config = new AgentConfig(
      'OpenAISingleFlowAgent',
      'Integration test agent',
      'OpenAI GPT-5.5 single-agent tool-use flow validation.',
      llm,
      [
        'You are a precise integration-test agent.',
        'When the user asks you to create a file, you must use the available write_file tool.',
        'After the tool succeeds, provide one short final sentence.'
      ].join(' '),
      [writeFileTool],
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
            'Run this as a real tool-use flow, not as a chat-only answer.',
            `Workspace root: ${workspace}`,
            `Create the file exactly at: ${artifactPath}`,
            '',
            'Use the write_file tool exactly once. The markdown file must include these exact lines:',
            '# OpenAI Agent Single Flow',
            `model: ${modelId}`,
            'status: OPENAI_AGENT_SINGLE_FLOW_OK',
            'tool: write_file',
            '',
            'After the tool succeeds, reply with one short sentence that includes the file path.'
          ].join('\n')
        )
      );

      const fileCreated = await waitForFile(artifactPath, FILE_WAIT_TIMEOUT_MS, 250);
      expect(fileCreated).toBe(true);

      const completed = await waitForCondition(
        () => {
          const toolSucceededIndex = observedEvents.findIndex(
            (event) => event.type === EventType.AGENT_TOOL_EXECUTION_SUCCEEDED
          );
          const assistantCompleteAfterToolIndex = observedEvents.findIndex(
            (event, index) =>
              index > toolSucceededIndex && event.type === EventType.AGENT_DATA_ASSISTANT_COMPLETE_RESPONSE
          );
          const turnCompletedAfterAssistantIndex = observedEvents.findIndex(
            (event, index) =>
              index > assistantCompleteAfterToolIndex && event.type === EventType.AGENT_TURN_COMPLETED
          );

          return (
            toolSucceededIndex >= 0 &&
            assistantCompleteAfterToolIndex > toolSucceededIndex &&
            turnCompletedAfterAssistantIndex > assistantCompleteAfterToolIndex &&
            agent.context.currentStatus === AgentStatus.IDLE &&
            agent.context.state.activeTurn === null
          );
        },
        FILE_WAIT_TIMEOUT_MS,
        250
      );
      expect(completed).toBe(true);

      const fileContent = await fs.readFile(artifactPath, 'utf8');
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
      const finalContent = String(
        finalAssistantPayload?.payload?.content ?? finalAssistantPayload?.content ?? finalAssistantPayload ?? ''
      );
      expect(finalContent).toContain(artifactPath);
    } catch (error) {
      if (skipIfProviderAccessError('OpenAI', modelId, error)) {
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
