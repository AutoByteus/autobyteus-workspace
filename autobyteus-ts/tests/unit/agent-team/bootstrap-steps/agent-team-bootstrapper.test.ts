import { describe, it, expect, vi } from 'vitest';
import { AgentTeamBootstrapper } from '../../../../src/agent-team/bootstrap-steps/agent-team-bootstrapper.js';
import { BaseAgentTeamBootstrapStep } from '../../../../src/agent-team/bootstrap-steps/base-agent-team-bootstrap-step.js';
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

vi.mock('../../../../src/agent-team/bootstrap-steps/team-context-initialization-step.js', () => ({
  TeamContextInitializationStep: vi.fn().mockImplementation(function () {})
}));
vi.mock('../../../../src/agent-team/bootstrap-steps/task-notifier-initialization-step.js', () => ({
  TaskNotifierInitializationStep: vi.fn().mockImplementation(function () {})
}));
vi.mock('../../../../src/agent-team/bootstrap-steps/agent-configuration-preparation-step.js', () => ({
  AgentConfigurationPreparationStep: vi.fn().mockImplementation(function () {})
}));
vi.mock('../../../../src/agent-team/bootstrap-steps/coordinator-initialization-step.js', () => ({
  CoordinatorInitializationStep: vi.fn().mockImplementation(function () {})
}));

import { TeamContextInitializationStep } from '../../../../src/agent-team/bootstrap-steps/team-context-initialization-step.js';
import { TaskNotifierInitializationStep } from '../../../../src/agent-team/bootstrap-steps/task-notifier-initialization-step.js';
import { AgentConfigurationPreparationStep } from '../../../../src/agent-team/bootstrap-steps/agent-configuration-preparation-step.js';
import { CoordinatorInitializationStep } from '../../../../src/agent-team/bootstrap-steps/coordinator-initialization-step.js';

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
  state.inputEventQueues = {} as any;
  return new AgentTeamContext('team-1', config, state);
};

class MockStep1 extends BaseAgentTeamBootstrapStep {
  async execute(_context: AgentTeamContext): Promise<boolean> {
    return true;
  }
}

class MockStep2 extends BaseAgentTeamBootstrapStep {
  async execute(_context: AgentTeamContext): Promise<boolean> {
    return true;
  }
}

describe('AgentTeamBootstrapper', () => {
  it('initializes with default steps', () => {
    const bootstrapper = new AgentTeamBootstrapper();

    expect(TeamContextInitializationStep).toHaveBeenCalledTimes(1);
    expect(TaskNotifierInitializationStep).toHaveBeenCalledTimes(1);
    expect(AgentConfigurationPreparationStep).toHaveBeenCalledTimes(1);
    expect(CoordinatorInitializationStep).toHaveBeenCalledTimes(1);
    expect(bootstrapper.bootstrapSteps.length).toBe(4);
  });

  it('initializes with custom steps', () => {
    const step1 = new MockStep1();
    const step2 = new MockStep2();
    const bootstrapper = new AgentTeamBootstrapper([step1, step2]);

    expect(bootstrapper.bootstrapSteps).toEqual([step1, step2]);
    expect(bootstrapper.bootstrapSteps.length).toBe(2);
  });

  it('runs all steps successfully', async () => {
    const step1 = { execute: vi.fn(async () => true) } as any;
    const step2 = { execute: vi.fn(async () => true) } as any;
    const bootstrapper = new AgentTeamBootstrapper([step1, step2]);
    const context = makeContext();

    const success = await bootstrapper.run(context);

    expect(success).toBe(true);
    expect(step1.execute).toHaveBeenCalledWith(context);
    expect(step2.execute).toHaveBeenCalledWith(context);
  });

  it('stops on failed step', async () => {
    const step1 = { execute: vi.fn(async () => false) } as any;
    const step2 = { execute: vi.fn(async () => true) } as any;
    const bootstrapper = new AgentTeamBootstrapper([step1, step2]);
    const context = makeContext();

    const success = await bootstrapper.run(context);

    expect(success).toBe(false);
    expect(step1.execute).toHaveBeenCalled();
    expect(step2.execute).not.toHaveBeenCalled();
  });

  it('fails if queues missing after success', async () => {
    const step1 = { execute: vi.fn(async () => true) } as any;
    const bootstrapper = new AgentTeamBootstrapper([step1]);
    const context = makeContext();
    context.state.inputEventQueues = null;

    const success = await bootstrapper.run(context);

    expect(success).toBe(false);
  });
});
