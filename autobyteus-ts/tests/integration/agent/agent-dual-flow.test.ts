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

runIntegration('Agent dual-flow integration (LM Studio, api_tool_call)', () => {
  let tempDirA: string;
  let tempDirB: string;
  let originalParserEnv: string | undefined;

  beforeEach(async () => {
    originalParserEnv = process.env.AUTOBYTEUS_STREAM_PARSER;
    process.env.AUTOBYTEUS_STREAM_PARSER = 'api_tool_call';
    SkillRegistry.getInstance().clear();
    resetFactory();
    tempDirA = await fs.mkdtemp(path.join(os.tmpdir(), 'autobyteus-agent-a-'));
    tempDirB = await fs.mkdtemp(path.join(os.tmpdir(), 'autobyteus-agent-b-'));
  });

  afterEach(async () => {
    if (originalParserEnv === undefined) {
      delete process.env.AUTOBYTEUS_STREAM_PARSER;
    } else {
      process.env.AUTOBYTEUS_STREAM_PARSER = originalParserEnv;
    }
    SkillRegistry.getInstance().clear();
    resetFactory();
    await fs.rm(tempDirA, { recursive: true, force: true });
    await fs.rm(tempDirB, { recursive: true, force: true });
  });

  it('runs two agents concurrently and executes tool calls', async () => {
    const tool = registerWriteFileTool();
    const toolArgsA = { path: 'alpha.txt', content: 'Alpha agent output.' };
    const toolArgsB = { path: 'beta.txt', content: 'Beta agent output.' };

    const llmA = await createLmstudioLLM({ requireToolChoice: true });
    if (!llmA) return;
    const llmB = await createLmstudioLLM({ requireToolChoice: true });
    if (!llmB) {
      await llmA.cleanup();
      return;
    }

    const configA = new AgentConfig(
      'DualAgentA',
      'Tester',
      'Dual agent flow A',
      llmA,
      null,
      [tool],
      true,
      null,
      null,
      null,
      null,
      null,
      new SimpleWorkspace(tempDirA)
    );

    const configB = new AgentConfig(
      'DualAgentB',
      'Tester',
      'Dual agent flow B',
      llmB,
      null,
      [tool],
      true,
      null,
      null,
      null,
      null,
      null,
      new SimpleWorkspace(tempDirB)
    );

    const factory = new AgentFactory();
    const agentA = factory.createAgent(configA);
    const agentB = factory.createAgent(configB);

    try {
      agentA.start();
      agentB.start();

      const [readyA, readyB] = await Promise.all([
        waitForStatus(agentA.agentId, () => agentA.context.currentStatus),
        waitForStatus(agentB.agentId, () => agentB.context.currentStatus)
      ]);
      expect(readyA).toBe(true);
      expect(readyB).toBe(true);

      await Promise.all([
        agentA.postUserMessage(
          new AgentInputUserMessage(
            `Use the write_file tool to write "${toolArgsA.content}" to "${toolArgsA.path}". ` +
              `Do not respond with plain text.`
          )
        ),
        agentB.postUserMessage(
          new AgentInputUserMessage(
            `Use the write_file tool to write "${toolArgsB.content}" to "${toolArgsB.path}". ` +
              `Do not respond with plain text.`
          )
        )
      ]);

      const filePathA = path.join(tempDirA, toolArgsA.path);
      const filePathB = path.join(tempDirB, toolArgsB.path);

      const [createdA, createdB] = await Promise.all([
        waitForFile(filePathA, 20000, 100),
        waitForFile(filePathB, 20000, 100)
      ]);
      expect(createdA).toBe(true);
      expect(createdB).toBe(true);

      const [contentA, contentB] = await Promise.all([
        fs.readFile(filePathA, 'utf8'),
        fs.readFile(filePathB, 'utf8')
      ]);

      expect(contentA.trim()).toBe(toolArgsA.content);
      expect(contentB.trim()).toBe(toolArgsB.content);
    } finally {
      if (agentA.isRunning) {
        await agentA.stop(5);
      }
      if (agentB.isRunning) {
        await agentB.stop(5);
      }
      await llmA.cleanup();
      await llmB.cleanup();
    }
  }, 120000);
});
