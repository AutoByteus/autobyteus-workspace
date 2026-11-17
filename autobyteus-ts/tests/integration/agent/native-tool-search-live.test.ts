/**
 * Tool search on the native runtime against real providers, live (autobyteus-515 AC-004, AC-006).
 *
 * Purpose: a real native agent whose requests list only the four base tools plus `search_tools` and
 * `call_tool` finds `update_task` with search and closes a Task through `call_tool` with the right
 * arguments, on every provider the test vault reaches (the scenario of the ticket's probe, run
 * through the real agent loop, tool search and memory). Each request's `tools` must be identical.
 * Tools are stubs with Project Task Manager-like definitions; nothing outside the test changes.
 * Prerequisites: a test vault with the providers' keys (TESTING.md#test-vault). Small input.
 * Gate: RUN_LIVE_PROVIDER_TESTS=1 plus AUTOBYTEUS_TEST_VAULT. A provider without a key, or one that
 * refuses access, is reported as a skip with its reason (AUTOBYTEUS_LIVE_STRICT=1 fails instead).
 * Models: LIVE_TOOL_SEARCH_MODELS (comma list), default the probe's eight models. Gemini runs in
 * GEMINI_MODE (default vertexExpress).
 * Optional: LIVE_TOOL_SEARCH_RECORD=<file> appends one JSON line per model: the outcome, the tools
 * called, and each request's prompt tokens and cache reads (AC-006 evidence on DeepSeek).
 * Command:
 *   env -i PATH="$PATH" HOME=<temp> TMPDIR="$TMPDIR" AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault RUN_LIVE_PROVIDER_TESTS=1 \
 *     pnpm -C autobyteus-ts exec vitest run tests/integration/agent/native-tool-search-live.test.ts
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, expect } from 'vitest';
import type { Agent } from '../../../src/agent/agent.js';
import { AgentConfig } from '../../../src/agent/context/agent-config.js';
import { AgentFactory } from '../../../src/agent/factory/agent-factory.js';
import { AgentInputUserMessage } from '../../../src/agent/message/agent-input-user-message.js';
import { AgentStatus } from '../../../src/agent/status/status-enum.js';
import { EventType } from '../../../src/events/event-types.js';
import { LLMFactory } from '../../../src/llm/llm-factory.js';
import type { BaseLLM } from '../../../src/llm/base.js';
import type { ToolDefinition } from '../../../src/tools/registry/tool-definition.js';
import { defaultToolRegistry } from '../../../src/tools/registry/tool-registry.js';
import { liveProviderTest } from '../../../../test-support/test-vault/test-vault.js';
import { BASE_TOOL_NAMES, registerTestTool, type TestToolSpec } from '../../helpers/tool-search-test-tools.js';
import { resetAgentFactory, waitForCondition, waitForStatus } from './runtime/runtime-test-harness.js';

const MODELS = (process.env.LIVE_TOOL_SEARCH_MODELS?.trim()
  || 'deepseek-v4-flash,deepseek-v4-pro,gemini-3.8-flash,kimi-k3,glm-5.3,grok-4.7,gpt-5.4-mini,claude-sonnet-5-5')
  .split(',').map((model) => model.trim()).filter(Boolean);
const RECORD = process.env.LIVE_TOOL_SEARCH_RECORD?.trim() || null;

const TASK = { taskId: 'autobyteus-77', projectId: 'project_a1', title: 'Ship the export button', status: 'IN_PROGRESS' };
const SYSTEM = 'You are the Project Task Manager. You work with tools. Project: project_a1. When a tool you need is not listed, search for it with search_tools.';
const USER = 'Close Task autobyteus-77 in Project project_a1 as DONE, with the comment "Delivered and verified". Do it now with your tools; do not ask me.';

type ToolCallRecord = { name: string; args: Record<string, unknown> };

/** The Project Task Manager's tools as stubs: base tools listed, the rest searchable. */
const pmTools = (calls: ToolCallRecord[]): TestToolSpec[] => {
  const task = { ...TASK };
  const stub = (name: string, description: string, parameters: string[], result: (args: Record<string, unknown>) => unknown): TestToolSpec =>
    ({ name, description, parameters, run: (args) => { calls.push({ name, args }); return result(args); } });
  return [
    stub('run_bash', 'Run a shell command in the workspace and return its output.', ['command'], () => 'Not available in this run.'),
    stub('read_file', 'Read a text file from the workspace.', ['path'], () => 'Not available in this run.'),
    stub('edit_file', 'Edit a text file in the workspace with a patch.', ['path', 'patch'], () => 'Not available in this run.'),
    stub('write_file', 'Write a text file in the workspace.', ['path', 'content'], () => 'Not available in this run.'),
    stub('list_projects', 'List the Projects on this node.', [], () => JSON.stringify({ projects: [{ projectId: 'project_a1', name: 'AutoByteus' }] })),
    stub('list_project_tasks', "List a Project's Tasks with their status.", ['project_id'], () => JSON.stringify({ tasks: [task] })),
    stub('get_project_task', 'Read one Task of a Project.', ['task_id'], () => JSON.stringify(task)),
    stub('search_project_tasks', "Search a Project's Tasks by words.", ['project_id', 'query'], () => JSON.stringify({ tasks: [task] })),
    stub('create_task', 'Create a Task in a Project.', ['project_id', 'title'], () => 'Created.'),
    stub('update_task', "Update a Task: change its status (OPEN, IN_PROGRESS, DONE, CANCELLED), title or add a comment.",
      ['task_id', 'status', 'comment'], (args) => { if (args.task_id === task.taskId) task.status = String(args.status); return JSON.stringify(task); }),
    stub('delegate_task', 'Give a Task to an agent or agent team.', ['recipient_address', 'task_id'], () => 'Delegated.'),
    stub('send_message_to', 'Send a message to an agent.', ['recipient_address', 'content'], () => 'Sent.'),
    stub('list_available_agents', 'List the agents and agent teams you can work with.', [], () => '[]'),
    stub('search_memory', 'Search the memory of earlier agent runs.', ['query'], () => 'No results.'),
  ];
};

const createLlm = async (model: string): Promise<BaseLLM> => {
  const isGemini = await LLMFactory.requiresGeminiRuntimeResolver(model);
  const mode = process.env.GEMINI_MODE?.trim() || 'vertexExpress';
  return LLMFactory.createLLM(model, undefined, undefined, isGemini ? async () => ({ kind: mode }) as never : undefined);
};

let agent: Agent | null = null;
let memoryDir: string | null = null;
let registrySnapshot: Map<string, ToolDefinition>;

beforeEach(() => {
  resetAgentFactory();
  registrySnapshot = defaultToolRegistry.snapshot();
});

afterEach(async () => {
  if (agent?.isRunning) await agent.stop(5);
  agent = null;
  if (memoryDir) fs.rmSync(memoryDir, { recursive: true, force: true });
  memoryDir = null;
  defaultToolRegistry.restore(registrySnapshot);
  resetAgentFactory();
});

for (const model of MODELS) {
  const live = liveProviderTest(model);
  live.describe(`native tool search on ${model} (live)`, () => {
    live.it('searches for update_task and closes the Task through call_tool, with identical request tools', async () => {
      const calls: ToolCallRecord[] = [];
      const tools = pmTools(calls).map(registerTestTool);
      const llm = await createLlm(model);
      memoryDir = fs.mkdtempSync(path.join(os.tmpdir(), 'native-tool-search-live-'));
      const config = new AgentConfig('pm', 'Project Task Manager', 'Tool search live', llm, SYSTEM, tools);
      config.memoryDir = memoryDir;
      config.listedToolNames = BASE_TOOL_NAMES;
      agent = new AgentFactory().createAgent(config);

      const requestTools: string[] = [];
      const originalStream = llm.streamMessages.bind(llm);
      llm.streamMessages = ((messages, kwargs, options) => {
        requestTools.push(JSON.stringify((kwargs as Record<string, unknown> | undefined)?.tools ?? []));
        return originalStream(messages, kwargs, options);
      }) as typeof llm.streamMessages;
      const usages: Array<{ prompt: number | null; cacheRead: number | null }> = [];
      const errors: Array<{ code: string; message: string }> = [];
      let completed = false;
      agent.start();
      expect(await waitForStatus(agent.context, (status) => status === AgentStatus.IDLE, 30_000)).toBe(true);
      const notifier = agent.context.statusManager!.notifier;
      notifier.subscribeFrom(notifier, EventType.AGENT_TOKEN_USAGE_UPDATED, (payload: any) => usages.push({
        prompt: payload.latest_prompt_tokens ?? null, cacheRead: payload.usage?.cache_read_input_tokens ?? null,
      }));
      notifier.subscribeFrom(notifier, EventType.AGENT_ERROR_OUTPUT_GENERATION, (payload: any) => errors.push({
        code: String(payload?.code ?? ''), message: String(payload?.message ?? payload),
      }));
      notifier.subscribeFrom(notifier, EventType.AGENT_TURN_COMPLETED, () => { completed = true; });

      await agent.postUserMessage(new AgentInputUserMessage(USER));
      await waitForCondition(() => completed && agent!.context.state.activeTurn === null, 240_000, 100);

      const closing = calls.find((call) => call.name === 'update_task');
      const outcome = !closing ? 'not_called'
        : String(closing.args.task_id).toLowerCase() === 'autobyteus-77' && String(closing.args.status).toUpperCase() === 'DONE'
          ? 'called_correctly' : 'called_wrong_args';
      if (RECORD) {
        fs.appendFileSync(RECORD, `${JSON.stringify({ model, outcome, completed, calls: calls.map((c) => c.name), requests: requestTools.length,
          identicalTools: new Set(requestTools).size === 1, usages, errors })}\n`);
      }
      // A failed model call ends the turn with an error event, not a throw: rethrow it, so the live
      // policy reports a provider refusal as a skip with its reason and anything else as a failure.
      const modelErrors = errors.filter((error) => !error.code.startsWith('ToolExecution.'));
      if (outcome !== 'called_correctly' && modelErrors.length) throw new Error(modelErrors.map((error) => error.message).join(' | '));

      expect(completed).toBe(true);
      expect(outcome).toBe('called_correctly');
      expect(requestTools.length).toBeGreaterThanOrEqual(2);
      expect(new Set(requestTools).size).toBe(1);
      const names = (JSON.parse(requestTools[0]!) as Array<Record<string, any>>).map((tool) => tool.function?.name ?? tool.name);
      expect(names).toEqual([...BASE_TOOL_NAMES, 'search_tools', 'call_tool']);
    }, 300_000);
  });
}
