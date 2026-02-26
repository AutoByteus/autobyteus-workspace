import { describe, it, expect } from 'vitest';
import { AgentConfigurationPreparationStep } from '../../../../src/agent-team/bootstrap-steps/agent-configuration-preparation-step.js';
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
import { CreateTasks } from '../../../../src/task-management/tools/task-tools/create-tasks.js';
import { SendMessageTo } from '../../../../src/agent/message/send-message-to.js';
import { TeamManifestInjectorProcessor } from '../../../../src/agent-team/system-prompt-processor/team-manifest-injector-processor.js';

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

const rebuildContextWithConfig = (context: AgentTeamContext, newConfig: AgentTeamConfig) => {
  context.config = newConfig;
  (context as any).nodeConfigMap = null;
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

describe('AgentConfigurationPreparationStep', () => {
  it('prepares final configs and preserves tools', async () => {
    const step = new AgentConfigurationPreparationStep();
    const context = makeContext();

    const coordinatorDef = makeAgentConfig('Coordinator');
    coordinatorDef.tools = [new CreateTasks(), new SendMessageTo()];
    coordinatorDef.systemPrompt = 'Coordinator prompt';

    const memberDef = makeAgentConfig('Member');
    memberDef.tools = [];
    memberDef.systemPrompt = 'Member prompt';

    const coordinatorNode = new TeamNodeConfig({ nodeDefinition: coordinatorDef });
    const memberNode = new TeamNodeConfig({ nodeDefinition: memberDef });

    const subTeamCoordinator = new TeamNodeConfig({ nodeDefinition: makeAgentConfig('SubCoord') });
    const subTeamNode = new TeamNodeConfig({
      nodeDefinition: new AgentTeamConfig({
        name: 'SubTeam',
        description: 'sub team',
        nodes: [subTeamCoordinator],
        coordinatorNode: subTeamCoordinator
      })
    });

    const newTeamConfig = new AgentTeamConfig({
      name: 'TestTeamWithExplicitTools',
      description: 'A test team',
      nodes: [coordinatorNode, memberNode, subTeamNode],
      coordinatorNode: coordinatorNode
    });
    rebuildContextWithConfig(context, newTeamConfig);

    const success = await step.execute(context);

    expect(success).toBe(true);

    const finalConfigs = context.state.finalAgentConfigs;
    expect(Object.keys(finalConfigs).length).toBe(2);

    const coordConfig = finalConfigs[coordinatorNode.name];
    expect(coordConfig).toBeInstanceOf(AgentConfig);
    const coordToolNames = coordConfig.tools.map((tool: any) => tool.constructor.getName());
    expect(coordToolNames).toContain(CreateTasks.getName());
    expect(coordToolNames).toContain(SendMessageTo.getName());
    expect(coordToolNames.length).toBe(2);
    expect(coordConfig.systemPrompt).toBe(coordinatorDef.systemPrompt);
    expect(coordConfig.initialCustomData?.teamContext).toBe(context);
    expect(
      coordConfig.systemPromptProcessors.some((processor) => processor instanceof TeamManifestInjectorProcessor)
    ).toBe(true);

    const memberConfig = finalConfigs[memberNode.name];
    expect(memberConfig).toBeInstanceOf(AgentConfig);
    expect(memberConfig.tools.length).toBe(0);
    expect(memberConfig.systemPrompt).toBe(memberDef.systemPrompt);
    expect(memberConfig.initialCustomData?.teamContext).toBe(context);
    expect(
      memberConfig.systemPromptProcessors.some((processor) => processor instanceof TeamManifestInjectorProcessor)
    ).toBe(true);
  });

  it('fails if team manager missing', async () => {
    const step = new AgentConfigurationPreparationStep();
    const context = makeContext();
    context.state.teamManager = null;

    const success = await step.execute(context);

    expect(success).toBe(false);
  });
});
