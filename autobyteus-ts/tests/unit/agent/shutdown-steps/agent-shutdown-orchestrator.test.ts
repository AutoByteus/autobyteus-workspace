import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AgentShutdownOrchestrator } from '../../../../src/agent/shutdown-steps/agent-shutdown-orchestrator.js';
import { LLMInstanceCleanupStep } from '../../../../src/agent/shutdown-steps/llm-instance-cleanup-step.js';
import { ToolCleanupStep } from '../../../../src/agent/shutdown-steps/tool-cleanup-step.js';
import { McpServerCleanupStep } from '../../../../src/agent/shutdown-steps/mcp-server-cleanup-step.js';
import { BaseShutdownStep } from '../../../../src/agent/shutdown-steps/base-shutdown-step.js';
import { createAgentContext } from './helpers.js';

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AgentShutdownOrchestrator', () => {
  it('initializes with default steps', () => {
    const orchestrator = new AgentShutdownOrchestrator();

    expect(orchestrator.shutdownSteps).toHaveLength(3);
    expect(orchestrator.shutdownSteps[0]).toBeInstanceOf(LLMInstanceCleanupStep);
    expect(orchestrator.shutdownSteps[1]).toBeInstanceOf(ToolCleanupStep);
    expect(orchestrator.shutdownSteps[2]).toBeInstanceOf(McpServerCleanupStep);
  });

  it('accepts custom steps', () => {
    const step1 = { execute: vi.fn().mockResolvedValue(true) } as BaseShutdownStep;
    const step2 = { execute: vi.fn().mockResolvedValue(true) } as BaseShutdownStep;

    const orchestrator = new AgentShutdownOrchestrator([step1, step2]);

    expect(orchestrator.shutdownSteps).toEqual([step1, step2]);
  });

  it('runs all steps when successful', async () => {
    const step1 = { execute: vi.fn().mockResolvedValue(true) } as BaseShutdownStep;
    const step2 = { execute: vi.fn().mockResolvedValue(true) } as BaseShutdownStep;
    const orchestrator = new AgentShutdownOrchestrator([step1, step2]);
    const context = createAgentContext('agent-1');

    const success = await orchestrator.run(context);

    expect(success).toBe(true);
    expect(step1.execute).toHaveBeenCalledOnce();
    expect(step1.execute).toHaveBeenCalledWith(context);
    expect(step2.execute).toHaveBeenCalledOnce();
    expect(step2.execute).toHaveBeenCalledWith(context);
  });

  it('stops when a step fails', async () => {
    const step1 = { execute: vi.fn().mockResolvedValue(false) } as BaseShutdownStep;
    const step2 = { execute: vi.fn().mockResolvedValue(true) } as BaseShutdownStep;
    const orchestrator = new AgentShutdownOrchestrator([step1, step2]);
    const context = createAgentContext('agent-1');

    const success = await orchestrator.run(context);

    expect(success).toBe(false);
    expect(step1.execute).toHaveBeenCalledOnce();
    expect(step2.execute).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledOnce();
  });
});
