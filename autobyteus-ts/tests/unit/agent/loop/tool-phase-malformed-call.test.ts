import { describe, expect, it, vi } from 'vitest';
import type { AgentContext } from '../../../../src/agent/context/agent-context.js';
import { AgentTurn } from '../../../../src/agent/agent-turn.js';
import { ToolPhase, buildMalformedToolCallError } from '../../../../src/agent/loop/tool-phase.js';
import { ToolInvocation } from '../../../../src/agent/tool-invocation.js';

describe('ToolPhase malformed-call admission (REQ-011, AC-012)', () => {
  it('rejects a marked invocation before preprocessing, approval and execution', async () => {
    const execute = vi.fn();
    const preprocess = vi.fn(async (invocation: ToolInvocation) => invocation);
    const context = {
      agentId: 'agent',
      autoExecuteTools: false,
      config: { toolInvocationPreprocessors: [{ getName: () => 'spy', getOrder: () => 1, process: preprocess }] },
      getTool: () => ({ execute }),
    } as unknown as AgentContext;
    const invocation = new ToolInvocation('get_weather', {}, 'call_bad', 'turn-1', undefined, {
      argumentsParseError: 'Unexpected end of JSON input',
    });
    const notifier = { notifyAgentDataToolLog: vi.fn() } as any;

    const [result] = await new ToolPhase().run([invocation], context, new AgentTurn('turn-1'), notifier);

    expect(result!.error).toBe(
      'Your tool call was malformed and could not be parsed (Unexpected end of JSON input). Please retry.'
    );
    expect(result!.error).toBe(buildMalformedToolCallError('Unexpected end of JSON input'));
    expect(result!.toolInvocationId).toBe('call_bad');
    expect(result!.isDenied).toBe(false);
    expect(preprocess).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
    expect(notifier.notifyAgentDataToolLog).toHaveBeenCalledWith(expect.objectContaining({ tool_invocation_id: 'call_bad' }));
  });
});
