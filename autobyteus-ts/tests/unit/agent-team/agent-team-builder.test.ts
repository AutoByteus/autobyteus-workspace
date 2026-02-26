import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  createTeam: vi.fn(),
  teamInstance: {} as any
}));

vi.mock('../../../src/agent-team/factory/agent-team-factory.js', () => ({
  AgentTeamFactory: vi.fn().mockImplementation(function (this: any) {
    this.createTeam = mocks.createTeam;
  })
}));

import { AgentTeamBuilder } from '../../../src/agent-team/agent-team-builder.js';
import { AgentTeamConfig } from '../../../src/agent-team/context/agent-team-config.js';
import { TeamNodeConfig } from '../../../src/agent-team/context/team-node-config.js';
import { AgentConfig } from '../../../src/agent/context/agent-config.js';
import { BaseLLM } from '../../../src/llm/base.js';
import { LLMModel } from '../../../src/llm/models.js';
import { LLMProvider } from '../../../src/llm/providers.js';
import { LLMConfig } from '../../../src/llm/utils/llm-config.js';
import { CompleteResponse, ChunkResponse } from '../../../src/llm/utils/response-types.js';
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

const makeAgentConfig = (name: string) => {
  const model = new LLMModel({
    name: 'dummy',
    value: 'dummy',
    canonicalName: 'dummy',
    provider: LLMProvider.OPENAI
  });
  const llm = new DummyLLM(model, new LLMConfig());
  return new AgentConfig(name, name, `${name} description`, llm);
};

describe('AgentTeamBuilder', () => {
  beforeEach(() => {
    mocks.createTeam.mockReset();
    mocks.teamInstance = {} as any;
  });

  it('builds a team with coordinator and member', () => {
    const coordinatorConfig = makeAgentConfig('Coordinator');
    const memberConfig = makeAgentConfig('Member');
    const description = 'Test team description';
    const name = 'TestTeam';

    mocks.createTeam.mockReturnValue(mocks.teamInstance);

    const builder = new AgentTeamBuilder(name, description);
    const team = builder
      .setCoordinator(coordinatorConfig)
      .addAgentNode(memberConfig)
      .build();

    expect(team).toBe(mocks.teamInstance);
    expect(mocks.createTeam).toHaveBeenCalledOnce();

    const finalTeamConfig: AgentTeamConfig = mocks.createTeam.mock.calls[0][0];
    expect(finalTeamConfig.name).toBe(name);
    expect(finalTeamConfig.description).toBe(description);
    expect(finalTeamConfig.nodes.length).toBe(2);

    const finalCoordNode = finalTeamConfig.coordinatorNode;
    const finalMemberNode = finalTeamConfig.nodes.find((n) => n.nodeDefinition === memberConfig) as TeamNodeConfig;

    expect(finalCoordNode.nodeDefinition).toBe(coordinatorConfig);
    expect(finalMemberNode.nodeDefinition).toBe(memberConfig);
  });

  it('fails to build without coordinator', () => {
    const builder = new AgentTeamBuilder('Test', 'A team without a coordinator');
    builder.addAgentNode(makeAgentConfig('SomeNode'));

    expect(() => builder.build()).toThrow('A coordinator must be set');
  });

  it('rejects duplicate node names', () => {
    const node1 = makeAgentConfig('DuplicateName');
    const node2 = makeAgentConfig('DuplicateName');

    const builder = new AgentTeamBuilder('Test', 'Test duplicate name');
    builder.addAgentNode(node1);

    expect(() => builder.addAgentNode(node2)).toThrow("Duplicate node name 'DuplicateName' detected");
  });

});
