import { describe, it, expect, vi } from 'vitest';
import { AgentTeamShutdownStep } from '../../../../src/agent-team/shutdown-steps/agent-team-shutdown-step.js';
import { AgentTeamContext } from '../../../../src/agent-team/context/agent-team-context.js';
import { AgentTeamConfig } from '../../../../src/agent-team/context/agent-team-config.js';
import { TeamNodeConfig } from '../../../../src/agent-team/context/team-node-config.js';
import { AgentTeamRuntimeState } from '../../../../src/agent-team/context/agent-team-runtime-state.js';
import { AgentConfig } from '../../../../src/agent/context/agent-config.js';
import { BaseLLM } from '../../../../src/llm/base.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';
import { CompleteResponse, ChunkResponse } from '../../../../src/llm/utils/response-types.js';
import { LLMUserMessage } from '../../../../src/llm/user-message.js';

class DummyLLM extends BaseLLM {
  protected async _sendMessagesToLLM(_messages: any[]): Promise<CompleteResponse> {
    return new CompleteResponse({ content: 'ok' });
  }

  protected async *_streamMessagesToLLM(_messages: any[]): AsyncGenerator<ChunkResponse, void, unknown> {
    yield new ChunkResponse({ content: 'ok', is_complete: true });
  }
}

const makeContext = (): AgentTeamContext => {
  const model = new LLMModel({
    name: 'dummy',
    value: 'dummy',
    canonicalName: 'dummy',
    provider: LLMProvider.OPENAI
  });
  const llm = new DummyLLM(model, new LLMConfig());
  const agent = new AgentConfig('Coordinator', 'Coordinator', 'desc', llm);
  const node = new TeamNodeConfig({ nodeDefinition: agent });
  const config = new AgentTeamConfig({
    name: 'Team',
    description: 'desc',
    nodes: [node],
    coordinatorNode: node
  });
  const state = new AgentTeamRuntimeState({ teamId: 'team-1' });
  return new AgentTeamContext('team-1', config, state);
};

describe('AgentTeamShutdownStep', () => {
  it('succeeds with no team manager', async () => {
    const context = makeContext();
    context.state.teamManager = null;
    const step = new AgentTeamShutdownStep();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const success = await step.execute(context);

    expect(success).toBe(true);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('succeeds when there are no running agents', async () => {
    const context = makeContext();
    const teamManager = { getAllAgents: vi.fn(() => []) };
    context.state.teamManager = teamManager as any;
    const step = new AgentTeamShutdownStep();
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    const success = await step.execute(context);

    expect(success).toBe(true);
    expect(teamManager.getAllAgents).toHaveBeenCalledTimes(1);
    expect(infoSpy.mock.calls.some((call) => String(call[0]).includes('No running agents'))).toBe(true);
    infoSpy.mockRestore();
  });

  it('stops running agents', async () => {
    const context = makeContext();
    const runningAgent = { agentId: 'running', isRunning: true, stop: vi.fn(async () => undefined) };
    const stoppedAgent = { agentId: 'stopped', isRunning: false, stop: vi.fn(async () => undefined) };
    const teamManager = { getAllAgents: vi.fn(() => [runningAgent, stoppedAgent]) };
    context.state.teamManager = teamManager as any;
    const step = new AgentTeamShutdownStep();

    const success = await step.execute(context);

    expect(success).toBe(true);
    expect(runningAgent.stop).toHaveBeenCalledWith(10.0);
    expect(stoppedAgent.stop).not.toHaveBeenCalled();
  });

  it('reports failure when an agent stop rejects', async () => {
    const context = makeContext();
    const agentOk = { agentId: 'agent_ok', isRunning: true, stop: vi.fn(async () => undefined) };
    const agentFail = {
      agentId: 'agent_fail',
      isRunning: true,
      stop: vi.fn(async () => {
        throw new Error('Stop failed');
      })
    };
    const teamManager = { getAllAgents: vi.fn(() => [agentOk, agentFail]) };
    context.state.teamManager = teamManager as any;
    const step = new AgentTeamShutdownStep();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const success = await step.execute(context);

    expect(success).toBe(false);
    expect(agentOk.stop).toHaveBeenCalledWith(10.0);
    expect(agentFail.stop).toHaveBeenCalledWith(10.0);
    expect(errorSpy.mock.calls.some((call) => String(call[0]).includes("agent_fail"))).toBe(true);
    errorSpy.mockRestore();
  });
});
