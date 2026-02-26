import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LLMInstanceCleanupStep } from '../../../../src/agent/shutdown-steps/llm-instance-cleanup-step.js';
import { createAgentContext } from './helpers.js';

beforeEach(() => {
  vi.spyOn(console, 'debug').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('LLMInstanceCleanupStep', () => {
  it('succeeds with async cleanup', async () => {
    const step = new LLMInstanceCleanupStep();
    const context = createAgentContext();

    const cleanup = vi.fn().mockResolvedValue(undefined);
    context.state.llmInstance = { cleanup } as any;

    const success = await step.execute(context);
    expect(success).toBe(true);
    expect(cleanup).toHaveBeenCalledOnce();
  });

  it('succeeds with sync cleanup', async () => {
    const step = new LLMInstanceCleanupStep();
    const context = createAgentContext();

    const cleanup = vi.fn();
    context.state.llmInstance = { cleanup } as any;

    const success = await step.execute(context);
    expect(success).toBe(true);
    expect(cleanup).toHaveBeenCalledOnce();
  });

  it('succeeds when no cleanup method', async () => {
    const step = new LLMInstanceCleanupStep();
    const context = createAgentContext();
    context.state.llmInstance = {} as any;

    const success = await step.execute(context);
    expect(success).toBe(true);
  });

  it('succeeds when no llm instance', async () => {
    const step = new LLMInstanceCleanupStep();
    const context = createAgentContext();
    context.state.llmInstance = null;

    const success = await step.execute(context);
    expect(success).toBe(true);
  });

  it('fails when cleanup throws', async () => {
    const step = new LLMInstanceCleanupStep();
    const context = createAgentContext();

    const cleanup = vi.fn(() => {
      throw new Error('LLM client connection failed');
    });
    context.state.llmInstance = { cleanup } as any;

    const success = await step.execute(context);
    expect(success).toBe(false);
  });
});
