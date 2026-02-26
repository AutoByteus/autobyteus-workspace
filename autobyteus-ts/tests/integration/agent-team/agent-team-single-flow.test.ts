import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AgentTeamBuilder } from '../../../src/agent-team/agent-team-builder.js';
import { AgentConfig } from '../../../src/agent/context/agent-config.js';
import { AgentInputUserMessage } from '../../../src/agent/message/agent-input-user-message.js';
import { registerWriteFileTool } from '../../../src/tools/file/write-file.js';
import { BaseAgentWorkspace } from '../../../src/agent/workspace/base-workspace.js';
import { WorkspaceConfig } from '../../../src/agent/workspace/workspace-config.js';
import { SkillRegistry } from '../../../src/skills/registry.js';
import { waitForTeamToBeIdle } from '../../../src/agent-team/utils/wait-for-idle.js';
import { AgentFactory } from '../../../src/agent/factory/agent-factory.js';
import { AgentTeamFactory } from '../../../src/agent-team/factory/agent-team-factory.js';
import type { AgentTeam } from '../../../src/agent-team/agent-team.js';
import { createLmstudioLLM, hasLmstudioConfig } from '../helpers/lmstudio-llm-helper.js';

class SimpleWorkspace extends BaseAgentWorkspace {
  private rootPath: string;

  constructor(rootPath: string) {
    super(new WorkspaceConfig({ root_path: rootPath }));
    this.rootPath = rootPath;
  }

  getBasePath(): string {
    return this.rootPath;
  }
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
      await team.stop(10.0);
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
  });

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
      new SimpleWorkspace(tempDirCoordinator)
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
      new SimpleWorkspace(tempDirWorker)
    );

    const builder = new AgentTeamBuilder('IntegrationTeam', 'Agent team integration test');
    builder.setCoordinator(coordinatorConfig);
    builder.addAgentNode(workerConfig);
    team = builder.build();

    team.start();
    await waitForTeamToBeIdle(team, 60.0);

    await team.postMessage(
      new AgentInputUserMessage(
        `Use the write_file tool to write "${toolArgs.content}" to "${toolArgs.path}". ` +
          'Do not respond with plain text.'
      ),
      'Worker'
    );

    const filePath = path.join(tempDirWorker, toolArgs.path);
    const created = await waitForFile(filePath, 20000, 100);
    expect(created).toBe(true);

    const content = await fs.readFile(filePath, 'utf8');
    expect(content.trim()).toBe(toolArgs.content);

    await waitForTeamToBeIdle(team, 120.0);
  }, 180000);
});
