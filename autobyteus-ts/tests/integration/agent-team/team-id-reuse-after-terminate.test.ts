import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AgentFactory } from '../../../src/agent/factory/agent-factory.js';
import { AgentConfig } from '../../../src/agent/context/agent-config.js';
import { AgentTeamConfig } from '../../../src/agent-team/context/agent-team-config.js';
import { TeamNodeConfig } from '../../../src/agent-team/context/team-node-config.js';
import { AgentTeamFactory } from '../../../src/agent-team/factory/agent-team-factory.js';
import { waitForTeamToBeIdle } from '../../../src/agent-team/utils/wait-for-idle.js';
import { BaseLLM } from '../../../src/llm/base.js';
import { LLMModel } from '../../../src/llm/models.js';
import { LLMProvider } from '../../../src/llm/providers.js';
import { LLMConfig } from '../../../src/llm/utils/llm-config.js';
import { ChunkResponse, CompleteResponse } from '../../../src/llm/utils/response-types.js';
import type { LLMUserMessage } from '../../../src/llm/user-message.js';

class DummyLLM extends BaseLLM {
  protected async _sendMessagesToLLM(_messages: any[]): Promise<CompleteResponse> {
    return new CompleteResponse({ content: 'ok' });
  }

  protected async *_streamMessagesToLLM(
    _userMessage: LLMUserMessage
  ): AsyncGenerator<ChunkResponse, void, unknown> {
    yield new ChunkResponse({ content: 'ok', is_complete: true });
  }
}

const resetFactories = (): void => {
  (AgentFactory as any).instance = undefined;
  (AgentTeamFactory as any).instance = undefined;
};

const makeTeamConfig = (memberAgentId: string): AgentTeamConfig => {
  const model = new LLMModel({
    name: 'dummy',
    value: 'dummy',
    canonicalName: 'dummy',
    provider: LLMProvider.OPENAI
  });
  const llm = new DummyLLM(model, new LLMConfig());
  const coordinator = new AgentConfig('Professor', 'Professor', 'desc', llm);
  coordinator.initialCustomData = {
    teamMemberIdentity: {
      memberRouteKey: 'professor',
      memberAgentId
    }
  };
  const coordinatorNode = new TeamNodeConfig({ nodeDefinition: coordinator });
  return new AgentTeamConfig({
    name: 'Class Room Simulation',
    description: 'Team id reuse integration test',
    nodes: [coordinatorNode],
    coordinatorNode,
  });
};

describe('Agent team deterministic member reuse across terminate/restore', () => {
  const teamId = 'team_reuse_e2e';
  const memberAgentId = 'member_reuse_professor_001';

  beforeEach(() => {
    resetFactories();
  });

  afterEach(async () => {
    const teamFactory = AgentTeamFactory.getInstance();
    if (teamFactory.getTeam(teamId)) {
      await teamFactory.removeTeam(teamId, 2.0);
    }

    const agentFactory = AgentFactory.getInstance();
    if (agentFactory.getAgent(memberAgentId)) {
      await agentFactory.removeAgent(memberAgentId, 2.0);
    }

    resetFactories();
  });

  it('can recreate the same teamId and memberAgentId after terminate', async () => {
    const teamFactory = AgentTeamFactory.getInstance();
    const config = makeTeamConfig(memberAgentId);

    const first = teamFactory.createTeamWithId(teamId, config);
    first.start();
    await waitForTeamToBeIdle(first, 30.0);
    await teamFactory.removeTeam(teamId, 5.0);

    const second = teamFactory.createTeamWithId(teamId, config);
    second.start();
    await expect(waitForTeamToBeIdle(second, 30.0)).resolves.toBeUndefined();
  });
});
