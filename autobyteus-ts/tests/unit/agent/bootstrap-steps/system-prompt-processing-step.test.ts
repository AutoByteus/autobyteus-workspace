import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SystemPromptProcessingStep } from '../../../../src/agent/bootstrap-steps/system-prompt-processing-step.js';
import { AgentErrorEvent } from '../../../../src/agent/events/agent-events.js';
import { SkillRegistry } from '../../../../src/skills/registry.js';

const tempDirectories: string[] = [];

afterEach(() => {
  new SkillRegistry().clear();
  for (const directory of tempDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe('SystemPromptProcessingStep', () => {
  it('persists the exact configured prompt after handoff and stages the committed raw identity', async () => {
    const order: string[] = [];
    const recordSystemInstructionSupply = vi.fn((content: string, suppliedAt: number) => {
      order.push(`persist:${content}`);
      return {
        created: true,
        trace: {
          id: 'system-raw', ts: suppliedAt, trace_type: 'system_instruction' as const,
          content, source_event: 'SYSTEM_INSTRUCTIONS_SUPPLIED' as const,
        },
      };
    });
    const context = {
      agentId: 'agent-system',
      config: { systemPrompt: ' exact native prompt ', skills: [] },
      state: {
        processedSystemPrompt: null,
        pendingSystemInstructionCapture: null,
        memoryManager: { recordSystemInstructionSupply },
        agentEventInbox: { postLifecycleEvent: vi.fn() },
      },
      llmInstance: {
        config: { systemMessage: null },
        configureSystemPrompt: vi.fn((content: string) => order.push(`handoff:${content}`)),
      },
      toolInstances: {},
    } as any;

    await expect(new SystemPromptProcessingStep().execute(context)).resolves.toBe(true);

    expect(order).toEqual(['handoff: exact native prompt ', 'persist: exact native prompt ']);
    expect(context.state.pendingSystemInstructionCapture).toEqual(expect.objectContaining({
      id: 'system-raw', content: ' exact native prompt ',
    }));
    expect(recordSystemInstructionSupply).toHaveBeenCalledWith(
      ' exact native prompt ',
      expect.any(Number),
    );
  });

  it('rejects placeholder-shaped metadata from a real configured skill before state or LLM mutation', async () => {
    const skillDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'final-prompt-skill-'));
    tempDirectories.push(skillDirectory);
    fs.writeFileSync(
      path.join(skillDirectory, 'SKILL.md'),
      '---\nname: placeholder_skill\ndescription: Valid metadata with {{skill_token}}\n---\nSkill body.\n',
      'utf8'
    );
    new SkillRegistry().registerSkillFromPath(skillDirectory);

    const configureSystemPrompt = vi.fn();
    const postLifecycleEvent = vi.fn(async () => undefined);
    const context = {
      agentId: 'agent-1',
      config: {
        systemPrompt: 'Base prompt',
        skills: ['placeholder_skill'],
      },
      state: {
        processedSystemPrompt: null,
        toolInstances: {},
        agentEventInbox: { postLifecycleEvent },
      },
      llmInstance: {
        config: { systemMessage: 'Fallback prompt' },
        configureSystemPrompt,
      },
      toolInstances: {},
    } as any;

    await expect(new SystemPromptProcessingStep().execute(context)).resolves.toBe(false);
    expect(context.state.processedSystemPrompt).toBeNull();
    expect(configureSystemPrompt).not.toHaveBeenCalled();
    expect(postLifecycleEvent).toHaveBeenCalledOnce();
    expect(postLifecycleEvent.mock.calls[0]?.[0]).toBeInstanceOf(AgentErrorEvent);
  });
});
