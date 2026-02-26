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
import { BaseAgentWorkspace } from '../../../src/agent/workspace/base-workspace.js';
import { WorkspaceConfig } from '../../../src/agent/workspace/workspace-config.js';
import { SkillRegistry } from '../../../src/skills/registry.js';
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
  });

  it('executes a tool call end-to-end for a single agent', async () => {
    const workspace = new SimpleWorkspace(tempDir);
    const tool = registerWriteFileTool();
    const toolArgs = { path: 'poem.txt', content: 'Roses are red.' };

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

    try {
      agent.start();
      const ready = await waitForStatus(agent.agentId, () => agent.context.currentStatus);
      expect(ready).toBe(true);

      await agent.postUserMessage(
        new AgentInputUserMessage(
          `Use the write_file tool to write "${toolArgs.content}" to "${toolArgs.path}". ` +
            `Do not respond with plain text.`
        )
      );

      const filePath = path.join(tempDir, toolArgs.path);
      const created = await waitForFile(filePath, 20000, 100);
      expect(created).toBe(true);

      const content = await fs.readFile(filePath, 'utf8');
      expect(content).toBe(toolArgs.content);
    } finally {
      if (agent.isRunning) {
        await agent.stop(5);
      }
      await llm.cleanup();
    }
  }, 120000);
});
