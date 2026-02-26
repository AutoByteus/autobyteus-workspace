import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CoordinatorInitializationStep } from '../../../../src/agent-team/bootstrap-steps/coordinator-initialization-step.js';
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

const makeAgentConfig = (name: string): AgentConfig => {
  const model = new LLMModel({
    name: 'dummy',
    value: 'dummy',
    canonicalName: 'dummy',
    provider: LLMProvider.OPENAI
  });
  const llm = new DummyLLM(model, new LLMConfig());
  return new AgentConfig(name, name, `${name} description`, llm);
};

const makeContext = (): AgentTeamContext => {
  const node = new TeamNodeConfig({ nodeDefinition: makeAgentConfig('Coordinator') });
  const config = new AgentTeamConfig({
    name: 'Team',
    description: 'desc',
    nodes: [node],
    coordinatorNode: node
  });
  const state = new AgentTeamRuntimeState({ teamId: 'team-1' });
  state.teamManager = { teamId: 'team-1' } as any;
  return new AgentTeamContext('team-1', config, state);
};

describe('CoordinatorInitializationStep', () => {
  let step: CoordinatorInitializationStep;
  let context: AgentTeamContext;

  beforeEach(() => {
    step = new CoordinatorInitializationStep();
    context = makeContext();
  });

  it('initializes coordinator via team manager', async () => {
    const mockManager: any = context.teamManager;
    mockManager.ensureCoordinatorIsReady = vi.fn(async () => ({ agentId: 'coordinator-1' }));
    const coordinatorName = context.config.coordinatorNode.name;

    const success = await step.execute(context);

    expect(success).toBe(true);
    expect(mockManager.ensureCoordinatorIsReady).toHaveBeenCalledWith(coordinatorName);
  });

  it('fails if team manager missing', async () => {
    context.state.teamManager = null;

    const success = await step.execute(context);

    expect(success).toBe(false);
  });

  it('fails if coordinator creation fails', async () => {
    const mockManager: any = context.teamManager;
    mockManager.ensureCoordinatorIsReady = vi.fn(async () => {
      throw new Error('Config not found');
    });

    const success = await step.execute(context);

    expect(success).toBe(false);
  });
});
