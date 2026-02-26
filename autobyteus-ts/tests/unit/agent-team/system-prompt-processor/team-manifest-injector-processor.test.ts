import { describe, it, expect } from 'vitest';
import { TeamManifestInjectorProcessor } from '../../../../src/agent-team/system-prompt-processor/team-manifest-injector-processor.js';
import { AgentTeamContext } from '../../../../src/agent-team/context/agent-team-context.js';
import { AgentTeamConfig } from '../../../../src/agent-team/context/agent-team-config.js';
import { TeamNodeConfig } from '../../../../src/agent-team/context/team-node-config.js';
import { AgentTeamRuntimeState } from '../../../../src/agent-team/context/agent-team-runtime-state.js';
import { AgentConfig } from '../../../../src/agent/context/agent-config.js';
import { AgentContext } from '../../../../src/agent/context/agent-context.js';
import { AgentRuntimeState } from '../../../../src/agent/context/agent-runtime-state.js';
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

const buildTeamContext = (teamId: string, nodes: TeamNodeConfig[]): AgentTeamContext => {
  const config = new AgentTeamConfig({
    name: 'Team',
    description: 'Team desc',
    nodes,
    coordinatorNode: nodes[0]
  });
  const state = new AgentTeamRuntimeState({ teamId });
  return new AgentTeamContext(teamId, config, state);
};

const buildAgentContext = (agentConfig: AgentConfig, teamContext?: AgentTeamContext): AgentContext => {
  const runtimeState = new AgentRuntimeState(`agent_${agentConfig.name}`);
  if (teamContext) {
    runtimeState.customData.teamContext = teamContext;
  }
  return new AgentContext(runtimeState.agentId, agentConfig, runtimeState);
};

describe('TeamManifestInjectorProcessor', () => {
  it('returns the original prompt when no team context is provided', () => {
    const agentConfig = makeAgentConfig('Solo');
    agentConfig.systemPrompt = 'Base prompt';
    const agentContext = buildAgentContext(agentConfig);

    const processor = new TeamManifestInjectorProcessor();
    const result = processor.process('Base prompt', {}, agentContext.agentId, agentContext);

    expect(result).toBe('Base prompt');
  });

  it('replaces the {{team}} placeholder with the manifest', () => {
    const coordinatorDef = makeAgentConfig('Coordinator');
    coordinatorDef.systemPrompt = 'Team:\\n{{team}}';
    const memberDef = makeAgentConfig('Member');
    memberDef.description = 'This is the member agent.';

    const teamContext = buildTeamContext('team_1', [
      new TeamNodeConfig({ nodeDefinition: coordinatorDef }),
      new TeamNodeConfig({ nodeDefinition: memberDef })
    ]);

    const agentContext = buildAgentContext(coordinatorDef, teamContext);

    const processor = new TeamManifestInjectorProcessor();
    const result = processor.process(coordinatorDef.systemPrompt ?? '', {}, agentContext.agentId, agentContext);

    expect(result).toContain('Team:');
    expect(result).not.toContain('{{team}}');
    expect(result).toContain('- name: Member');
    expect(result).toContain('description: This is the member agent.');
  });

  it('appends the manifest when no placeholder is present', () => {
    const coordinatorDef = makeAgentConfig('Coordinator');
    coordinatorDef.systemPrompt = 'Base prompt';
    const memberDef = makeAgentConfig('Member');

    const teamContext = buildTeamContext('team_2', [
      new TeamNodeConfig({ nodeDefinition: coordinatorDef }),
      new TeamNodeConfig({ nodeDefinition: memberDef })
    ]);

    const agentContext = buildAgentContext(coordinatorDef, teamContext);

    const processor = new TeamManifestInjectorProcessor();
    const result = processor.process(coordinatorDef.systemPrompt ?? '', {}, agentContext.agentId, agentContext);

    expect(result.startsWith('Base prompt')).toBe(true);
    expect(result).toContain('## Team Manifest');
    expect(result).toContain('- name: Member');
    expect(result).toContain('description: Member description');
  });

  it('handles a solo team by emitting the solo manifest', () => {
    const coordinatorDef = makeAgentConfig('Solo');
    coordinatorDef.systemPrompt = 'Team: {{team}}';

    const teamContext = buildTeamContext('team_3', [new TeamNodeConfig({ nodeDefinition: coordinatorDef })]);
    const agentContext = buildAgentContext(coordinatorDef, teamContext);

    const processor = new TeamManifestInjectorProcessor();
    const result = processor.process(coordinatorDef.systemPrompt ?? '', {}, agentContext.agentId, agentContext);

    expect(result).toBe('Team: You are working alone. You have no team members to delegate to.');
  });
});
