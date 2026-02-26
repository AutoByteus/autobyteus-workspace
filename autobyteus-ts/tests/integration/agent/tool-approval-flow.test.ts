import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { AgentFactory } from '../../../src/agent/factory/agent-factory.js';
import { AgentConfig } from '../../../src/agent/context/agent-config.js';
import { PendingToolInvocationEvent, ToolResultEvent } from '../../../src/agent/events/agent-events.js';
import { ToolInvocation } from '../../../src/agent/tool-invocation.js';
import { waitForAgentToBeIdle } from '../../../src/agent/utils/wait-for-idle.js';
import { BaseAgentWorkspace } from '../../../src/agent/workspace/base-workspace.js';
import { WorkspaceConfig } from '../../../src/agent/workspace/workspace-config.js';
import { BaseLLM } from '../../../src/llm/base.js';
import { LLMModel } from '../../../src/llm/models.js';
import { LLMProvider } from '../../../src/llm/providers.js';
import { LLMConfig } from '../../../src/llm/utils/llm-config.js';
import { CompleteResponse, ChunkResponse } from '../../../src/llm/utils/response-types.js';
import { Message } from '../../../src/llm/utils/messages.js';
import { defaultToolRegistry } from '../../../src/tools/registry/tool-registry.js';
import { registerWriteFileTool } from '../../../src/tools/file/write-file.js';
import { registerReadFileTool } from '../../../src/tools/file/read-file.js';
import { registerEditFileTool } from '../../../src/tools/file/edit-file.js';
import { registerRunBashTool } from '../../../src/tools/terminal/tools/run-bash.js';
import { TerminalResult } from '../../../src/tools/terminal/types.js';

let nodePtyAvailable = true;
try {
  await import('node-pty');
} catch {
  nodePtyAvailable = false;
}

class DummyLLM extends BaseLLM {
  protected async _sendMessagesToLLM(_messages: Message[]): Promise<CompleteResponse> {
    return new CompleteResponse({ content: 'ok' });
  }

  protected async *_streamMessagesToLLM(
    _messages: Message[]
  ): AsyncGenerator<ChunkResponse, void, unknown> {
    yield new ChunkResponse({ content: 'ok', is_complete: true });
  }
}

class TestWorkspace extends BaseAgentWorkspace {
  private rootPath: string;

  constructor(rootPath: string) {
    super(new WorkspaceConfig({ root_path: rootPath }));
    this.rootPath = rootPath;
  }

  getBasePath(): string {
    return this.rootPath;
  }
}

type AgentFixture = {
  agent: ReturnType<AgentFactory['createAgent']>;
  llm: DummyLLM;
  workspaceDir: string;
  memoryDir: string;
};

const waitFor = async (
  predicate: () => boolean | Promise<boolean>,
  timeoutMs = 5000,
  intervalMs = 50,
  description = 'condition'
): Promise<void> => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Timed out waiting for ${description}.`);
};

const readRawTraces = async (memoryDir: string, agentId: string): Promise<Record<string, unknown>[]> => {
  const rawPath = path.join(memoryDir, 'agents', agentId, 'raw_traces.jsonl');
  try {
    const content = await fs.readFile(rawPath, 'utf-8');
    return content
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch {
    return [];
  }
};

const createAgentFixture = async (tools: any[]): Promise<AgentFixture> => {
  const workspaceDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tool-approval-'));
  const memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), 'autobyteus-memory-'));
  process.env.AUTOBYTEUS_MEMORY_DIR = memoryDir;
  const workspace = new TestWorkspace(workspaceDir);
  const model = new LLMModel({
    name: 'dummy',
    value: 'dummy',
    canonicalName: 'dummy',
    provider: LLMProvider.OPENAI
  });
  const llm = new DummyLLM(model, new LLMConfig());
  const config = new AgentConfig(
    'ApprovalAgent',
    'Tester',
    'Tool approval integration test agent.',
    llm,
    null,
    tools,
    false,
    null,
    null,
    null,
    null,
    null,
    workspace
  );
  const agent = new AgentFactory().createAgent(config);
  agent.start();
  await waitForAgentToBeIdle(agent, 10);
  return { agent, llm, workspaceDir, memoryDir };
};

const assignActiveTurn = (fixture: AgentFixture): string => {
  const memoryManager = fixture.agent.context.state.memoryManager;
  const turnId = memoryManager?.startTurn() ?? `turn_${Date.now()}`;
  fixture.agent.context.state.activeTurnId = turnId;
  return turnId;
};

describe('Tool approval integration flow', () => {
  let fixture: AgentFixture | null = null;
  let previousMemoryDir: string | undefined;

  beforeEach(() => {
    defaultToolRegistry.clear();
    previousMemoryDir = process.env.AUTOBYTEUS_MEMORY_DIR;
  });

  afterEach(async () => {
    if (fixture) {
      await fixture.agent.stop(2);
      await fixture.llm.cleanup();
      await fs.rm(fixture.workspaceDir, { recursive: true, force: true });
      await fs.rm(fixture.memoryDir, { recursive: true, force: true });
      fixture = null;
    }
    if (previousMemoryDir) {
      process.env.AUTOBYTEUS_MEMORY_DIR = previousMemoryDir;
    } else {
      delete process.env.AUTOBYTEUS_MEMORY_DIR;
    }
  });

  it('executes write_file after approval', async () => {
    const writeTool = registerWriteFileTool();
    fixture = await createAgentFixture([writeTool]);
    const turnId = assignActiveTurn(fixture);

    const relativePath = 'poem.txt';
    const content = 'hello from approval';
    const invocationId = `write-${Date.now()}`;
    const invocation = new ToolInvocation('write_file', { path: relativePath, content }, invocationId, turnId);

    await fixture.agent.context.inputEventQueues.enqueueInternalSystemEvent(
      new PendingToolInvocationEvent(invocation)
    );

    await waitFor(
      () => Boolean(fixture!.agent.context.state.pendingToolApprovals[invocationId]),
      5000,
      50,
      'pending tool approval'
    );

    await fixture.agent.postToolExecutionApproval(invocationId, true, 'approved');

    const finalPath = path.join(fixture.workspaceDir, relativePath);
    await waitFor(
      async () => {
        try {
          const fileContent = await fs.readFile(finalPath, 'utf-8');
          return fileContent === content;
        } catch {
          return false;
        }
      },
      5000,
      50,
      'write_file execution'
    );

    const written = await fs.readFile(finalPath, 'utf-8');
    expect(written).toBe(content);
  });

  it('executes read_file after approval and records tool output', async () => {
    const readTool = registerReadFileTool();
    fixture = await createAgentFixture([readTool]);
    const turnId = assignActiveTurn(fixture);

    const relativePath = 'sample.txt';
    const fileContent = 'line1\nline2\n';
    await fs.writeFile(path.join(fixture.workspaceDir, relativePath), fileContent, 'utf-8');

    const invocationId = `read-${Date.now()}`;
    const invocation = new ToolInvocation('read_file', { path: relativePath }, invocationId, turnId);

    await fixture.agent.context.inputEventQueues.enqueueInternalSystemEvent(
      new PendingToolInvocationEvent(invocation)
    );

    await waitFor(
      () => Boolean(fixture!.agent.context.state.pendingToolApprovals[invocationId]),
      5000,
      50,
      'pending tool approval'
    );

    await fixture.agent.postToolExecutionApproval(invocationId, true, 'approved');

    await waitFor(
      async () => {
        const traces = await readRawTraces(fixture!.memoryDir, fixture!.agent.agentId);
        return traces.some(
          (trace) =>
            trace.trace_type === 'tool_result' &&
            trace.tool_name === 'read_file' &&
            String(trace.tool_result ?? '').includes('1: line1')
        );
      },
      5000,
      50,
      'read_file tool output'
    );

    const traces = await readRawTraces(fixture.memoryDir, fixture.agent.agentId);
    const lastToolTrace = traces.find(
      (trace) =>
        trace.trace_type === 'tool_result' &&
        trace.tool_name === 'read_file' &&
        String(trace.tool_result ?? '').includes('1: line1')
    );
    expect(lastToolTrace).toBeDefined();
  });

  it('executes edit_file after approval', async () => {
    const patchTool = registerEditFileTool();
    fixture = await createAgentFixture([patchTool]);
    const turnId = assignActiveTurn(fixture);

    const relativePath = 'patch_target.txt';
    const initialContent = 'line1\nline2\nline3\n';
    const targetPath = path.join(fixture.workspaceDir, relativePath);
    await fs.writeFile(targetPath, initialContent, 'utf-8');

    const patch = `@@ -1,3 +1,3 @@
 line1
-line2
+line2 updated
 line3
`;

    const invocationId = `patch-${Date.now()}`;
    const invocation = new ToolInvocation('edit_file', { path: relativePath, patch }, invocationId, turnId);

    await fixture.agent.context.inputEventQueues.enqueueInternalSystemEvent(
      new PendingToolInvocationEvent(invocation)
    );

    await waitFor(
      () => Boolean(fixture!.agent.context.state.pendingToolApprovals[invocationId]),
      5000,
      50,
      'pending tool approval'
    );

    await fixture.agent.postToolExecutionApproval(invocationId, true, 'approved');

    await waitFor(
      async () => {
        try {
          const content = await fs.readFile(targetPath, 'utf-8');
          return content.includes('line2 updated');
        } catch {
          return false;
        }
      },
      5000,
      50,
      'edit_file execution'
    );

    const patchedContent = await fs.readFile(targetPath, 'utf-8');
    expect(patchedContent).toBe('line1\nline2 updated\nline3\n');
  });

  const runBashIntegration = nodePtyAvailable ? it : it.skip;
  runBashIntegration('executes run_bash after approval', async () => {
    const runBashTool = registerRunBashTool();
    fixture = await createAgentFixture([runBashTool]);
    const turnId = assignActiveTurn(fixture);

    const invocationId = `bash-${Date.now()}`;
    const invocation = new ToolInvocation(
      'run_bash',
      { command: "printf 'approval_ok'", timeout_seconds: 5 },
      invocationId,
      turnId
    );

    await fixture.agent.context.inputEventQueues.enqueueInternalSystemEvent(
      new PendingToolInvocationEvent(invocation)
    );

    await waitFor(
      () => Boolean(fixture!.agent.context.state.pendingToolApprovals[invocationId]),
      5000,
      50,
      'pending tool approval'
    );

    await fixture.agent.postToolExecutionApproval(invocationId, true, 'approved');

    await waitFor(
      () => {
        const events = fixture!.agent.context.state.eventStore?.allEvents() ?? [];
        return events.some(
          (envelope) =>
            envelope.event instanceof ToolResultEvent &&
            envelope.event.toolInvocationId === invocationId
        );
      },
      5000,
      50,
      'run_bash tool result'
    );

    const events = fixture.agent.context.state.eventStore?.allEvents() ?? [];
    const toolEvent = events.find(
      (envelope) =>
        envelope.event instanceof ToolResultEvent &&
        envelope.event.toolInvocationId === invocationId
    );

    expect(toolEvent).toBeDefined();
    const result = (toolEvent as { event: ToolResultEvent }).event.result as TerminalResult;
    expect(result.stdout).toContain('approval_ok');
    expect(result.exitCode).toBe(0);
    expect(result.timedOut).toBe(false);
  });

  runBashIntegration('executes run_bash background mode after approval', async () => {
    const runBashTool = registerRunBashTool();
    fixture = await createAgentFixture([runBashTool]);
    const turnId = assignActiveTurn(fixture);

    const invocationId = `bash-bg-${Date.now()}`;
    const invocation = new ToolInvocation(
      'run_bash',
      { command: "printf 'bg_ok'", background: true, timeout_seconds: 5 },
      invocationId,
      turnId
    );

    await fixture.agent.context.inputEventQueues.enqueueInternalSystemEvent(
      new PendingToolInvocationEvent(invocation)
    );

    await waitFor(
      () => Boolean(fixture!.agent.context.state.pendingToolApprovals[invocationId]),
      5000,
      50,
      'pending tool approval'
    );

    await fixture.agent.postToolExecutionApproval(invocationId, true, 'approved');

    await waitFor(
      () => {
        const events = fixture!.agent.context.state.eventStore?.allEvents() ?? [];
        return events.some(
          (envelope) =>
            envelope.event instanceof ToolResultEvent &&
            envelope.event.toolInvocationId === invocationId
        );
      },
      5000,
      50,
      'run_bash background tool result'
    );

    const events = fixture.agent.context.state.eventStore?.allEvents() ?? [];
    const toolEvent = events.find(
      (envelope) =>
        envelope.event instanceof ToolResultEvent &&
        envelope.event.toolInvocationId === invocationId
    );

    expect(toolEvent).toBeDefined();
    const result = (toolEvent as { event: ToolResultEvent }).event.result as Record<string, unknown>;
    expect(result.mode).toBe('background');
    expect(result.status).toBe('started');
    expect(result.command).toBe("printf 'bg_ok'");
    expect(typeof result.processId).toBe('string');
  });
});
