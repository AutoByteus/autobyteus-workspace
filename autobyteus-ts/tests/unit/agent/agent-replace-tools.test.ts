import { describe, expect, it, vi } from 'vitest';
import { Agent } from '../../../src/agent/agent.js';
import { AgentRuntime } from '../../../src/agent/runtime/agent-runtime.js';
import { AgentRuntimeState } from '../../../src/agent/context/agent-runtime-state.js';
import { AgentConfig } from '../../../src/agent/context/agent-config.js';
import { AgentContext } from '../../../src/agent/context/agent-context.js';
import { resolveTurnToolNames } from '../../../src/agent/loop/llm-phase-tools.js';
import { BaseTool } from '../../../src/tools/base-tool.js';

class NamedTool extends BaseTool {
  readonly cleanup = vi.fn(async () => undefined);
  constructor(private readonly toolName: string) { super(); }
  getName(): string { return this.toolName; }
  static getDescription(): string { return 'test tool'; }
  static getArgumentSchema() { return null; }
  protected async _execute(): Promise<unknown> { return 'ok'; }
}

const makeAgent = (initial: NamedTool[]) => {
  const config = new AgentConfig('name', 'role', 'desc', {} as never, null, initial);
  const state = new AgentRuntimeState('agent-1');
  state.toolInstances = Object.fromEntries(initial.map((tool) => [tool.getName(), tool]));
  const context = new AgentContext('agent-1', config, state);
  const runtime = Object.create(AgentRuntime.prototype) as AgentRuntime;
  runtime.context = context;
  return { agent: new Agent(runtime), context };
};

describe('Agent.replaceTools', () => {
  it('keeps the existing instance of every tool whose name stays, adds new ones, and cleans up removed and unused instances', async () => {
    const browser = new NamedTool('open_tab');
    const removed = new NamedTool('search_memory');
    const { agent, context } = makeAgent([browser, removed]);
    const browserRebuilt = new NamedTool('open_tab');
    const added = new NamedTool('get_project_task');

    await agent.replaceTools([browserRebuilt, added]);

    expect(context.state.toolInstances).toEqual({ open_tab: browser, get_project_task: added });
    expect(context.state.toolInstances!.open_tab).toBe(browser);
    expect(resolveTurnToolNames(context).sort()).toEqual(['get_project_task', 'open_tab']);
    expect(removed.cleanup).toHaveBeenCalledOnce();
    expect(browserRebuilt.cleanup).toHaveBeenCalledOnce();
    expect(browser.cleanup).not.toHaveBeenCalled();
    expect(added.cleanup).not.toHaveBeenCalled();
  });

  it('removes every tool: the next LLM call lists none, not the configured tools', async () => {
    const tool = new NamedTool('read_file');
    const { agent, context } = makeAgent([tool]);
    await agent.replaceTools([]);
    expect(context.state.toolInstances).toEqual({});
    expect(resolveTurnToolNames(context)).toEqual([]);
    expect(tool.cleanup).toHaveBeenCalledOnce();
  });
});
