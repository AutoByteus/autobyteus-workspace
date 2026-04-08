import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AgentTeamBuilder } from '../../../src/agent-team/agent-team-builder.js';
import { AgentConfig } from '../../../src/agent/context/agent-config.js';
import { AgentInputUserMessage } from '../../../src/agent/message/agent-input-user-message.js';
import { registerWriteFileTool } from '../../../src/tools/file/write-file.js';
import { SkillRegistry } from '../../../src/skills/registry.js';
import { waitForTeamToBeIdle } from '../../../src/agent-team/utils/wait-for-idle.js';
import { AgentFactory } from '../../../src/agent/factory/agent-factory.js';
import { AgentTeamFactory } from '../../../src/agent-team/factory/agent-team-factory.js';
import type { AgentTeam } from '../../../src/agent-team/agent-team.js';
import { EventType } from '../../../src/events/event-types.js';
import { StreamEventType } from '../../../src/agent/streaming/stream-events.js';
import { createLmstudioLLM, hasLmstudioConfig } from '../helpers/lmstudio-llm-helper.js';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const parseMs = (value: string | undefined, fallbackMs: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackMs;
};

const FLOW_TEST_TIMEOUT_MS = parseMs(process.env.LMSTUDIO_FLOW_TEST_TIMEOUT_MS, 180000);
const FILE_WAIT_TIMEOUT_MS = parseMs(process.env.LMSTUDIO_FILE_WAIT_TIMEOUT_MS, 120000);

const waitForFile = async (filePath: string, timeoutMs = 20000, intervalMs = 100): Promise<boolean> => {
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

const resetFactories = () => {
  (AgentFactory as any).instance = undefined;
  (AgentTeamFactory as any).instance = undefined;
};

const runIntegration = hasLmstudioConfig() ? describe : describe.skip;

runIntegration('Agent team integration (LM Studio, api_tool_call)', () => {
  let tempDirCoordinator: string;
  let tempDirWorker: string;
  let originalParserEnv: string | undefined;
  let team: AgentTeam | null = null;
  let coordinatorLlm: any = null;
  let workerLlm: any = null;

  beforeEach(async () => {
    originalParserEnv = process.env.AUTOBYTEUS_STREAM_PARSER;
    process.env.AUTOBYTEUS_STREAM_PARSER = 'api_tool_call';
    SkillRegistry.getInstance().clear();
    resetFactories();
    tempDirCoordinator = await fs.mkdtemp(path.join(os.tmpdir(), 'autobyteus-team-coordinator-'));
    tempDirWorker = await fs.mkdtemp(path.join(os.tmpdir(), 'autobyteus-team-worker-'));
  });

  afterEach(async () => {
    if (team) {
      await team.stop(30.0);
      team = null;
    }
    if (coordinatorLlm) {
      await coordinatorLlm.cleanup();
      coordinatorLlm = null;
    }
    if (workerLlm) {
      await workerLlm.cleanup();
      workerLlm = null;
    }
    if (originalParserEnv === undefined) {
      delete process.env.AUTOBYTEUS_STREAM_PARSER;
    } else {
      process.env.AUTOBYTEUS_STREAM_PARSER = originalParserEnv;
    }
    SkillRegistry.getInstance().clear();
    resetFactories();
    await fs.rm(tempDirCoordinator, { recursive: true, force: true });
    await fs.rm(tempDirWorker, { recursive: true, force: true });
  }, FLOW_TEST_TIMEOUT_MS);

  it('routes a message to a worker and executes a tool call', async () => {
    const tool = registerWriteFileTool();
    const toolArgs = { path: path.join(tempDirWorker, 'team_output.txt'), content: 'Team worker output.' };

    coordinatorLlm = await createLmstudioLLM({ requireToolChoice: true });
    if (!coordinatorLlm) return;
    workerLlm = await createLmstudioLLM({ requireToolChoice: true });
    if (!workerLlm) return;

    const coordinatorConfig = new AgentConfig(
      'Coordinator',
      'Coordinator',
      'Team coordinator',
      coordinatorLlm,
      null,
      [tool],
      true,
      null,
      null,
      null,
      null,
      null,
      tempDirCoordinator
    );

    const workerConfig = new AgentConfig(
      'Worker',
      'Worker',
      'Team worker',
      workerLlm,
      null,
      [tool],
      true,
      null,
      null,
      null,
      null,
      null,
      tempDirWorker
    );

    const builder = new AgentTeamBuilder('IntegrationTeam', 'Agent team integration test');
    builder.setCoordinator(coordinatorConfig);
    builder.addAgentNode(workerConfig);
    team = builder.build();
    const workerEvents: Array<{ type: StreamEventType; payload: unknown }> = [];
    const teamStreamListener = (payload?: unknown) => {
      const teamEvent = payload as {
        event_source_type?: string;
        data?: { agent_name?: string; agent_event?: { event_type?: StreamEventType; data?: unknown } };
      };
      if (teamEvent?.event_source_type !== 'AGENT') {
        return;
      }
      if (teamEvent.data?.agent_name !== 'Worker') {
        return;
      }
      const agentEventType = teamEvent.data?.agent_event?.event_type;
      if (!agentEventType) {
        return;
      }
      workerEvents.push({
        type: agentEventType,
        payload: teamEvent.data?.agent_event?.data
      });
    };

    team.notifier.subscribe(EventType.TEAM_STREAM_EVENT, teamStreamListener);

    try {
      team.start();
      await waitForTeamToBeIdle(team, 60.0);

      await team.postMessage(
        new AgentInputUserMessage(
          `Call write_file exactly once with arguments {"path":"${toolArgs.path}","content":"${toolArgs.content}"}. ` +
            'Use the provided absolute path exactly and do not respond with plain text.'
        ),
        'Worker'
      );

      let filePath = toolArgs.path;
      const created = await waitForFile(filePath, FILE_WAIT_TIMEOUT_MS, 100);
      if (!created) {
        const discoveredPath = await findFileContainingContent(tempDirWorker, toolArgs.content);
        expect(discoveredPath).not.toBeNull();
        filePath = discoveredPath as string;
      }

      const content = await fs.readFile(filePath, 'utf8');
      expect(content.trim()).toBe(toolArgs.content);

      const completed = await waitForCondition(
        () => {
          const toolSucceededIndex = workerEvents.findIndex(
            (event) => event.type === StreamEventType.TOOL_EXECUTION_SUCCEEDED
          );
          if (toolSucceededIndex < 0) {
            return false;
          }

          const assistantCompleteAfterToolIndex = workerEvents.findIndex(
            (event, index) =>
              index > toolSucceededIndex && event.type === StreamEventType.ASSISTANT_COMPLETE_RESPONSE
          );
          if (assistantCompleteAfterToolIndex < 0) {
            return false;
          }

          const turnCompletedAfterAssistantIndex = workerEvents.findIndex(
            (event, index) => index > assistantCompleteAfterToolIndex && event.type === StreamEventType.TURN_COMPLETED
          );

          return turnCompletedAfterAssistantIndex >= 0;
        },
        FILE_WAIT_TIMEOUT_MS,
        100
      );
      expect(completed).toBe(true);

      const toolSucceededIndex = workerEvents.findIndex(
        (event) => event.type === StreamEventType.TOOL_EXECUTION_SUCCEEDED
      );
      const assistantCompleteAfterToolIndex = workerEvents.findIndex(
        (event, index) =>
          index > toolSucceededIndex && event.type === StreamEventType.ASSISTANT_COMPLETE_RESPONSE
      );
      const turnCompletedAfterAssistantIndex = workerEvents.findIndex(
        (event, index) => index > assistantCompleteAfterToolIndex && event.type === StreamEventType.TURN_COMPLETED
      );

      expect(toolSucceededIndex).toBeGreaterThanOrEqual(0);
      expect(assistantCompleteAfterToolIndex).toBeGreaterThan(toolSucceededIndex);
      expect(turnCompletedAfterAssistantIndex).toBeGreaterThan(assistantCompleteAfterToolIndex);

      await waitForTeamToBeIdle(team, 120.0);
    } finally {
      team.notifier.unsubscribe(EventType.TEAM_STREAM_EVENT, teamStreamListener);
    }
  }, FLOW_TEST_TIMEOUT_MS);
});
