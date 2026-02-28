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
    const toolArgs = { path: 'team_output.txt', content: 'Team worker output.' };

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

    team.start();
    await waitForTeamToBeIdle(team, 60.0);

    await team.postMessage(
      new AgentInputUserMessage(
        `Call write_file exactly once with arguments {"path":"${toolArgs.path}","content":"${toolArgs.content}"}. ` +
          'Use a relative path and do not respond with plain text.'
      ),
      'Worker'
    );

    let filePath = path.join(tempDirWorker, toolArgs.path);
    const created = await waitForFile(filePath, FILE_WAIT_TIMEOUT_MS, 100);
    if (!created) {
      const discoveredPath = await findFileContainingContent(tempDirWorker, toolArgs.content);
      expect(discoveredPath).not.toBeNull();
      filePath = discoveredPath as string;
    }

    const content = await fs.readFile(filePath, 'utf8');
    expect(content.trim()).toBe(toolArgs.content);

    await waitForTeamToBeIdle(team, 120.0);
  }, FLOW_TEST_TIMEOUT_MS);
});
