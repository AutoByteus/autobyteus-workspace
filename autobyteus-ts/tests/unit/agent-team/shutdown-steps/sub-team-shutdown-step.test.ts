import { describe, it, expect, vi } from 'vitest';
import { SubTeamShutdownStep } from '../../../../src/agent-team/shutdown-steps/sub-team-shutdown-step.js';
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

describe('SubTeamShutdownStep', () => {
  it('succeeds with no team manager', async () => {
    const context = makeContext();
    context.state.teamManager = null;
    const step = new SubTeamShutdownStep();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const success = await step.execute(context);

    expect(success).toBe(true);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('succeeds when there are no running sub-teams', async () => {
    const context = makeContext();
    const teamManager = { getAllSubTeams: vi.fn(() => []) };
    context.state.teamManager = teamManager as any;
    const step = new SubTeamShutdownStep();

    const success = await step.execute(context);

    expect(success).toBe(true);
    expect(teamManager.getAllSubTeams).toHaveBeenCalledTimes(1);
  });

  it('stops running sub-teams', async () => {
    const context = makeContext();
    const runningTeam = { name: 'Sub1', isRunning: true, stop: vi.fn(async () => undefined) };
    const stoppedTeam = { name: 'Sub2', isRunning: false, stop: vi.fn(async () => undefined) };
    const teamManager = { getAllSubTeams: vi.fn(() => [runningTeam, stoppedTeam]) };
    context.state.teamManager = teamManager as any;
    const step = new SubTeamShutdownStep();

    const success = await step.execute(context);

    expect(success).toBe(true);
    expect(runningTeam.stop).toHaveBeenCalledWith(20.0);
    expect(stoppedTeam.stop).not.toHaveBeenCalled();
  });

  it('reports failure when a sub-team stop rejects', async () => {
    const context = makeContext();
    const failingTeam = {
      name: 'Failing',
      isRunning: true,
      stop: vi.fn(async () => {
        throw new Error('boom');
      })
    };
    const teamManager = { getAllSubTeams: vi.fn(() => [failingTeam]) };
    context.state.teamManager = teamManager as any;
    const step = new SubTeamShutdownStep();

    const success = await step.execute(context);

    expect(success).toBe(false);
    expect(failingTeam.stop).toHaveBeenCalledWith(20.0);
  });
});
