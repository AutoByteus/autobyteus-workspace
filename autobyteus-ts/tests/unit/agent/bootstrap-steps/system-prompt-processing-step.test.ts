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
