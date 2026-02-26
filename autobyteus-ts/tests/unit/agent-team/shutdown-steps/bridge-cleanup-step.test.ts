import { describe, it, expect, vi } from 'vitest';
import { BridgeCleanupStep } from '../../../../src/agent-team/shutdown-steps/bridge-cleanup-step.js';
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

describe('BridgeCleanupStep', () => {
  it('succeeds with no multiplexer', async () => {
    const context = makeContext();
    context.state.multiplexerRef = null;
    const step = new BridgeCleanupStep();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const success = await step.execute(context);

    expect(success).toBe(true);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('shuts down multiplexer successfully', async () => {
    const context = makeContext();
    const multiplexer = { shutdown: vi.fn(async () => undefined) };
    context.state.multiplexerRef = multiplexer as any;
    const step = new BridgeCleanupStep();

    const success = await step.execute(context);

    expect(success).toBe(true);
    expect(multiplexer.shutdown).toHaveBeenCalledTimes(1);
  });

  it('returns false on shutdown failure', async () => {
    const context = makeContext();
    const multiplexer = { shutdown: vi.fn(async () => { throw new Error('boom'); }) };
    context.state.multiplexerRef = multiplexer as any;
    const step = new BridgeCleanupStep();

    const success = await step.execute(context);

    expect(success).toBe(false);
  });
});
