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
import { createOllamaLLM } from '../helpers/ollama-llm-helper.js';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const parseMs = (value: string | undefined, fallbackMs: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackMs;
};

const FLOW_TEST_TIMEOUT_MS = parseMs(process.env.OLLAMA_FLOW_TEST_TIMEOUT_MS, 240000);
const FILE_WAIT_TIMEOUT_MS = parseMs(process.env.OLLAMA_FILE_WAIT_TIMEOUT_MS, 180000);
const OLLAMA_TOOL_CALL_TEST_PARAMS = {
  think: false,
  options: {
    num_predict: 128
  }
};

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

const shouldSkipOnConnectionError = (error: unknown): boolean => {
  const message = String((error as any)?.message ?? error);
  return /ECONNREFUSED|connect|ENOTFOUND|ECONNRESET/i.test(message);
};

const resetFactory = () => {
  (AgentFactory as any).instance = undefined;
};

describe('Agent single-flow integration (Ollama, api_tool_call)', () => {
  let tempDir: string;
  let originalParserEnv: string | undefined;

  beforeEach(async () => {
    originalParserEnv = process.env.AUTOBYTEUS_STREAM_PARSER;
    process.env.AUTOBYTEUS_STREAM_PARSER = 'api_tool_call';
    SkillRegistry.getInstance().clear();
    resetFactory();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'autobyteus-agent-ollama-'));
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
    const toolArgs = { path: 'poem.txt', content: 'Roses are red.' };

    const llm = await createOllamaLLM({ extraParams: OLLAMA_TOOL_CALL_TEST_PARAMS });
    if (!llm) {
      return;
    }

    llm.configureSystemPrompt(
      'You are a tool-using coding assistant. When asked to create or modify a file and a matching tool is available, call the tool instead of replying with plain text.'
    );

    const config = new AgentConfig(
      'SingleAgentOllama',
      'Tester',
      'Single agent Ollama end-to-end flow',
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
          `Call write_file exactly once with arguments {"path":"${toolArgs.path}","content":"${toolArgs.content}"}. ` +
            'Use a relative path and do not respond with plain text.'
        )
      );

      let filePath = path.join(tempDir, toolArgs.path);
      const created = await waitForFile(filePath, FILE_WAIT_TIMEOUT_MS, 100);
      if (!created) {
        const discoveredPath = await findFileContainingContent(tempDir, toolArgs.content);
        expect(discoveredPath).not.toBeNull();
        filePath = discoveredPath as string;
      }

      const content = await fs.readFile(filePath, 'utf8');
      expect(content).toBe(toolArgs.content);
    } catch (error) {
      if (shouldSkipOnConnectionError(error)) {
        return;
      }
      throw error;
    } finally {
      if (agent.isRunning) {
        await agent.stop(20);
      }
      await llm.cleanup();
    }
  }, FLOW_TEST_TIMEOUT_MS);
});
